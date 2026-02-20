import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { rabbitMQConfig } from '../rabbitmq.config';

export interface SendEmailPayload {
  recipient: string;
  subject: string;
  body?: string;
  name?: string;
  type?: string;
  code?: string;
}

@Injectable()
export class SendEmailQueueProvider {
  private readonly logger = new Logger(SendEmailQueueProvider.name);

  constructor(
    @Inject(rabbitMQConfig.sendEmail.routingKey)
    private readonly client: ClientProxy,
  ) {}

  async send(payload: SendEmailPayload): Promise<void> {
    this.logger.log(`Enviando email para fila: ${payload.recipient}`);
    const config = rabbitMQConfig.sendEmail;
    await firstValueFrom(this.client.emit(config.routingKey, payload));
    this.logger.log(`Email adicionado à fila: ${payload.recipient}`);
  }
}
