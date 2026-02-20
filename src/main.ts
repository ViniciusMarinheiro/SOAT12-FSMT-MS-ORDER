require('newrelic');
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigService } from './common/service/env/env-config.service';
import helmet from 'helmet';
import { RabbitMQSetupService } from './providers/rabbitmq/rabbitmq.setup.service';
import { RabbitMQService } from './providers/rabbitmq/rabbitmq.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  app.useLogger(app.get(CustomLogger));

  const logger = new Logger('MAIN');

  app.enableCors({
    origin: '*',

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-time-zone',
    credentials: false,
  });

  const envConfigService = app.get(EnvConfigService);
  const port = envConfigService.get('PORT');
  const rabbitmqUrl = envConfigService.get('RABBITMQ_URL');

  // Configurar RabbitMQ se URL estiver disponível
  if (rabbitmqUrl) {
    try {
      const setup = app.get(RabbitMQSetupService);
      await setup.createExchangesAndQueues(rabbitmqUrl);
      logger.log('RabbitMQ exchanges e filas criadas');
    } catch (error: unknown) {
      logger.warn(
        'RabbitMQ setup falhou, continuando',
        error instanceof Error ? error.message : String(error),
      );
    }
    RabbitMQService.connectMicroservices(app, rabbitmqUrl);
    RabbitMQService.connectDlqMicroservices(app, rabbitmqUrl);
    logger.log('RabbitMQ consumers (principal + DLQ) registrados');
  }

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.setGlobalPrefix(envConfigService.get('DOCUMENTATION_PREFIX'));

  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('P&S Tech - 12SOAT OS Service')
    .setDescription('Microserviço de Ordens de Serviço')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
      },
      'Bearer',
    )
    .build();

  const documentationPrefix = envConfigService.get('DOCUMENTATION_PREFIX');

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(documentationPrefix + '/documentation', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app
    .getHttpAdapter()
    .get(`/${documentationPrefix}/documentation/json`, (req, res) => {
      res.send(document);
    });

  await app.listen(port);

  if (rabbitmqUrl) {
    await app.startAllMicroservices();
  }

  logger.log(`HTTP server started on port ${port}`);
}
bootstrap();
