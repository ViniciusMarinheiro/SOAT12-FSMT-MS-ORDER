import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { GlobalJwtAuthGuard, RolesGuard } from './common/guards';
import { APP_GUARD } from '@nestjs/core';
import { AppService } from './app.service';
import { EnvConfigService } from './common/service/env/env-config.service';
import { CustomLogger } from './common/log/custom.logger';
import { EnvConfigModule } from './common/service/env/env-config.module';
import { DatabaseModule } from './common/service/database/database.module';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import * as newrelic from 'newrelic';
import { RabbitMQModule } from './providers/rabbitmq/rabbitmq.module';
import { AuthModule } from './modules/auth/auth.module';

const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = process.env.NODE_ENV !== 'production' && !isTest;

const getNewRelicMetadata = () => {
  try {
    return newrelic.getLinkingMetadata();
  } catch (error) {
    return {};
  }
};

@Module({
  imports: [
    EnvConfigModule,
    DatabaseModule,
    RabbitMQModule,
    AuthModule,
    WorkOrdersModule,
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: 'trace',
        mixin: () => {
          return getNewRelicMetadata();
        },
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500) {
            return 'error';
          } else if (res.statusCode >= 400) {
            return 'warn';
          }
          return 'info';
        },
        ...(isDevelopment && {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }),
      },
    }),
    CustomLogger,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EnvConfigService,
    {
      provide: APP_GUARD,
      useClass: GlobalJwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [EnvConfigService, CustomLogger],
})
export class AppModule {}
