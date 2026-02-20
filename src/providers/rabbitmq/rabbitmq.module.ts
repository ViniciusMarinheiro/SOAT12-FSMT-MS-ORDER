import { Module, forwardRef } from '@nestjs/common';
import { EnvConfigModule } from '@/common/service/env/env-config.module';
import { RabbitMQController } from './rabbitmq.controller';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQSetupService } from './rabbitmq.setup.service';
import { HandleMessageStrategyFactory } from './strategy/handleMessageStrategy.service';
import { ProductionStatusUpdateStrategy } from './strategy/productionStatusUpdateStrategy.service';
import { SagaWorkOrderCreatedStrategy } from './strategy/sagaWorkOrderCreatedStrategy.service';
import { SagaWorkOrderBudgetGeneratedStrategy } from './strategy/sagaWorkOrderBudgetGeneratedStrategy.service';
import { SagaCompensateOrderStrategy } from './strategy/sagaCompensateOrderStrategy.service';
import { PaymentApprovedStrategy } from './strategy/paymentApprovedStrategy.service';
import { getRabbitMQConfigs } from './rabbitmq.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderQueueProvider } from './providers/work-order-queue.provider';
import { SendEmailQueueProvider } from './providers/send-email-queue.provider';
import { PaymentRequestQueueProvider } from './providers/payment-request-queue.provider';
import { SagaEventsProvider } from './saga/saga-events.provider';
import { PaymentProcessedStrategy } from './strategy/paymentProcessedStrategy.service';
import { WorkOrdersModule } from '@/modules/work-orders/work-orders.module';
import { PaymentHttpModule } from '@/providers/http/payment-http.module';

@Module({
  imports: [
    EnvConfigModule,
    TypeOrmModule.forFeature([WorkOrder, WorkOrderStatusLog]),
    forwardRef(() => WorkOrdersModule),
    PaymentHttpModule,
    ...getRabbitMQConfigs().map((config) =>
      RabbitMQService.registerClient(config),
    ),
  ],
  controllers: [RabbitMQController],
  providers: [
    RabbitMQService,
    RabbitMQSetupService,
    ProductionStatusUpdateStrategy,
    SagaWorkOrderCreatedStrategy,
    SagaWorkOrderBudgetGeneratedStrategy,
    SagaCompensateOrderStrategy,
    PaymentApprovedStrategy,
    PaymentProcessedStrategy,
    HandleMessageStrategyFactory,
    WorkOrderQueueProvider,
    SendEmailQueueProvider,
    PaymentRequestQueueProvider,
    SagaEventsProvider,
  ],
  exports: [
    RabbitMQSetupService,
    RabbitMQService,
    WorkOrderQueueProvider,
    SendEmailQueueProvider,
    PaymentRequestQueueProvider,
    SagaEventsProvider,
  ],
})
export class RabbitMQModule {}
