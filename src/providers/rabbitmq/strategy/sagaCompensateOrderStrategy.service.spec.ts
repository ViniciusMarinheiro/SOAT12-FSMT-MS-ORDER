import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SagaCompensateOrderStrategy } from './sagaCompensateOrderStrategy.service';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';
import { SagaWorkOrderStep } from '../saga/saga.types';

describe('SagaCompensateOrderStrategy', () => {
  let strategy: SagaCompensateOrderStrategy;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let statusLogRepo: jest.Mocked<Repository<WorkOrderStatusLog>>;

  beforeEach(async () => {
    const mockWorkOrderRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockStatusLogRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SagaCompensateOrderStrategy,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
      ],
    }).compile();

    strategy = module.get(SagaCompensateOrderStrategy);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    statusLogRepo = module.get(getRepositoryToken(WorkOrderStatusLog));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw when payload is invalid', async () => {
    await expect(strategy.handle({})).rejects.toThrow(
      'Payload inválido: workOrderId e step obrigatórios',
    );
    await expect(strategy.handle({ workOrderId: 1 })).rejects.toThrow(
      'Payload inválido: workOrderId e step obrigatórios',
    );
  });

  it('should return without update when work order not found', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);
    await strategy.handle({
      workOrderId: 99,
      step: SagaWorkOrderStep.CREATE,
      sagaId: 's1',
    });
    expect(workOrderRepo.update).not.toHaveBeenCalled();
  });

  it('should update status to REJECTED when step is CREATE', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 1 } as WorkOrder);
    await strategy.handle({
      workOrderId: 1,
      step: SagaWorkOrderStep.CREATE,
      sagaId: 's1',
    });
    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      status: WorkOrderStatusEnum.REJECTED,
    });
    expect(statusLogRepo.save).toHaveBeenCalled();
  });

  it('should update status to RECEIVED when step is BUDGET_GENERATED', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 1 } as WorkOrder);
    await strategy.handle({
      workOrderId: 1,
      step: SagaWorkOrderStep.BUDGET_GENERATED,
      sagaId: 's1',
    });
    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      status: WorkOrderStatusEnum.RECEIVED,
    });
  });

  it('should update status to DIAGNOSING when step is AWAITING_APPROVAL', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 1 } as WorkOrder);
    await strategy.handle({
      workOrderId: 1,
      step: SagaWorkOrderStep.AWAITING_APPROVAL,
      sagaId: 's1',
    });
    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      status: WorkOrderStatusEnum.DIAGNOSING,
    });
  });

  it('should update status to AWAITING_APPROVAL when step is SEND_TO_PRODUCTION', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 1 } as WorkOrder);
    await strategy.handle({
      workOrderId: 1,
      step: SagaWorkOrderStep.SEND_TO_PRODUCTION,
      sagaId: 's1',
    });
    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      status: WorkOrderStatusEnum.AWAITING_APPROVAL,
    });
  });

  it('should accept payload as JSON string', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 2 } as WorkOrder);
    const payload = JSON.stringify({
      workOrderId: 2,
      step: SagaWorkOrderStep.CREATE,
      sagaId: 's2',
    });
    await strategy.handle(payload);
    expect(workOrderRepo.update).toHaveBeenCalledWith(2, {
      status: WorkOrderStatusEnum.REJECTED,
    });
  });
});
