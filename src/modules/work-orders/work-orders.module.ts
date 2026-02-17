import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from './infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from './infrastructure/database/work-order-status-log.entity';
import { WorkOrderService } from './infrastructure/database/work-order-service.entity';
import { WorkOrderPart } from './infrastructure/database/work-order-part.entity';
import { WorkOrdersController } from './infrastructure/web/work-orders.controller';
import { CreateWorkOrderUseCase } from './application/use-cases/create-work-order.use-case';
import { UpdateWorkOrderStatusUseCase } from './application/use-cases/update-work-order-status.use-case';
import { GetWorkOrderStatusUseCase } from './application/use-cases/get-work-order-status.use-case';
import { GetWorkOrderHistoryUseCase } from './application/use-cases/get-work-order-history.use-case';
import { RabbitMQModule } from '@/providers/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkOrder,
      WorkOrderStatusLog,
      WorkOrderService,
      WorkOrderPart,
    ]),
    RabbitMQModule,
  ],
  controllers: [WorkOrdersController],
  providers: [
    CreateWorkOrderUseCase,
    UpdateWorkOrderStatusUseCase,
    GetWorkOrderStatusUseCase,
    GetWorkOrderHistoryUseCase,
  ],
})
export class WorkOrdersModule {}
