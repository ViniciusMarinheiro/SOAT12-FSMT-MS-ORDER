import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, defaultIfEmpty } from 'rxjs';
import { rabbitMQConfig } from '../rabbitmq.config';

const EMIT_TIMEOUT_MS = 8_000;

export interface PaymentRequestPayload {
  workOrderId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  currencyId?: string;
  payerEmail?: string;
}

@Injectable()
export class PaymentRequestQueueProvider {
  private readonly logger = new Logger(PaymentRequestQueueProvider.name);

  constructor(
    @Inject(rabbitMQConfig.paymentRequested.routingKey)
    private readonly client: ClientProxy,
  ) {}

  async requestPayment(payload: PaymentRequestPayload): Promise<void> {
    this.logger.log(
      `Enviando requisição de pagamento para OS ${payload.workOrderId}`,
    );
    const config = rabbitMQConfig.paymentRequested;
    await firstValueFrom(
      this.client.emit(config.routingKey, payload).pipe(
        defaultIfEmpty(undefined),
        timeout(EMIT_TIMEOUT_MS),
      ),
    ).catch((err) => {
      this.logger.error(
        `Falha ao publicar na fila de pagamento (timeout ou erro) - OS ${payload.workOrderId}`,
        { error: err?.message },
      );
      throw err;
    });
    this.logger.log(
      `Requisição de pagamento para OS ${payload.workOrderId} enviada à fila`,
    );
  }
}
