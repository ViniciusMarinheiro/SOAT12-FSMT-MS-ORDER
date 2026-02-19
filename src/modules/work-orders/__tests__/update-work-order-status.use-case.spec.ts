import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateWorkOrderStatusUseCase } from '../application/use-cases/update-work-order-status.use-case';
import { WorkOrder } from '../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '../domain/enums/work-order-status.enum';
import { WorkOrderQueueProvider } from '@/providers/rabbitmq/providers/work-order-queue.provider';

describe('UpdateWorkOrderStatusUseCase', () => {
  let useCase: UpdateWorkOrderStatusUseCase;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let statusLogRepo: jest.Mocked<Repository<WorkOrderStatusLog>>;
  let workOrderQueueProvider: jest.Mocked<WorkOrderQueueProvider>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateWorkOrderStatusUseCase,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
        { provide: WorkOrderQueueProvider, useValue: mockQueueProvider },
      ],
    }).compile();

    useCase = module.get(UpdateWorkOrderStatusUseCase);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    statusLogRepo = module.get(getRepositoryToken(WorkOrderStatusLog));
    workOrderQueueProvider = module.get(WorkOrderQueueProvider);
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

  it('should not throw when sendToProduction fails (only logs)', async () => {
    workOrderRepo.findOne
      .mockResolvedValueOnce(mockWorkOrder)
      .mockResolvedValueOnce({
        ...mockWorkOrder,
        status: WorkOrderStatusEnum.IN_PROGRESS,
      });
    workOrderQueueProvider.sendToProduction.mockRejectedValue(
      new Error('Queue error'),
    );

    const result = await useCase.execute(1, WorkOrderStatusEnum.IN_PROGRESS);

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(result!.status).toBe(WorkOrderStatusEnum.IN_PROGRESS);
  });
});
