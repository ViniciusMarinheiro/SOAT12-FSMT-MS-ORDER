import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Scope,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { BaseApiHttpService } from './base-api-http.service';

export interface PartResponse {
  id: number;
  name: string;
  description: string;
  stock: number;
  unitPrice: number;
}

export interface ServiceResponse {
  id: number;
  name: string;
  description: string;
  price: number;
}

@Injectable({ scope: Scope.REQUEST })
export class ApiHttpService extends BaseApiHttpService {
  private readonly logger = new Logger(ApiHttpService.name);

  /**
   * Busca uma peça por ID
   */
  async getPartById(partId: number): Promise<PartResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PartResponse>(
          `${this.API_BASE_URL}/parts/${partId}`,
          {
            headers: this.headers,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar peça ${partId}`, {
        error: error?.response?.data || error.message,
      });

      if (error?.response?.status === 404) {
        throw new NotFoundException(`Peça com ID ${partId} não encontrada`);
      }

      throw new BadRequestException(
        `Erro ao buscar peça na API externa: ${error?.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Busca múltiplas peças por IDs
   */
  async getPartsByIds(partIds: number[]): Promise<PartResponse[]> {
    if (partIds.length === 0) {
      return [];
    }

    try {
      // Buscar todas as peças de uma vez usando query params
      const idsParam = partIds.join(',');
      const response = await firstValueFrom(
        this.httpService.get<PartResponse[]>(
          `${this.API_BASE_URL}/parts?ids=${idsParam}`,
          {
            headers: this.headers,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar peças`, {
        error: error?.response?.data || error.message,
        partIds,
      });

      // Se não tiver endpoint batch, buscar individualmente
      return Promise.all(partIds.map((id) => this.getPartById(id)));
    }
  }

  /**
   * Busca um serviço por ID
   */
  async getServiceById(serviceId: number): Promise<ServiceResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ServiceResponse>(
          `${this.API_BASE_URL}/services/${serviceId}`,
          {
            headers: this.headers,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar serviço ${serviceId}`, {
        error: error?.response?.data || error.message,
      });

      if (error?.response?.status === 404) {
        throw new NotFoundException(
          `Serviço com ID ${serviceId} não encontrado`,
        );
      }

      throw new BadRequestException(
        `Erro ao buscar serviço: ${error?.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Busca múltiplos serviços por IDs
   */
  async getServicesByIds(serviceIds: number[]): Promise<ServiceResponse[]> {
    if (serviceIds.length === 0) {
      return [];
    }

    try {
      // Buscar todos os serviços de uma vez usando query params
      const idsParam = serviceIds.join(',');
      const response = await firstValueFrom(
        this.httpService.get<ServiceResponse[]>(
          `${this.API_BASE_URL}/services?ids=${idsParam}`,
          {
            headers: this.headers,
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar serviços`, {
        error: error?.response?.data || error.message,
        serviceIds,
      });

      // Se não tiver endpoint batch, buscar individualmente
      return Promise.all(serviceIds.map((id) => this.getServiceById(id)));
    }
  }
}
