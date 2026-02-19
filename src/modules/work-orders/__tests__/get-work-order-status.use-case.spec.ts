import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetWorkOrderStatusUseCase } from '../application/use-cases/get-work-order-status.use-case';
import { WorkOrder } from '../infrastructure/database/work-order.entity';
import { WorkOrderStatusEnum } from '../domain/enums/work-order-status.enum';

describe('GetWorkOrderStatusUseCase', () => {
  let useCase: GetWorkOrderStatusUseCase;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;

  const mockWorkOrder = {
    id: 1,
    status: WorkOrderStatusEnum.IN_PROGRESS,
    protocol: '20260217-000001',
  } as WorkOrder;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetWorkOrderStatusUseCase,
        { provide: getRepositoryToken(WorkOrder), useValue: mockRepo },
      ],
    }).compile();

    useCase = module.get(GetWorkOrderStatusUseCase);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should return status, id and protocol when work order exists', async () => {
    workOrderRepo.findOne.mockResolvedValue(mockWorkOrder);

    const result = await useCase.execute(1);

    expect(result).toEqual({
      id: 1,
      status: WorkOrderStatusEnum.IN_PROGRESS,
      protocol: '20260217-000001',
    });
    expect(workOrderRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should throw NotFoundException when work order does not exist', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundException);
    await expect(useCase.execute(999)).rejects.toThrow(
      'WorkOrder 999 not found',
    );
  });
});
