import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../../infrastructure/database/work-order.entity';

@Injectable()
export class GetWorkOrderStatusUseCase {
  private readonly logger = new Logger(GetWorkOrderStatusUseCase.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
  ) {}

  async execute(id: number) {
    this.logger.log('Buscando status da ordem de serviço', { id });
    const workOrder = await this.workOrderRepo.findOne({ where: { id } });
    if (!workOrder) {
      this.logger.warn('Ordem de serviço não encontrada ao buscar status', {
        id,
      });
      throw new NotFoundException(`WorkOrder ${id} not found`);
    }
    const result = {
      id: workOrder.id,
      status: workOrder.status,
      protocol: workOrder.protocol,
      paymentInitPoint: workOrder.paymentInitPoint ?? undefined,
      paymentPreferenceId: workOrder.paymentPreferenceId ?? undefined,
    };
    this.logger.log('Status da ordem de serviço obtido com sucesso', result);
    return result;
  }
}
