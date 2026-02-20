import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageHandler } from '../types/message.interface';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { SendEmailQueueProvider } from '../providers/send-email-queue.provider';

export interface PaymentProcessedPayload {
  workOrderId: number;
  paymentId: string;
  status: string;
  init_point?: string;
  payerEmail?: string;
  error?: string;
}

@Injectable()
export class PaymentProcessedStrategy implements MessageHandler<PaymentProcessedPayload> {
  private readonly logger = new Logger(PaymentProcessedStrategy.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    private readonly sendEmailQueue: SendEmailQueueProvider,
  ) {}

  async handle(rawPayload: unknown): Promise<void> {
    const payload = this.normalizePayload(rawPayload);
    this.logger.log(
      `Pagamento processado recebido: workOrderId=${payload.workOrderId}, status=${payload.status}`,
    );

    const workOrder = await this.workOrderRepo.findOne({
      where: { id: payload.workOrderId },
    });
    if (!workOrder) {
      this.logger.warn(`WorkOrder ${payload.workOrderId} não encontrada`);
      return;
    }

    if (payload.status === 'created' && payload.init_point) {
      await this.workOrderRepo.update(payload.workOrderId, {
        paymentInitPoint: payload.init_point,
        paymentPreferenceId: payload.paymentId,
      });
      this.logger.log(
        `OS ${payload.workOrderId} atualizada com link de pagamento`,
      );

      if (payload.payerEmail) {
        await this.sendEmailQueue.send({
          recipient: payload.payerEmail,
          subject: `Link de pagamento - Ordem de serviço ${workOrder.protocol}`,
          body: `Acesse o link abaixo para realizar o pagamento da ordem de serviço:\n\n${payload.init_point}`,
          name: payload.payerEmail,
          type: 'payment_link',
        });
        this.logger.log(
          `Email com link de pagamento enfileirado para ${payload.payerEmail}`,
        );
      } else {
        this.logger.warn(
          `Email NÃO enviado: payerEmail ausente no payload payment.processed (workOrderId=${payload.workOrderId}). ` +
            'Verifique se o MS-PAYMENT está enviando payerEmail e se o ORDER enviou payerEmail na requisição payment.v1.requested.',
        );
      }
    } else if (payload.status === 'error') {
      this.logger.warn(
        `Falha ao criar pagamento para OS ${payload.workOrderId}: ${payload.error}`,
      );
    }
  }

  private normalizePayload(raw: unknown): PaymentProcessedPayload {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // NestJS RMQ às vezes encapsula em { data: payload }
    const payload =
      data?.data && typeof data.data === 'object' ? data.data : data;
    if (!payload?.workOrderId) {
      throw new Error('Payload inválido: workOrderId obrigatório');
    }
    return {
      workOrderId: Number(payload.workOrderId),
      paymentId: payload.paymentId ?? '',
      status: payload.status ?? '',
      init_point: payload.init_point,
      payerEmail: payload.payerEmail,
      error: payload.error,
    };
  }
}
