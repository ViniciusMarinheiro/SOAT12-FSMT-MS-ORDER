import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateWorkOrderUseCase } from '../application/use-cases/create-work-order.use-case';
import { WorkOrder } from '../infrastructure/database/work-order.entity';
import { WorkOrderStatusLog } from '../infrastructure/database/work-order-status-log.entity';
import { WorkOrderService } from '../infrastructure/database/work-order-service.entity';
import { WorkOrderPart } from '../infrastructure/database/work-order-part.entity';
import { StockValidationService } from '@/modules/references/application/services/stock-validation.service';
import { ApiHttpService } from '@/providers/http/api-http.service';
import { SagaEventsProvider } from '@/providers/rabbitmq/saga/saga-events.provider';
import { CreateWorkOrderDto } from '../application/dtos/create-work-order.dto';
import { WorkOrderStatusEnum } from '../domain/enums/work-order-status.enum';

describe('CreateWorkOrderUseCase', () => {
  let useCase: CreateWorkOrderUseCase;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let stockValidationService: jest.Mocked<StockValidationService>;
  let apiHttpService: jest.Mocked<ApiHttpService>;
  let queryRunner: any;

  const mockSavedWorkOrder = {
    id: 1,
    customerId: 1,
    vehicleId: 1,
    userId: 1,
    protocol: '20260217-000001',
    hashView: 'abc123',
    status: WorkOrderStatusEnum.RECEIVED,
    totalAmount: 100,
  } as WorkOrder;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    const mockWorkOrderRepo = {
      create: jest.fn((dto) => dto),
      find: jest.fn().mockResolvedValue([]),
    };
    const mockStatusLogRepo = {
      create: jest.fn((dto) => dto),
    };
    const mockWorkOrderServiceRepo = {
      create: jest.fn((dto) => dto),
    };
    const mockWorkOrderPartRepo = {
      create: jest.fn((dto) => dto),
    };

    const mockStockValidation = {
      validateWorkOrderItems: jest.fn().mockResolvedValue(undefined),
    };
    const mockApiHttp = {
      getServicesByIds: jest.fn().mockResolvedValue([]),
      getPartsByIds: jest.fn().mockResolvedValue([]),
    };
    const mockSagaEventsProvider = {
      publishWorkOrderCreated: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWorkOrderUseCase,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        {
          provide: getRepositoryToken(WorkOrderStatusLog),
          useValue: mockStatusLogRepo,
        },
        {
          provide: getRepositoryToken(WorkOrderService),
          useValue: mockWorkOrderServiceRepo,
        },
        {
          provide: getRepositoryToken(WorkOrderPart),
          useValue: mockWorkOrderPartRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: StockValidationService, useValue: mockStockValidation },
        { provide: ApiHttpService, useValue: mockApiHttp },
        { provide: SagaEventsProvider, useValue: mockSagaEventsProvider },
      ],
    }).compile();

    useCase = module.get(CreateWorkOrderUseCase);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    stockValidationService = module.get(StockValidationService);
    apiHttpService = module.get(ApiHttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should validate dto and create work order with protocol and hashView', async () => {
    const dto: CreateWorkOrderDto = {
      customerId: 1,
      vehicleId: 1,
      userId: 1,
    };
    workOrderRepo.find.mockResolvedValue([]);
    queryRunner.manager.save
      .mockResolvedValueOnce(mockSavedWorkOrder)
      .mockResolvedValueOnce({});

    const result = await useCase.execute(dto);

    expect(stockValidationService.validateWorkOrderItems).toHaveBeenCalledWith(
      dto,
    );
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.manager.save).toHaveBeenCalled();
    expect(result).toEqual(mockSavedWorkOrder);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should rollback transaction on error', async () => {
    const dto: CreateWorkOrderDto = {
      customerId: 1,
      vehicleId: 1,
      userId: 1,
    };
    workOrderRepo.find.mockResolvedValue([]);
    queryRunner.manager.save.mockRejectedValue(new Error('DB error'));

    await expect(useCase.execute(dto)).rejects.toThrow('DB error');
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it('should call getServicesByIds and getPartsByIds when dto has services and parts', async () => {
    const dto: CreateWorkOrderDto = {
      customerId: 1,
      vehicleId: 1,
      userId: 1,
      services: [{ serviceId: 1, quantity: 1 }],
      parts: [{ partId: 2, quantity: 1 }],
    };
    workOrderRepo.find.mockResolvedValue([]);
    apiHttpService.getServicesByIds.mockResolvedValue([
      { id: 1, price: 50 },
    ] as any);
    apiHttpService.getPartsByIds.mockResolvedValue([
      { id: 2, unitPrice: 50 },
    ] as any);
    queryRunner.manager.save
      .mockResolvedValueOnce(mockSavedWorkOrder)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await useCase.execute(dto);

    expect(apiHttpService.getServicesByIds).toHaveBeenCalledWith([1]);
    expect(apiHttpService.getPartsByIds).toHaveBeenCalledWith([2]);
  });
});
