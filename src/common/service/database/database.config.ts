import { WorkOrder } from '../../../modules/work-orders/infrastructure/database/work-order.entity';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvConfigService } from '../env/env-config.service';
import { WorkOrderStatusLog } from '../../../modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderService } from '../../../modules/work-orders/infrastructure/database/work-order-service.entity';
import { WorkOrderPart } from '../../../modules/work-orders/infrastructure/database/work-order-part.entity';

export const databaseConfig = (
  envConfigService: EnvConfigService,
): TypeOrmModuleOptions => {
  const nodeEnv = process.env.NODE_ENV || envConfigService.get('NODE_ENV');

  if (nodeEnv === 'test') {
    return {
      type: 'sqlite',
      database: ':memory:',
      entities: [WorkOrder],
      synchronize: true,
      dropSchema: true,
      migrationsRun: false,
      logging: false,
    };
  }

  return {
    type: 'postgres',
    host: envConfigService.get('DB_HOST'),
    port: parseInt(envConfigService.get('DB_PORT')),
    username: envConfigService.get('DB_USERNAME'),
    password: envConfigService.get('DB_PASSWORD'),
    database: envConfigService.get('DB_DATABASE'),
    schema: envConfigService.get('DB_SCHEMA'),
    entities: [WorkOrder, WorkOrderStatusLog, WorkOrderService, WorkOrderPart],
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true,
    synchronize: false,
    logging: envConfigService.get('NODE_ENV') !== 'production',
    extra: {
      options: `--search_path=${envConfigService.get('DB_SCHEMA')}`,
    },
  };
};
