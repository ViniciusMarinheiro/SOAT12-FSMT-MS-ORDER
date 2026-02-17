import { Module } from '@nestjs/common';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { RabbitMQController } from './rabbitmq.controller';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQSetupService } from './rabbitmq.setup.service';
import { HandleMessageStrategyFactory } from './strategy/handleMessageStrategy.service';
import { ProductionStatusUpdateStrategy } from './strategy/productionStatusUpdateStrategy.service';
import { getRabbitMQConfigs } from './rabbitmq.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderQueueProvider } from './providers/work-order-queue.provider';

@Module({
  imports: [
    EnvConfigModule,
    TypeOrmModule.forFeature([WorkOrder, WorkOrderStatusLog]),
    ...getRabbitMQConfigs().map((config) =>
      RabbitMQService.registerClient(config),
    ),
  ],
  controllers: [RabbitMQController],
  providers: [
    RabbitMQService,
    RabbitMQSetupService,
    ProductionStatusUpdateStrategy,
    HandleMessageStrategyFactory,
    WorkOrderQueueProvider,
  ],
  exports: [RabbitMQSetupService, RabbitMQService, WorkOrderQueueProvider],
})
export class RabbitMQModule {}
