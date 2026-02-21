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
import { StockValidationService } from '@/modules/references/application/services/stock-validation.service';
import { ApiHttpService } from '@/providers/http/api-http.service';
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { SagaWorkOrderStep } from '@/providers/rabbitmq/saga/saga.types';
import * as crypto from 'crypto';

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
    private readonly stockValidationService: StockValidationService,
    private readonly apiHttpService: ApiHttpService,
    private readonly sagaEvents: SagaEventsProvider,
  ) {}

  async execute(dto: CreateWorkOrderDto) {
    this.logger.log('Criando ordem de serviço', dto);

    await this.stockValidationService.validateWorkOrderItems(dto);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const protocol = await this.generateProtocol();
      const hashView = this.generateHashView(dto);

      // Buscar preços dos services e parts para calcular valores
      let servicesTotal = 0;
      let partsTotal = 0;

      // Calcular total de services
      if (dto.services && dto.services.length > 0) {
        const serviceIds = dto.services.map((s) => s.serviceId);
        const serviceResponses =
          await this.apiHttpService.getServicesByIds(serviceIds);

        servicesTotal = dto.services.reduce((sum, service) => {
          const serviceResponse = serviceResponses.find(
            (s) => s.id === service.serviceId,
          );
          return (
            sum +
            (serviceResponse ? serviceResponse.price * service.quantity : 0)
          );
        }, 0);
      }

      // Calcular total de parts
      if (dto.parts && dto.parts.length > 0) {
        const partIds = dto.parts.map((p) => p.partId);
        const partResponses = await this.apiHttpService.getPartsByIds(partIds);

        partsTotal = dto.parts.reduce((sum, part) => {
          const partResponse = partResponses.find((p) => p.id === part.partId);
          return (
            sum + (partResponse ? partResponse.unitPrice * part.quantity : 0)
          );
        }, 0);
      }

      const totalAmount = servicesTotal + partsTotal;

      const workOrderEntity = this.workOrderRepo.create({
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        userId: dto.userId,
        hashView,
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

      // Salvar services com preços calculados
      if (dto.services && dto.services.length > 0) {
        const serviceIds = dto.services.map((s) => s.serviceId);
        const serviceResponses =
          await this.apiHttpService.getServicesByIds(serviceIds);

        const workOrderServices = dto.services.map((service) => {
          const serviceResponse = serviceResponses.find(
            (s) => s.id === service.serviceId,
          );
          const totalPrice = serviceResponse
            ? serviceResponse.price * service.quantity
            : 0;

          return this.workOrderServiceRepo.create({
            workOrderId: savedWorkOrder.id,
            serviceId: service.serviceId,
            quantity: service.quantity,
            totalPrice,
          });
        });
        await queryRunner.manager.save(WorkOrderService, workOrderServices);
      }

      // Salvar parts com preços calculados
      if (dto.parts && dto.parts.length > 0) {
        const partIds = dto.parts.map((p) => p.partId);
        const partResponses = await this.apiHttpService.getPartsByIds(partIds);

        const workOrderParts = dto.parts.map((part) => {
          const partResponse = partResponses.find((p) => p.id === part.partId);
          const totalPrice = partResponse
            ? partResponse.unitPrice * part.quantity
            : 0;

          return this.workOrderPartRepo.create({
            workOrderId: savedWorkOrder.id,
            partId: part.partId,
            quantity: part.quantity,
            totalPrice,
          });
        });
        await queryRunner.manager.save(WorkOrderPart, workOrderParts);
      }

      await queryRunner.commitTransaction();

      try {
        await this.sagaEvents.publishWorkOrderCreated({
          workOrderId: savedWorkOrder.id,
          customerId: savedWorkOrder.customerId,
          vehicleId: savedWorkOrder.vehicleId,
          protocol: savedWorkOrder.protocol,
          totalAmount: savedWorkOrder.totalAmount,
        });
      } catch (sagaError: unknown) {
        const msg =
          sagaError instanceof Error ? sagaError.message : String(sagaError);
        this.logger.error(
          'Falha ao publicar evento saga work_order.created; disparando compensação',
          {
            workOrderId: savedWorkOrder.id,
            error: msg,
          },
        );
        await this.sagaEvents.publishCompensate({
          sagaId: crypto.randomUUID(),
          workOrderId: savedWorkOrder.id,
          step: SagaWorkOrderStep.CREATE,
          reason: msg,
        });
        throw sagaError;
      }

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

  private generateHashView(dto: CreateWorkOrderDto): string {
    const data = JSON.stringify({
      customerId: dto.customerId,
      vehicleId: dto.vehicleId,
      userId: dto.userId,
      timestamp: new Date().toISOString(),
    });
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }
}
