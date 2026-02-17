import { Controller, Logger } from '@nestjs/common';
import { Ctx, Payload, RmqContext, EventPattern } from '@nestjs/microservices';
import { HandleMessageStrategyFactory } from './strategy/handleMessageStrategy.service';
import { getRabbitMQConfigs } from './rabbitmq.config';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { InvalidPayloadError } from '@/common/exceptions/invalidPayloadError';

@Controller()
export class RabbitMQController {
  private readonly logger = new Logger(RabbitMQController.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly dlqRepublishToMain: boolean;

  constructor(
    private readonly strategyFactory: HandleMessageStrategyFactory,
    private readonly envConfigService: EnvConfigService,
  ) {
    this.maxRetries =
      this.envConfigService.get('RABBITMQ_CONSUMER_MAX_RETRIES') || 3;
    this.retryDelayMs =
      this.envConfigService.get('RABBITMQ_CONSUMER_RETRY_DELAY_MS') || 1000;
    this.dlqRepublishToMain =
      this.envConfigService.get('DLQ_REPUBLISH_TO_MAIN') || false;
  }

  @EventPattern('status-update')
  async handleMessage(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    const routingKey = originalMessage.fields.routingKey;
    const consumerTag = originalMessage.fields.consumerTag;
    const queue = consumerTag.replace(/_consumer$/, '');

    if (queue.endsWith('.dlq')) {
      await this.handleDlqMessage(data, channel, originalMessage, queue);
      return;
    }

    this.logger.debug(
      `Processando mensagem - Queue: ${queue}, Routing Key: ${routingKey}`,
    );

    const strategy = this.strategyFactory.getStrategy(queue, routingKey);
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await strategy.handle(data);
        try {
          channel.ack(originalMessage);
        } catch (ackError: any) {
          this.logger.warn('Erro ao fazer ACK da mensagem', {
            error: ackError.message,
            routingKey,
          });
        }
        return;
      } catch (error) {
        if (error instanceof InvalidPayloadError) {
          this.logger.debug('Payload inválido - enviando para DLQ sem retry', {
            queue,
            routingKey,
          });
          try {
            channel.nack(originalMessage, false, false);
          } catch (nackError: any) {
            this.logger.debug('Erro ao fazer NACK da mensagem', {
              error: nackError.message,
            });
          }
          return;
        }
        lastError = error;
        this.logger.debug(
          `Tentativa ${attempt}/${this.maxRetries} falhou - ${(error as Error)?.message}`,
          { queue, routingKey, attempt },
        );
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelayMs);
        }
      }
    }

    this.logger.error(
      `Mensagem enviada para DLQ após ${this.maxRetries} tentativas`,
      { queue, routingKey, error: (lastError as Error)?.message },
    );
    try {
      channel.nack(originalMessage, false, false);
    } catch (nackError: any) {
      this.logger.warn('Erro ao fazer NACK da mensagem', {
        error: nackError.message,
      });
    }
  }

  private async handleDlqMessage(
    data: any,
    channel: any,
    originalMessage: any,
    dlqQueue: string,
  ): Promise<void> {
    const mainQueue = dlqQueue.replace(/\.dlq$/, '');
    const config = getRabbitMQConfigs().find((c) => c.queue === mainQueue);

    this.logger.debug(`Mensagem recebida na DLQ: ${dlqQueue}`, {
      payload: data,
      mainQueue,
    });

    if (this.dlqRepublishToMain && config?.exchange && config?.routingKey) {
      try {
        channel.publish(
          config.exchange,
          config.routingKey,
          Buffer.from(JSON.stringify(data)),
          { persistent: true },
        );
        this.logger.log(`Mensagem republicada na fila principal: ${mainQueue}`);
      } catch (err: any) {
        this.logger.error('Falha ao republicar mensagem da DLQ', {
          error: err?.message,
          mainQueue,
        });
      }
    }

    try {
      channel.ack(originalMessage);
    } catch (ackError: any) {
      this.logger.warn('Erro ao fazer ACK da mensagem na DLQ', {
        error: ackError.message,
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
