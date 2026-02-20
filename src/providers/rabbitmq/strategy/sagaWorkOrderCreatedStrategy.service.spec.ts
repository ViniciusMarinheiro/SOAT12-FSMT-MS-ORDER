import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SagaWorkOrderCreatedStrategy } from './sagaWorkOrderCreatedStrategy.service';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { SagaEventsProvider } from '../saga/saga-events.provider';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';

describe('SagaWorkOrderCreatedStrategy', () => {
  let strategy: SagaWorkOrderCreatedStrategy;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let statusLogRepo: jest.Mocked<Repository<WorkOrderStatusLog>>;
  let sagaEvents: jest.Mocked<SagaEventsProvider>;

  beforeEach(async () => {
    const mockWorkOrderRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockStatusLogRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };
    const mockSagaEvents = {
      publishWorkOrderBudgetGenerated: jest.fn().mockResolvedValue(undefined),
      publishCompensate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SagaWorkOrderCreatedStrategy,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
        { provide: SagaEventsProvider, useValue: mockSagaEvents },
      ],
    }).compile();

    strategy = module.get(SagaWorkOrderCreatedStrategy);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    statusLogRepo = module.get(getRepositoryToken(WorkOrderStatusLog));
    sagaEvents = module.get(SagaEventsProvider) as any;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw when payload is invalid (missing workOrderId)', async () => {
    await expect(strategy.handle({})).rejects.toThrow(
      'Payload inválido: workOrderId obrigatório',
    );
  });

  it('should throw when work order not found', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);
    await expect(
      strategy.handle({
        workOrderId: 999,
        sagaId: 's1',
        totalAmount: 100,
      }),
    ).rejects.toThrow('WorkOrder 999 not found');
    expect(sagaEvents.publishWorkOrderBudgetGenerated).not.toHaveBeenCalled();
  });

  it('should update status to DIAGNOSING and call publishWorkOrderBudgetGenerated', async () => {
    workOrderRepo.findOne.mockResolvedValue({
      id: 1,
      totalAmount: 200,
    } as WorkOrder);
    const payload = {
      workOrderId: 1,
      sagaId: 's1',
      totalAmount: 200,
      customerId: 10,
      vehicleId: 20,
      protocol: 'P-001',
    };
    await strategy.handle(payload);

    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      status: WorkOrderStatusEnum.DIAGNOSING,
    });
    expect(sagaEvents.publishWorkOrderBudgetGenerated).toHaveBeenCalledWith(
      1,
      200,
      's1',
    );
  });

  it('should call publishCompensate and rethrow when publishWorkOrderBudgetGenerated fails', async () => {
    workOrderRepo.findOne.mockResolvedValue({
      id: 1,
      totalAmount: 100,
    } as WorkOrder);
    sagaEvents.publishWorkOrderBudgetGenerated.mockRejectedValue(
      new Error('Emit failed'),
    );

    await expect(
      strategy.handle({
        workOrderId: 1,
        sagaId: 's1',
        step: 'create',
        totalAmount: 100,
      }),
    ).rejects.toThrow('Emit failed');
    expect(sagaEvents.publishCompensate).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: 1,
        sagaId: 's1',
        reason: 'Emit failed',
      }),
    );
  });
});
