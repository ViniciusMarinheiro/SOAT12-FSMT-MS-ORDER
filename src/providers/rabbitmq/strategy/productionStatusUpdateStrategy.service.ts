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

  async handle(rawPayload: any): Promise<void> {
    const payload = this.normalizePayload(rawPayload);
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

      const statusValue =
        typeof payload.status === 'string'
          ? (payload.status as WorkOrderStatusEnum)
          : payload.status;
      workOrder.status = statusValue;
      if (payload.startedAt) {
        workOrder.startedAt =
          payload.startedAt instanceof Date
            ? payload.startedAt
            : new Date(payload.startedAt as string);
      }
      if (payload.finishedAt) {
        workOrder.finishedAt =
          payload.finishedAt instanceof Date
            ? payload.finishedAt
            : new Date(payload.finishedAt as string);
      }

      await this.workOrderRepo.save(workOrder);

      const startedAtForLog = payload.startedAt
        ? payload.startedAt instanceof Date
          ? payload.startedAt
          : new Date(payload.startedAt as string)
        : new Date();
      await this.statusLogRepo.save({
        workOrderId: payload.workOrderId,
        status: statusValue,
        startedAt: startedAtForLog,
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

  private normalizePayload(raw: any): ProductionStatusUpdatePayload {
    let data = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('Payload inválido: JSON inválido');
      }
    }
    if (!data || typeof data !== 'object') {
      throw new Error(
        'Payload inválido: esperado objeto com workOrderId e status',
      );
    }
    const workOrderId = Number(data.workOrderId);
    if (Number.isNaN(workOrderId) || workOrderId <= 0) {
      throw new Error(
        `Payload inválido: workOrderId deve ser número positivo, recebido: ${data.workOrderId}`,
      );
    }
    const status = data.status ?? data.statusCode;
    const validStatuses = Object.values(WorkOrderStatusEnum);
    if (!status || !validStatuses.includes(status as WorkOrderStatusEnum)) {
      throw new Error(
        `Payload inválido: status deve ser um de [${validStatuses.join(', ')}], recebido: ${status}`,
      );
    }
    return {
      workOrderId,
      status: status as WorkOrderStatusEnum,
      startedAt: data.startedAt,
      finishedAt: data.finishedAt,
    };
  }
}
