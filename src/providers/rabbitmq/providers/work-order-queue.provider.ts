import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { rabbitMQConfig } from '../rabbitmq.config';

export interface SendToProductionPayload {
  workOrderId: number;
  customerId: number;
  vehicleId: number;
  protocol: string;
  totalAmount: number;
}

@Injectable()
export class WorkOrderQueueProvider {
  private readonly logger = new Logger(WorkOrderQueueProvider.name);

  constructor(
    @Inject(rabbitMQConfig.sendToProduction.routingKey)
    private readonly client: ClientProxy,
  ) {}

  async sendToProduction(payload: SendToProductionPayload): Promise<void> {
    this.logger.log(`Enviando OS ${payload.workOrderId} para fila de produção`);

    const config = rabbitMQConfig.sendToProduction;
    await firstValueFrom(this.client.emit(config.routingKey, payload));

    this.logger.log(
      `OS ${payload.workOrderId} adicionada à fila de produção com sucesso`,
    );
  }
}
