import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../../infrastructure/database/work-order-status-log.entity';

@Injectable()
export class GetWorkOrderHistoryUseCase {
  private readonly logger = new Logger(GetWorkOrderHistoryUseCase.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderStatusLog)
    private readonly statusLogRepo: Repository<WorkOrderStatusLog>,
  ) {}

  async execute(id: number) {
    this.logger.log('Buscando histórico de status da ordem de serviço', { id });
    const workOrder = await this.workOrderRepo.findOne({ where: { id } });
    if (!workOrder) {
      this.logger.warn(
        'Ordem de serviço não encontrada ao buscar histórico de status',
        { id },
      );
      throw new NotFoundException(`WorkOrder ${id} not found`);
    }
    const logs = await this.statusLogRepo.find({
      where: { workOrderId: id },
      order: { startedAt: 'ASC' },
    });
    this.logger.log(
      'Histórico de status da ordem de serviço obtido com sucesso',
      { id, count: logs.length },
    );
    return logs;
  }
}
