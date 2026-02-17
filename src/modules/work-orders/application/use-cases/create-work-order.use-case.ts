import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { WorkOrder } from '../../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../../infrastructure/database/work-order-status-log.entity';
import { WorkOrderService } from '../../infrastructure/database/work-order-service.entity';
import { WorkOrderPart } from '../../infrastructure/database/work-order-part.entity';
import { WorkOrderStatusEnum } from '../../domain/enums/work-order-status.enum';
import { CreateWorkOrderDto } from '../dtos/create-work-order.dto';

@Injectable()
export class CreateWorkOrderUseCase {
  private readonly logger = new Logger(CreateWorkOrderUseCase.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderStatusLog)
    private readonly statusLogRepo: Repository<WorkOrderStatusLog>,
    @InjectRepository(WorkOrderService)
    private readonly workOrderServiceRepo: Repository<WorkOrderService>,
    @InjectRepository(WorkOrderPart)
    private readonly workOrderPartRepo: Repository<WorkOrderPart>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: CreateWorkOrderDto) {
    this.logger.log('Criando ordem de serviço', dto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const protocol = await this.generateProtocol();

      // Calcular total amount se não fornecido
      let totalAmount = dto.totalAmount ?? 0;
      if (!dto.totalAmount) {
        const servicesTotal = (dto.services || []).reduce(
          (sum, s) => sum + s.totalPrice,
          0,
        );
        const partsTotal = (dto.parts || []).reduce(
          (sum, p) => sum + p.totalPrice,
          0,
        );
        totalAmount = servicesTotal + partsTotal;
      }

      const workOrderEntity = this.workOrderRepo.create({
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        userId: dto.userId,
        hashView: dto.hashView,
        protocol,
        status: WorkOrderStatusEnum.RECEIVED,
        totalAmount,
      });

      const savedWorkOrder = await queryRunner.manager.save(
        WorkOrder,
        workOrderEntity,
      );

      // Criar log de status inicial
      await queryRunner.manager.save(WorkOrderStatusLog, {
        workOrderId: savedWorkOrder.id,
        status: savedWorkOrder.status,
        startedAt: new Date(),
      });

      // Salvar services se fornecidos
      if (dto.services && dto.services.length > 0) {
        const workOrderServices = dto.services.map((service) =>
          this.workOrderServiceRepo.create({
            workOrderId: savedWorkOrder.id,
            serviceId: service.serviceId,
            quantity: service.quantity,
            totalPrice: service.totalPrice,
          }),
        );
        await queryRunner.manager.save(WorkOrderService, workOrderServices);
      }

      // Salvar parts se fornecidos
      if (dto.parts && dto.parts.length > 0) {
        const workOrderParts = dto.parts.map((part) =>
          this.workOrderPartRepo.create({
            workOrderId: savedWorkOrder.id,
            partId: part.partId,
            quantity: part.quantity,
            totalPrice: part.totalPrice,
          }),
        );
        await queryRunner.manager.save(WorkOrderPart, workOrderParts);
      }

      await queryRunner.commitTransaction();

      this.logger.log('Ordem de serviço criada com sucesso', {
        id: savedWorkOrder.id,
        protocol: savedWorkOrder.protocol,
        status: savedWorkOrder.status,
      });

      return savedWorkOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro ao criar ordem de serviço', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateProtocol(): Promise<string> {
    const last = await this.workOrderRepo.find({
      order: { id: 'DESC' },
      take: 1,
    });
    const nextId = last[0] ? last[0].id + 1 : 1;
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${datePart}-${String(nextId).padStart(6, '0')}`;
  }
}
