import { Injectable, Logger } from '@nestjs/common';
import { MessageHandler } from '../types/message.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';
import { SagaEventsProvider } from '../saga/saga-events.provider';
import { SagaWorkOrderBudgetGeneratedPayload } from '../saga/saga.types';

@Injectable()
export class SagaWorkOrderBudgetGeneratedStrategy implements MessageHandler<SagaWorkOrderBudgetGeneratedPayload> {
  private readonly logger = new Logger(
    SagaWorkOrderBudgetGeneratedStrategy.name,
  );

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
      `Saga work_order.budget_generated: aguardando aprovação OS ${payload.workOrderId}`,
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
        status: WorkOrderStatusEnum.AWAITING_APPROVAL,
      });
      await this.statusLogRepo.save(
        this.statusLogRepo.create({
          workOrderId: payload.workOrderId,
          status: WorkOrderStatusEnum.AWAITING_APPROVAL,
          startedAt: new Date(),
        }),
      );

      await this.sagaEvents.publishWorkOrderAwaitingApproval(
        payload.workOrderId,
        payload.sagaId,
      );
      this.logger.log(`Saga: OS ${payload.workOrderId} em AWAITING_APPROVAL`);
    } catch (error: any) {
      this.logger.error(
        `Saga work_order.budget_generated falhou para OS ${payload.workOrderId}`,
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

  private normalizePayload(raw: any): SagaWorkOrderBudgetGeneratedPayload {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data?.workOrderId) {
      throw new Error('Payload inválido: workOrderId obrigatório');
    }
    return {
      sagaId: data.sagaId,
      workOrderId: Number(data.workOrderId),
      step: data.step,
      timestamp: data.timestamp,
      totalAmount: Number(data.totalAmount) || 0,
    };
  }
}
