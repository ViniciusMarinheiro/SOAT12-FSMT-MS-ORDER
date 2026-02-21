/**
 * Saga steps for Work Order lifecycle.
 * Order: create → budget_generated → awaiting_approval → send_to_production
 */
export enum SagaWorkOrderStep {
  CREATE = 'create',
  BUDGET_GENERATED = 'budget_generated',
  AWAITING_APPROVAL = 'awaiting_approval',
  SEND_TO_PRODUCTION = 'send_to_production',
}

export interface SagaContext {
  sagaId: string;
  workOrderId: number;
  step: SagaWorkOrderStep;
  timestamp: string;
}

export interface SagaWorkOrderCreatedPayload extends SagaContext {
  customerId: number;
  vehicleId: number;
  protocol: string;
  totalAmount: number;
}

export interface SagaWorkOrderBudgetGeneratedPayload extends SagaContext {
  totalAmount: number;
  /** Email do cliente para envio do link de pagamento (opcional) */
  customerEmail?: string;
}

export type SagaWorkOrderAwaitingApprovalPayload = SagaContext;

export interface SagaCompensatePayload extends SagaContext {
  reason?: string;
  failedStep?: SagaWorkOrderStep;
}
