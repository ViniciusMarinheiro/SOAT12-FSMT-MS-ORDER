import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Scope,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { BaseApiHttpService } from './base-api-http.service';

export interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  documentNumber?: string;
  phone?: string;
}

@Injectable({ scope: Scope.REQUEST })
export class CustomerHttpService extends BaseApiHttpService {
  private readonly logger = new Logger(CustomerHttpService.name);

  async getCustomerById(customerId: number): Promise<CustomerResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<CustomerResponse>(
          `${this.API_BASE_URL}/customers/${customerId}`,
          { headers: this.headers, timeout: 10_000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar cliente ${customerId}`, {
        error: error?.response?.data || error.message,
      });
      if (error?.response?.status === 404) {
        throw new NotFoundException(
          `Cliente com ID ${customerId} não encontrado`,
        );
      }
      throw new BadRequestException(
        `Erro ao buscar cliente na API: ${error?.response?.data?.message || error.message}`,
      );
    }
  }
}
