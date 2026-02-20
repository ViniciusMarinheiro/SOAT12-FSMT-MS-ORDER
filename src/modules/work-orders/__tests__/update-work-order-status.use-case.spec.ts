import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateWorkOrderStatusUseCase } from '../application/use-cases/update-work-order-status.use-case';
import { WorkOrder } from '../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '../domain/enums/work-order-status.enum';
import { WorkOrderQueueProvider } from '@/providers/rabbitmq/providers/work-order-queue.provider';
import { PaymentRequestQueueProvider } from '@/providers/rabbitmq/providers/payment-request-queue.provider';
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { CustomerHttpService } from '@/providers/http/customer-http.service';

describe('UpdateWorkOrderStatusUseCase', () => {
  let useCase: UpdateWorkOrderStatusUseCase;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let statusLogRepo: jest.Mocked<Repository<WorkOrderStatusLog>>;
  let workOrderQueueProvider: jest.Mocked<WorkOrderQueueProvider>;
  let paymentRequestQueueProvider: jest.Mocked<PaymentRequestQueueProvider>;
  let sagaEventsProvider: jest.Mocked<SagaEventsProvider>;
  let customerHttpService: jest.Mocked<CustomerHttpService>;

  const mockWorkOrder = {
    id: 1,
    customerId: 10,
    vehicleId: 20,
    protocol: '20260217-000001',
    totalAmount: 500,
    status: WorkOrderStatusEnum.RECEIVED,
  } as WorkOrder;

  beforeEach(async () => {
    const mockWorkOrderRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockStatusLogRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };
    const mockQueueProvider = {
      sendToProduction: jest.fn().mockResolvedValue(undefined),
    };
    const mockSagaEventsProvider = {
      publishCompensate: jest.fn().mockResolvedValue(undefined),
    };
    const mockPaymentRequestQueueProvider = {
      requestPayment: jest.fn().mockResolvedValue(undefined),
    };
    const mockCustomerHttpService = {
      getCustomerById: jest.fn().mockResolvedValue({
        id: 10,
        name: 'Customer Test',
        email: 'customer@test.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateWorkOrderStatusUseCase,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
        { provide: WorkOrderQueueProvider, useValue: mockQueueProvider },
        {
          provide: PaymentRequestQueueProvider,
          useValue: mockPaymentRequestQueueProvider,
        },
        { provide: SagaEventsProvider, useValue: mockSagaEventsProvider },
        { provide: CustomerHttpService, useValue: mockCustomerHttpService },
      ],
    }).compile();

    useCase = module.get(UpdateWorkOrderStatusUseCase);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    statusLogRepo = module.get(getRepositoryToken(WorkOrderStatusLog));
    workOrderQueueProvider = module.get(WorkOrderQueueProvider);
    paymentRequestQueueProvider = module.get(PaymentRequestQueueProvider);
    sagaEventsProvider = module.get(SagaEventsProvider);
    customerHttpService = module.get(CustomerHttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should throw NotFoundException when work order does not exist', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute(999, WorkOrderStatusEnum.IN_PROGRESS),
    ).rejects.toThrow(NotFoundException);
    await expect(
      useCase.execute(999, WorkOrderStatusEnum.IN_PROGRESS),
    ).rejects.toThrow('WorkOrder 999 not found');

    expect(workOrderRepo.update).not.toHaveBeenCalled();
  });

  it('should update status and create status log', async () => {
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce({
        ...mockWorkOrder,
        status: WorkOrderStatusEnum.DIAGNOSING,
      });

    const result = await useCase.execute(1, WorkOrderStatusEnum.DIAGNOSING);

    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      status: WorkOrderStatusEnum.DIAGNOSING,
    });
    expect(statusLogRepo.save).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(WorkOrderStatusEnum.DIAGNOSING);
  });

  it('should set finishedAt when status is FINISHED', async () => {
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce({
        ...mockWorkOrder,
        status: WorkOrderStatusEnum.FINISHED,
      });

    await useCase.execute(1, WorkOrderStatusEnum.FINISHED);

    expect(workOrderRepo.update).toHaveBeenCalledTimes(2);
    expect(workOrderRepo.update).toHaveBeenNthCalledWith(1, 1, {
      status: WorkOrderStatusEnum.FINISHED,
    });
    expect(workOrderRepo.update).toHaveBeenNthCalledWith(
      2,
      1,
      expect.any(Object),
    );
  });

  it('should call sendToProduction when status is IN_PROGRESS', async () => {
    const updated = {
      ...mockWorkOrder,
      status: WorkOrderStatusEnum.IN_PROGRESS,
    };
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce(updated);

    await useCase.execute(1, WorkOrderStatusEnum.IN_PROGRESS);

    expect(workOrderQueueProvider.sendToProduction).toHaveBeenCalledWith({
      workOrderId: 1,
      customerId: 10,
      vehicleId: 20,
      protocol: '20260217-000001',
      totalAmount: 500,
    });
  });

  it('should not call sendToProduction when status is not IN_PROGRESS', async () => {
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce({
        ...mockWorkOrder,
        status: WorkOrderStatusEnum.FINISHED,
      });

    await useCase.execute(1, WorkOrderStatusEnum.FINISHED);

    expect(workOrderQueueProvider.sendToProduction).not.toHaveBeenCalled();
  });

  it('should call publishCompensate and rethrow when sendToProduction fails', async () => {
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce({
        ...mockWorkOrder,
        status: WorkOrderStatusEnum.IN_PROGRESS,
      });
    workOrderQueueProvider.sendToProduction.mockRejectedValue(
      new Error('Queue error'),
    );

    await expect(
      useCase.execute(1, WorkOrderStatusEnum.IN_PROGRESS),
    ).rejects.toThrow('Queue error');

    expect(sagaEventsProvider.publishCompensate).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: 1,
        reason: 'Queue error',
      }),
    );
  });

  it('should call getCustomerById and requestPayment when status is AWAITING_APPROVAL and customer has email', async () => {
    const updated = {
      ...mockWorkOrder,
      status: WorkOrderStatusEnum.AWAITING_APPROVAL,
    };
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce(updated);
    customerHttpService.getCustomerById.mockResolvedValue({
      id: 10,
      name: 'Customer',
      email: 'payer@test.com',
    });

    await useCase.execute(1, WorkOrderStatusEnum.AWAITING_APPROVAL, {
      paymentTitle: 'Título customizado',
    });

    expect(customerHttpService.getCustomerById).toHaveBeenCalledWith(10);
    expect(paymentRequestQueueProvider.requestPayment).toHaveBeenCalledWith({
      workOrderId: 1,
      title: 'Título customizado',
      quantity: 1,
      unitPrice: 500,
      currencyId: 'BRL',
      payerEmail: 'payer@test.com',
    });
  });

  it('should not call requestPayment when status is AWAITING_APPROVAL and customer has no email', async () => {
    const updated = {
      ...mockWorkOrder,
      status: WorkOrderStatusEnum.AWAITING_APPROVAL,
    };
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce(updated);
    customerHttpService.getCustomerById.mockResolvedValue({
      id: 10,
      name: 'Customer',
      email: '',
    });

    await useCase.execute(1, WorkOrderStatusEnum.AWAITING_APPROVAL);

    expect(customerHttpService.getCustomerById).toHaveBeenCalledWith(10);
    expect(paymentRequestQueueProvider.requestPayment).not.toHaveBeenCalled();
  });

  it('should rethrow when getCustomerById fails on AWAITING_APPROVAL', async () => {
    const updated = {
      ...mockWorkOrder,
      status: WorkOrderStatusEnum.AWAITING_APPROVAL,
    };
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce(updated);
    customerHttpService.getCustomerById.mockRejectedValue(
      new Error('API unavailable'),
    );

    await expect(
      useCase.execute(1, WorkOrderStatusEnum.AWAITING_APPROVAL),
    ).rejects.toThrow('API unavailable');

    expect(paymentRequestQueueProvider.requestPayment).not.toHaveBeenCalled();
  });
});
