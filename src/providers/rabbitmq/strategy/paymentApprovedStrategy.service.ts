import { Injectable, Logger } from '@nestjs/common';
import { MessageHandler } from '../types/message.interface';
import { UpdateWorkOrderStatusUseCase } from '@/modules/work-orders/application/use-cases/update-work-order-status.use-case';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';

export interface PaymentApprovedPayload {
  workOrderId: number;
  paymentId?: string;
  status?: string;
}

@Injectable()
export class PaymentApprovedStrategy implements MessageHandler<PaymentApprovedPayload> {
  private readonly logger = new Logger(PaymentApprovedStrategy.name);

  constructor(
    private readonly updateWorkOrderStatusUseCase: UpdateWorkOrderStatusUseCase,
  ) {}

  async handle(rawPayload: unknown): Promise<void> {
    const payload = this.normalizePayload(rawPayload);
    this.logger.log(
      `Pagamento aprovado recebido: workOrderId=${payload.workOrderId}, atualizando para IN_PROGRESS`,
    );

    await this.updateWorkOrderStatusUseCase.execute(
      payload.workOrderId,
      WorkOrderStatusEnum.IN_PROGRESS,
    );
    this.logger.log(`OS ${payload.workOrderId} atualizada para IN_PROGRESS`);
  }

  private normalizePayload(raw: unknown): PaymentApprovedPayload {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data?.workOrderId) {
      throw new Error('Payload inválido: workOrderId obrigatório');
    }
    return {
      workOrderId: Number(data.workOrderId),
      paymentId: data.paymentId,
      status: data.status,
    };
  }
}
