import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrdersController } from '../infrastructure/web/work-orders.controller';
import { CreateWorkOrderUseCase } from '../application/use-cases/create-work-order.use-case';
import { UpdateWorkOrderStatusUseCase } from '../application/use-cases/update-work-order-status.use-case';
import { GetWorkOrderStatusUseCase } from '../application/use-cases/get-work-order-status.use-case';
import { GetWorkOrderHistoryUseCase } from '../application/use-cases/get-work-order-history.use-case';
import { WorkOrderStatusEnum } from '../domain/enums/work-order-status.enum';

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController;
  let createUseCase: jest.Mocked<CreateWorkOrderUseCase>;
  let updateStatusUseCase: jest.Mocked<UpdateWorkOrderStatusUseCase>;
  let getStatusUseCase: jest.Mocked<GetWorkOrderStatusUseCase>;
  let getHistoryUseCase: jest.Mocked<GetWorkOrderHistoryUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [
        {
          provide: CreateWorkOrderUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateWorkOrderStatusUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetWorkOrderStatusUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetWorkOrderHistoryUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(WorkOrdersController);
    createUseCase = module.get(CreateWorkOrderUseCase);
    updateStatusUseCase = module.get(UpdateWorkOrderStatusUseCase);
    getStatusUseCase = module.get(GetWorkOrderStatusUseCase);
    getHistoryUseCase = module.get(GetWorkOrderHistoryUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should call createWorkOrderUseCase.execute with dto', async () => {
    const dto = {
      customerId: 1,
      vehicleId: 1,
      userId: 1,
    } as any;
    const expected = {
      id: 1,
      protocol: '20260217-000001',
      status: WorkOrderStatusEnum.RECEIVED,
    } as any;
    createUseCase.execute.mockResolvedValue(expected);

    const result = await controller.create(dto);

    expect(createUseCase.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual(expected);
  });

  it('updateStatus should call updateWorkOrderStatusUseCase with id and status', async () => {
    const updated = { id: 1, status: WorkOrderStatusEnum.IN_PROGRESS } as any;
    updateStatusUseCase.execute.mockResolvedValue(updated);

    const result = await controller.updateStatus('1', {
      status: WorkOrderStatusEnum.IN_PROGRESS,
    } as any);

    expect(updateStatusUseCase.execute).toHaveBeenCalledWith(
      1,
      WorkOrderStatusEnum.IN_PROGRESS,
    );
    expect(result).toEqual(updated);
  });

  it('getStatus should call getWorkOrderStatusUseCase with id', async () => {
    const statusResult = {
      id: 1,
      status: WorkOrderStatusEnum.RECEIVED,
      protocol: 'P-001',
    };
    getStatusUseCase.execute.mockResolvedValue(statusResult);

    const result = await controller.getStatus('1');

    expect(getStatusUseCase.execute).toHaveBeenCalledWith(1);
    expect(result).toEqual(statusResult);
  });

  it('getHistory should call getWorkOrderHistoryUseCase with id', async () => {
    const logs = [
      {
        id: 1,
        workOrderId: 1,
        status: WorkOrderStatusEnum.RECEIVED,
        startedAt: new Date(),
      },
    ] as any;
    getHistoryUseCase.execute.mockResolvedValue(logs);

    const result = await controller.getHistory('1');

    expect(getHistoryUseCase.execute).toHaveBeenCalledWith(1);
    expect(result).toEqual(logs);
  });
});
