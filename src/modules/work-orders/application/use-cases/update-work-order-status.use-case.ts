import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkOrder } from '../../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../../infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '../../domain/enums/work-order-status.enum';
import { WorkOrderQueueProvider } from '@/providers/rabbitmq/providers/work-order-queue.provider';
import { PaymentRequestQueueProvider } from '@/providers/rabbitmq/providers/payment-request-queue.provider';
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { SagaWorkOrderStep } from '@/providers/rabbitmq/saga/saga.types';
import { CustomerHttpService } from '@/providers/http/customer-http.service';
import * as crypto from 'crypto';

export interface UpdateWorkOrderStatusOptions {
  paymentTitle?: string;
}

@Injectable()
export class UpdateWorkOrderStatusUseCase {
  private readonly logger = new Logger(UpdateWorkOrderStatusUseCase.name);

  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderStatusLog)
    private readonly statusLogRepo: Repository<WorkOrderStatusLog>,
    private readonly workOrderQueueProvider: WorkOrderQueueProvider,
    private readonly paymentRequestQueueProvider: PaymentRequestQueueProvider,
    private readonly sagaEvents: SagaEventsProvider,
    private readonly customerHttpService: CustomerHttpService,
  ) {}

  async execute(
    id: number,
    status: WorkOrderStatusEnum,
    options?: UpdateWorkOrderStatusOptions,
  ) {
    this.logger.log('Atualizando status da ordem de serviço', { id, status });
    const workOrder = await this.workOrderRepo.findOne({ where: { id } });
    if (!workOrder) {
      this.logger.warn('Ordem de serviço não encontrada para atualização', {
        id,
      });
      throw new NotFoundException(`WorkOrder ${id} not found`);
    }

    await this.workOrderRepo.update(id, { status });
    await this.statusLogRepo.save(
      this.statusLogRepo.create({
        workOrderId: id,
        status,
        startedAt: new Date(),
      }),
    );

    if (status === WorkOrderStatusEnum.FINISHED) {
      await this.workOrderRepo.update(id, { finishedAt: new Date() as any });
    }

    const updated = await this.workOrderRepo.findOne({ where: { id } });

    if (status === WorkOrderStatusEnum.AWAITING_APPROVAL && updated) {
      try {
        const customer = await this.customerHttpService.getCustomerById(
          updated.customerId,
        );
        console.log('customer', customer);
        const payerEmail = customer?.email;
        if (payerEmail) {
          await this.paymentRequestQueueProvider.requestPayment({
            workOrderId: updated.id,
            title:
              options?.paymentTitle ?? `Ordem de serviço ${updated.protocol}`,
            quantity: 1,
            unitPrice: updated.totalAmount,
            currencyId: 'BRL',
            payerEmail,
          });
        } else {
          this.logger.warn(
            'Cliente da OS sem email: link de pagamento não será gerado',
            { workOrderId: id, customerId: updated.customerId },
          );
        }
      } catch (error: any) {
        this.logger.error('Erro ao enviar requisição de pagamento', {
          error: error.message,
          workOrderId: id,
        });
        throw error;
      }
    }

    if (status === WorkOrderStatusEnum.IN_PROGRESS && updated) {
      try {
        await this.workOrderQueueProvider.sendToProduction({
          workOrderId: updated.id,
          customerId: updated.customerId,
          vehicleId: updated.vehicleId,
          protocol: updated.protocol,
          totalAmount: updated.totalAmount,
        });
      } catch (error: any) {
        this.logger.error(
          'Erro ao enviar OS para produção; disparando compensação saga',
          {
            error: error.message,
            workOrderId: id,
          },
        );
        await this.sagaEvents.publishCompensate({
          sagaId: crypto.randomUUID(),
          workOrderId: id,
          step: SagaWorkOrderStep.SEND_TO_PRODUCTION,
          reason: error?.message,
          failedStep: SagaWorkOrderStep.SEND_TO_PRODUCTION,
        });
        throw error;
      }
    }

    this.logger.log('Status da ordem de serviço atualizado com sucesso', {
      id,
      status,
    });
    return updated;
  }
}
