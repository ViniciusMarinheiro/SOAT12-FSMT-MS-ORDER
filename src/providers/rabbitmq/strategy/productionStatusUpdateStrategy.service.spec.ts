import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionStatusUpdateStrategy } from './productionStatusUpdateStrategy.service';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '@/modules/work-orders/infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';

describe('ProductionStatusUpdateStrategy', () => {
  let strategy: ProductionStatusUpdateStrategy;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let statusLogRepo: jest.Mocked<Repository<WorkOrderStatusLog>>;

  const mockWorkOrder = {
    id: 1,
    status: WorkOrderStatusEnum.RECEIVED,
    startedAt: null,
    finishedAt: null,
  } as unknown as WorkOrder;

  beforeEach(async () => {
    const mockWorkOrderRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(mockWorkOrder),
    };
    const mockStatusLogRepo = {
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionStatusUpdateStrategy,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
      ],
    }).compile();

    strategy = module.get(ProductionStatusUpdateStrategy);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    statusLogRepo = module.get(getRepositoryToken(WorkOrderStatusLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw when payload is invalid (no workOrderId)', async () => {
    await expect(strategy.handle({ status: 'FINISHED' })).rejects.toThrow(
      /Payload inválido: workOrderId deve ser número positivo/,
    );
    expect(workOrderRepo.findOne).not.toHaveBeenCalled();
  });

  it('should throw when payload is invalid (invalid status)', async () => {
    await expect(
      strategy.handle({ workOrderId: 1, status: 'INVALID_STATUS' }),
    ).rejects.toThrow(/Payload inválido: status deve ser um de/);
  });

  it('should throw when payload is string but invalid JSON', async () => {
    await expect(strategy.handle('not json')).rejects.toThrow(
      'Payload inválido: JSON inválido',
    );
  });

  it('should throw when work order not found', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);

    await expect(
      strategy.handle({
        workOrderId: 999,
        status: WorkOrderStatusEnum.FINISHED,
      }),
    ).rejects.toThrow('OS 999 não encontrada');
  });

  it('should update work order and save status log on valid payload', async () => {
    workOrderRepo.findOne.mockResolvedValue({ ...mockWorkOrder });

    await strategy.handle({
      workOrderId: 1,
      status: WorkOrderStatusEnum.FINISHED,
      finishedAt: new Date('2026-02-17T12:00:00Z'),
    });

    expect(workOrderRepo.save).toHaveBeenCalled();
    expect(statusLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: 1,
        status: WorkOrderStatusEnum.FINISHED,
      }),
    );
  });

  it('should accept payload with string dates (ISO)', async () => {
    workOrderRepo.findOne.mockResolvedValue({ ...mockWorkOrder });

    await strategy.handle({
      workOrderId: 1,
      status: WorkOrderStatusEnum.FINISHED,
      finishedAt: '2026-02-17T12:00:00.000Z',
    });

    expect(workOrderRepo.save).toHaveBeenCalled();
  });

  it('should set startedAt when provided (Date object)', async () => {
    workOrderRepo.findOne.mockResolvedValue({ ...mockWorkOrder });
    const startedAt = new Date('2026-02-17T10:00:00Z');

    await strategy.handle({
      workOrderId: 1,
      status: WorkOrderStatusEnum.IN_PROGRESS,
      startedAt,
    });

    expect(workOrderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ startedAt }),
    );
  });

  it('should set startedAt when provided as ISO string', async () => {
    workOrderRepo.findOne.mockResolvedValue({ ...mockWorkOrder });

    await strategy.handle({
      workOrderId: 1,
      status: WorkOrderStatusEnum.IN_PROGRESS,
      startedAt: '2026-02-17T10:00:00.000Z',
    });

    expect(workOrderRepo.save).toHaveBeenCalled();
  });

  it('should throw when payload is not object (e.g. number)', async () => {
    await expect(strategy.handle(42)).rejects.toThrow(
      'Payload inválido: esperado objeto com workOrderId e status',
    );
  });

  it('should throw when payload is null', async () => {
    await expect(strategy.handle(null)).rejects.toThrow(
      'Payload inválido: esperado objeto com workOrderId e status',
    );
  });
});
