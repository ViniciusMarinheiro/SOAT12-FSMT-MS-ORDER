import { Injectable, Logger } from '@nestjs/common';
import { MessageHandler } from '../types/message.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';
import { SagaCompensatePayload, SagaWorkOrderStep } from '../saga/saga.types';

@Injectable()
export class SagaCompensateOrderStrategy implements MessageHandler<SagaCompensatePayload> {
  private readonly logger = new Logger(SagaCompensateOrderStrategy.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderStatusLog)
    private readonly statusLogRepo: Repository<WorkOrderStatusLog>,
  ) {}

  async handle(rawPayload: any): Promise<void> {
    const payload = this.normalizePayload(rawPayload);
    this.logger.log(
      `Saga compensate: OS ${payload.workOrderId} step=${payload.step} reason=${payload.reason ?? 'N/A'}`,
    );

    const workOrder = await this.workOrderRepo.findOne({
      where: { id: payload.workOrderId },
    });
    if (!workOrder) {
      this.logger.warn(
        `OS ${payload.workOrderId} não encontrada para compensação`,
      );
      return;
    }

    const targetStatus = this.getCompensationStatus(payload.step);
    await this.workOrderRepo.update(payload.workOrderId, {
      status: targetStatus,
    });
    await this.statusLogRepo.save(
      this.statusLogRepo.create({
        workOrderId: payload.workOrderId,
        status: targetStatus,
        startedAt: new Date(),
      }),
    );
    this.logger.log(
      `Saga compensate: OS ${payload.workOrderId} revertida para ${targetStatus}`,
    );
  }

  private getCompensationStatus(step: SagaWorkOrderStep): WorkOrderStatusEnum {
    switch (step) {
      case SagaWorkOrderStep.CREATE:
        return WorkOrderStatusEnum.REJECTED;
      case SagaWorkOrderStep.BUDGET_GENERATED:
        return WorkOrderStatusEnum.RECEIVED;
      case SagaWorkOrderStep.AWAITING_APPROVAL:
        return WorkOrderStatusEnum.DIAGNOSING;
      case SagaWorkOrderStep.SEND_TO_PRODUCTION:
        return WorkOrderStatusEnum.AWAITING_APPROVAL;
      default:
        return WorkOrderStatusEnum.REJECTED;
    }
  }

  private normalizePayload(raw: any): SagaCompensatePayload {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data?.workOrderId || !data?.step) {
      throw new Error('Payload inválido: workOrderId e step obrigatórios');
    }
    return {
      sagaId: data.sagaId,
      workOrderId: Number(data.workOrderId),
      step: data.step as SagaWorkOrderStep,
      timestamp: data.timestamp,
      reason: data.reason,
      failedStep: data.failedStep as SagaWorkOrderStep | undefined,
    };
  }
}
