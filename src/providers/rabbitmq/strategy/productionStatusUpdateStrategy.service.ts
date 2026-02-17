import { Injectable, Logger } from '@nestjs/common';
import { MessageHandler } from '../types/message.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';

export interface ProductionStatusUpdatePayload {
  workOrderId: number;
  status: WorkOrderStatusEnum;
  startedAt?: Date;
  finishedAt?: Date;
}

@Injectable()
export class ProductionStatusUpdateStrategy implements MessageHandler<ProductionStatusUpdatePayload> {
  protected readonly logger = new Logger(ProductionStatusUpdateStrategy.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderStatusLog)
    private readonly statusLogRepo: Repository<WorkOrderStatusLog>,
  ) {}

  async handle(payload: ProductionStatusUpdatePayload): Promise<void> {
    this.logger.log(
      `Atualizando status da OS ${payload.workOrderId} para ${payload.status}`,
    );

    try {
      const workOrder = await this.workOrderRepo.findOne({
        where: { id: payload.workOrderId },
      });

      if (!workOrder) {
        this.logger.warn(`OS ${payload.workOrderId} não encontrada`);
        throw new Error(`OS ${payload.workOrderId} não encontrada`);
      }

      // Atualizar status da OS
      workOrder.status = payload.status;
      if (payload.startedAt) {
        workOrder.startedAt = payload.startedAt;
      }
      if (payload.finishedAt) {
        workOrder.finishedAt = payload.finishedAt;
      }

      await this.workOrderRepo.save(workOrder);

      // Criar log de status
      await this.statusLogRepo.save({
        workOrderId: payload.workOrderId,
        status: payload.status,
        startedAt: payload.startedAt || new Date(),
      });

      this.logger.log(
        `Status da OS ${payload.workOrderId} atualizado com sucesso para ${payload.status}`,
      );
    } catch (error: any) {
      this.logger.error('Erro ao atualizar status da OS', {
        error: error.message,
        workOrderId: payload.workOrderId,
        trace: error.stack,
      });
      throw error;
    }
  }
}
