import { INestApplication, Injectable } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MicroserviceOptions } from '@nestjs/microservices';
import { MessageConfig } from './types/message.interface';
import { EnvConfigService } from '@/common/service/env/env-config.service';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { getRabbitMQConfigs } from './rabbitmq.config';

@Injectable()
export class RabbitMQService {
  constructor(private readonly configService: EnvConfigService) {}

  createClientOptions(config: MessageConfig) {
    const url = this.configService.get('RABBITMQ_URL');
    if (!url) {
      throw new Error('RABBITMQ_URL não definido');
    }
    const options: any = {
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: config.queue,
        noAck: false,
        prefetchCount: 1,
        persistent: true,
        consumerTag: `${config.queue}_consumer`,
        queueOptions: {
          durable: true,
          arguments: {
            ...((config as any).exchangeArguments?.['x-cache-size'] != null && {
              'x-cache-size': (config as any).exchangeArguments['x-cache-size'],
            }),
            'x-dead-letter-exchange': config.deadLetterExchange || 'DLX',
            'x-dead-letter-routing-key':
              config.deadLetterRoutingKey || config.queue,
          },
        },
      },
    };
    if (config.exchange) options.options.exchange = config.exchange;
    if (config.routingKey) options.options.routingKey = config.routingKey;
    return options;
  }

  static registerClient(config: MessageConfig) {
    return ClientsModule.registerAsync([
      {
        name: config.routingKey,
        imports: [EnvConfigModule],
        inject: [EnvConfigService],
        useFactory: (configService: EnvConfigService): any => {
          const service = new RabbitMQService(configService);
          return service.createClientOptions(config);
        },
      },
    ]);
  }

  static connectMicroservices(
    app: INestApplication,
    rabbitmqUrl: string,
  ): void {
    getRabbitMQConfigs().forEach((config) => {
      const options: MicroserviceOptions = {
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: config.queue,
          consumerTag: `${config.queue}_consumer`,
          routingKey: config.routingKey,
          noAck: false,
          prefetchCount: 1,
          persistent: true,
          noAssert: true,
          queueOptions: {
            durable: true,
            arguments: {
              ...(config.exchangeArguments?.['x-cache-size'] != null && {
                'x-cache-size': config.exchangeArguments['x-cache-size'],
              }),
              'x-dead-letter-exchange': config.deadLetterExchange || 'DLX',
              'x-dead-letter-routing-key':
                config.deadLetterRoutingKey || config.queue,
            },
          },
        },
      };
      app.connectMicroservice<MicroserviceOptions>(options);
    });
  }

  static connectDlqMicroservices(
    app: INestApplication,
    rabbitmqUrl: string,
  ): void {
    getRabbitMQConfigs().forEach((config) => {
      const dlqQueue = `${config.queue}.dlq`;
      const options: MicroserviceOptions = {
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqUrl],
          queue: dlqQueue,
          consumerTag: `${dlqQueue}_consumer`,
          noAck: false,
          prefetchCount: 1,
          noAssert: true,
          queueOptions: { durable: true },
        },
      };
      app.connectMicroservice<MicroserviceOptions>(options);
    });
  }
}
