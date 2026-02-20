import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { rabbitMQConfig } from '../rabbitmq.config';
import {
  SagaWorkOrderStep,
  SagaWorkOrderCreatedPayload,
  SagaWorkOrderBudgetGeneratedPayload,
  SagaWorkOrderAwaitingApprovalPayload,
} from './saga.types';
import { randomUUID } from 'crypto';

@Injectable()
export class SagaEventsProvider {
  private readonly logger = new Logger(SagaEventsProvider.name);

  constructor(
    @Inject(rabbitMQConfig.sagaPublish.routingKey)
    private readonly client: ClientProxy,
  ) {}

  private sagaId(): string {
    return randomUUID();
  }

  async publishWorkOrderCreated(payload: {
    workOrderId: number;
    customerId: number;
    vehicleId: number;
    protocol: string;
    totalAmount: number;
  }): Promise<void> {
    const sagaId = this.sagaId();
    const body: SagaWorkOrderCreatedPayload = {
      sagaId,
      workOrderId: payload.workOrderId,
      step: SagaWorkOrderStep.CREATE,
      timestamp: new Date().toISOString(),
      customerId: payload.customerId,
      vehicleId: payload.vehicleId,
      protocol: payload.protocol,
      totalAmount: payload.totalAmount,
    };
    await firstValueFrom(
      this.client.emit('work_order.created', body),
    );
    this.logger.log(`Saga work_order.created emitido para OS ${payload.workOrderId}`);
  }

  async publishWorkOrderBudgetGenerated(workOrderId: number, totalAmount: number, sagaId: string): Promise<void> {
    const body: SagaWorkOrderBudgetGeneratedPayload = {
      sagaId,
      workOrderId,
      step: SagaWorkOrderStep.BUDGET_GENERATED,
      timestamp: new Date().toISOString(),
      totalAmount,
    };
    await firstValueFrom(
      this.client.emit('work_order.budget_generated', body),
    );
    this.logger.log(`Saga work_order.budget_generated emitido para OS ${workOrderId}`);
  }

  async publishWorkOrderAwaitingApproval(workOrderId: number, sagaId: string): Promise<void> {
    const body: SagaWorkOrderAwaitingApprovalPayload = {
      sagaId,
      workOrderId,
      step: SagaWorkOrderStep.AWAITING_APPROVAL,
      timestamp: new Date().toISOString(),
    };
    await firstValueFrom(
      this.client.emit('work_order.awaiting_approval', body),
    );
    this.logger.log(`Saga work_order.awaiting_approval emitido para OS ${workOrderId}`);
  }

  async publishCompensate(payload: {
    sagaId: string;
    workOrderId: number;
    step: SagaWorkOrderStep;
    reason?: string;
    failedStep?: SagaWorkOrderStep;
  }): Promise<void> {
    const body = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    await firstValueFrom(
      this.client.emit('compensate', body),
    );
    this.logger.warn(`Saga compensate emitido para step=${payload.step} OS ${payload.workOrderId}`, {
      reason: payload.reason,
    });
  }
}
