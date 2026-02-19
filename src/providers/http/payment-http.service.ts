import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EnvConfigService } from '@/common/service/env/env-config.service';

export interface CreatePaymentRequest {
  title: string;
  quantity: number;
  unitPrice: number;
  workOrderId?: number;
  payerEmail?: string;
  currencyId?: string;
}

export interface CreatePaymentResponse {
  init_point: string;
  id?: string;
  [key: string]: unknown;
}

@Injectable()
export class PaymentHttpService {
  private readonly logger = new Logger(PaymentHttpService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly envConfigService: EnvConfigService,
  ) {}

  private getBaseUrl(): string {
    const url =
      this.envConfigService.get('PAYMENT_SERVICE_URL') ||
      'http://localhost:3000';
    return url.replace(/\/$/, '');
  }

  async createPayment(
    request: CreatePaymentRequest,
  ): Promise<CreatePaymentResponse> {
    const baseUrl = this.getBaseUrl();
    const endpoint = `${baseUrl}/api/payments`;
    try {
      const response = await firstValueFrom(
        this.httpService.post<CreatePaymentResponse>(
          endpoint,
          {
            title: request.title,
            quantity: request.quantity,
            unitPrice: request.unitPrice,
            workOrderId: request.workOrderId,
            payerEmail: request.payerEmail,
            currencyId: request.currencyId ?? 'BRL',
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
          },
        ),
      );
      const data = response.data;
      if (!data?.init_point) {
        this.logger.warn('Resposta do MS-PAYMENT sem init_point', { data });
        throw new Error('Resposta do serviço de pagamento inválida');
      }
      return data;
    } catch (error: any) {
      this.logger.error('Erro ao criar pagamento no MS-PAYMENT', {
        endpoint,
        error: error?.response?.data || error?.message,
      });
      throw error;
    }
  }
}
