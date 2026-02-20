import { Injectable, Logger } from '@nestjs/common';
import { MessageHandler } from '../types/message.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';
import { SagaEventsProvider } from '../saga/saga-events.provider';
import { SagaWorkOrderCreatedPayload } from '../saga/saga.types';

@Injectable()
export class SagaWorkOrderCreatedStrategy implements MessageHandler<SagaWorkOrderCreatedPayload> {
  private readonly logger = new Logger(SagaWorkOrderCreatedStrategy.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderStatusLog)
    private readonly statusLogRepo: Repository<WorkOrderStatusLog>,
    private readonly sagaEvents: SagaEventsProvider,
  ) {}

  async handle(rawPayload: any): Promise<void> {
    const payload = this.normalizePayload(rawPayload);
    this.logger.log(
      `Saga work_order.created: gerando orçamento para OS ${payload.workOrderId}`,
    );

    try {
      const workOrder = await this.workOrderRepo.findOne({
        where: { id: payload.workOrderId },
      });
      if (!workOrder) {
        this.logger.warn(`OS ${payload.workOrderId} não encontrada para saga`);
        throw new Error(`WorkOrder ${payload.workOrderId} not found`);
      }

      await this.workOrderRepo.update(payload.workOrderId, {
        status: WorkOrderStatusEnum.DIAGNOSING,
      });
      await this.statusLogRepo.save(
        this.statusLogRepo.create({
          workOrderId: payload.workOrderId,
          status: WorkOrderStatusEnum.DIAGNOSING,
          startedAt: new Date(),
        }),
      );

      await this.sagaEvents.publishWorkOrderBudgetGenerated(
        payload.workOrderId,
        payload.totalAmount,
        payload.sagaId,
      );
      this.logger.log(
        `Saga: OS ${payload.workOrderId} em DIAGNOSING (orçamento gerado)`,
      );
    } catch (error: any) {
      this.logger.error(
        `Saga work_order.created falhou para OS ${payload.workOrderId}`,
        { error: error.message },
      );
      await this.sagaEvents.publishCompensate({
        sagaId: payload.sagaId,
        workOrderId: payload.workOrderId,
        step: payload.step,
        reason: error.message,
        failedStep: payload.step,
      });
      throw error;
    }
  }

  private normalizePayload(raw: any): SagaWorkOrderCreatedPayload {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data?.workOrderId) {
      throw new Error('Payload inválido: workOrderId obrigatório');
    }
    return {
      sagaId: data.sagaId,
      workOrderId: Number(data.workOrderId),
      step: data.step,
      timestamp: data.timestamp,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      protocol: data.protocol,
      totalAmount: Number(data.totalAmount) || 0,
    };
  }
}
