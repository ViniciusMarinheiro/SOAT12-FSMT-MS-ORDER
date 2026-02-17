import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQConfig, getRabbitMQConfigs } from './rabbitmq.config';
import { EnvConfigService } from '@/common/service/env/env-config.service';

@Injectable()
export class RabbitMQSetupService {
  private readonly logger = new Logger(RabbitMQSetupService.name);

  constructor(private readonly envConfigService: EnvConfigService) {}

  async createExchangesAndQueues(rabbitmqUrl: string): Promise<void> {
    let connectionModel: amqp.ChannelModel | null = null;
    let channel: amqp.Channel | null = null;

    try {
      connectionModel = await amqp.connect(rabbitmqUrl);
      if (!connectionModel) {
        throw new Error('Falha ao conectar ao RabbitMQ');
      }

      channel = await connectionModel.createChannel();
      if (!channel) {
        throw new Error('Falha ao criar channel do RabbitMQ');
      }

      const activeChannel = channel;

      for (const config of getRabbitMQConfigs()) {
        if (config.exchange) {
          await this.createExchangeAndQueue(activeChannel, config);
        } else {
          await this.createQueue(activeChannel, config);
        }
      }
    } finally {
      if (channel) {
        try {
          await channel.close();
        } catch (error) {
          this.logger.warn('Erro ao fechar channel', error);
        }
      }
      if (connectionModel) {
        try {
          await connectionModel.close();
        } catch (error) {
          this.logger.warn('Erro ao fechar connection', error);
        }
      }
    }
  }

  private async createExchangeAndQueue(
    channel: amqp.Channel,
    config: RabbitMQConfig,
  ): Promise<void> {
    if (!config.exchange) {
      throw new Error('Exchange é obrigatório');
    }

    const dlqExchange = config.deadLetterExchange ?? `${config.exchange}.dlq`;
    const dlqQueue = `${config.queue}.dlq`;
    const dlqRoutingKey = config.deadLetterRoutingKey ?? 'status-update.dlq';

    // Criar DLQ Exchange e Queue
    await channel.assertExchange(dlqExchange, 'direct', {
      durable: true,
      autoDelete: true,
    });

    await channel.assertQueue(dlqQueue, { durable: true });
    await channel.bindQueue(dlqQueue, dlqExchange, dlqRoutingKey);

    // Criar Exchange principal
    await channel.assertExchange(
      config.exchange,
      config.exchangeType || 'topic',
      {
        durable: true,
        autoDelete: true,
        ...(config.exchangeArguments && {
          arguments: config.exchangeArguments,
        }),
      },
    );

    // Criar Queue principal
    await channel.assertQueue(config.queue, {
      durable: true,
      arguments: {
        ...(config.exchangeArguments?.['x-cache-size'] != null && {
          'x-cache-size': config.exchangeArguments['x-cache-size'],
        }),
        'x-dead-letter-exchange': config.deadLetterExchange || 'DLX',
        'x-dead-letter-routing-key':
          config.deadLetterRoutingKey || config.queue,
      },
    });

    await channel.bindQueue(config.queue, config.exchange, config.routingKey);

    this.logger.log(
      `Exchange e fila criadas: ${config.exchange} e ${config.queue}`,
    );
  }

  private async createQueue(
    channel: amqp.Channel,
    config: RabbitMQConfig,
  ): Promise<void> {
    await channel.assertQueue(config.queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': config.deadLetterExchange || 'DLX',
        'x-dead-letter-routing-key':
          config.deadLetterRoutingKey || config.queue,
      },
    });

    this.logger.log(`Fila criada: ${config.queue}`);
  }
}
