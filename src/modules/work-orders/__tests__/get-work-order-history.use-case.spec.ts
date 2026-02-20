import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetWorkOrderHistoryUseCase } from '../application/use-cases/get-work-order-history.use-case';
import { WorkOrder } from '../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../infrastructure/database/work-order-status-log.entity';
import { WorkOrderStatusEnum } from '../domain/enums/work-order-status.enum';

describe('GetWorkOrderHistoryUseCase', () => {
  let useCase: GetWorkOrderHistoryUseCase;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let statusLogRepo: jest.Mocked<Repository<WorkOrderStatusLog>>;

  const mockLogs = [
    {
      id: 1,
      workOrderId: 1,
      status: WorkOrderStatusEnum.RECEIVED,
      startedAt: new Date('2026-02-17T10:00:00Z'),
    },
    {
      id: 2,
      workOrderId: 1,
      status: WorkOrderStatusEnum.IN_PROGRESS,
      startedAt: new Date('2026-02-17T11:00:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockWorkOrderRepo = { findOne: jest.fn() };
    const mockStatusLogRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetWorkOrderHistoryUseCase,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
      ],
    }).compile();

    useCase = module.get(GetWorkOrderHistoryUseCase);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    statusLogRepo = module.get(getRepositoryToken(WorkOrderStatusLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return logs ordered by startedAt when work order exists', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 1 } as any);
    statusLogRepo.find.mockResolvedValue(mockLogs as any);

    const result = await useCase.execute(1);

    expect(result).toEqual(mockLogs);
    expect(workOrderRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(statusLogRepo.find).toHaveBeenCalledWith({
      where: { workOrderId: 1 },
      order: { startedAt: 'ASC' },
    });
  });

  it('should throw NotFoundException when work order does not exist', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    await expect(useCase.execute(999)).rejects.toThrow(
      'WorkOrder 999 not found',
    );
    expect(statusLogRepo.find).not.toHaveBeenCalled();
  });

  it('should return empty array when work order has no logs', async () => {
    workOrderRepo.findOne.mockResolvedValue({ id: 1 } as any);
    statusLogRepo.find.mockResolvedValue([]);

    const result = await useCase.execute(1);

    expect(result).toEqual([]);
  });
});
