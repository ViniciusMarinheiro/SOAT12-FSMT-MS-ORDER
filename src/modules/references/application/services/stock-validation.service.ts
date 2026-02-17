import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateWorkOrderDto } from '@/modules/work-orders/application/dtos/create-work-order.dto';
import { ApiHttpService } from '@/providers/http/api-http.service';

@Injectable()
export class StockValidationService {
  private readonly logger = new Logger(StockValidationService.name);

  constructor(private readonly apiHttpService: ApiHttpService) {}

  /**
   * Valida estoque de parts e services antes de criar a OS
   */
  async validateWorkOrderItems(dto: CreateWorkOrderDto): Promise<void> {
    // Validar parts se fornecidos
    if (dto.parts && dto.parts.length > 0) {
      await this.validateParts(dto.parts);
    }

    // Validar services se fornecidos
    if (dto.services && dto.services.length > 0) {
      await this.validateServices(dto.services);
    }
  }

  /**
   * Valida estoque das parts via API
   */
  private async validateParts(
    parts: Array<{ partId: number; quantity: number }>,
  ): Promise<void> {
    const partIds = parts.map((p) => p.partId);
    const partResponses = await this.apiHttpService.getPartsByIds(partIds);
    const foundIds = partResponses.map((p) => p.id);
    const missingIds = partIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Peças não encontradas: ${missingIds.join(', ')}`,
      );
    }

    for (const part of parts) {
      const partResponse = partResponses.find((p) => p.id === part.partId);

      if (!partResponse) {
        throw new NotFoundException(
          `Peça com ID ${part.partId} não encontrada`,
        );
      }

      // Validar estoque
      if (partResponse.stock < part.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para peça ${partResponse.name}. Disponível: ${partResponse.stock}, Solicitado: ${part.quantity}`,
        );
      }
    }
  }

  /**
   * Valida existência dos services via API
   */
  private async validateServices(
    services: Array<{
      serviceId: number;
      quantity: number;
    }>,
  ): Promise<void> {
    const serviceIds = services.map((s) => s.serviceId);
    const serviceResponses =
      await this.apiHttpService.getServicesByIds(serviceIds);
    const foundIds = serviceResponses.map((s) => s.id);
    const missingIds = serviceIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Serviços não encontrados: ${missingIds.join(', ')}`,
      );
    }

    for (const service of services) {
      const serviceResponse = serviceResponses.find(
        (s) => s.id === service.serviceId,
      );

      if (!serviceResponse) {
        throw new NotFoundException(
          `Serviço com ID ${service.serviceId} não encontrado`,
        );
      }
    }
  }
}
