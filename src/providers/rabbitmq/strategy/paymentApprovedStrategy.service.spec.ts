import { Test, TestingModule } from '@nestjs/testing';
import { PaymentApprovedStrategy } from './paymentApprovedStrategy.service';
import { UpdateWorkOrderStatusUseCase } from '@/modules/work-orders/application/use-cases/update-work-order-status.use-case';
import { WorkOrderStatusEnum } from '@/modules/work-orders/domain/enums/work-order-status.enum';

describe('PaymentApprovedStrategy', () => {
  let strategy: PaymentApprovedStrategy;
  let updateWorkOrderStatusUseCase: jest.Mocked<UpdateWorkOrderStatusUseCase>;

  beforeEach(async () => {
    const mockUpdateUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentApprovedStrategy,
        {
          provide: UpdateWorkOrderStatusUseCase,
          useValue: mockUpdateUseCase,
        },
      ],
    }).compile();

    strategy = module.get(PaymentApprovedStrategy);
    updateWorkOrderStatusUseCase = module.get(UpdateWorkOrderStatusUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should call updateWorkOrderStatusUseCase with workOrderId and IN_PROGRESS', async () => {
    await strategy.handle({ workOrderId: 5 });

    expect(updateWorkOrderStatusUseCase.execute).toHaveBeenCalledWith(
      5,
      WorkOrderStatusEnum.IN_PROGRESS,
    );
  });

  it('should throw when workOrderId is missing', async () => {
    await expect(strategy.handle({})).rejects.toThrow(
      'Payload inválido: workOrderId obrigatório',
    );
    expect(updateWorkOrderStatusUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw when payload is string without workOrderId', async () => {
    await expect(strategy.handle(JSON.stringify({ foo: 1 }))).rejects.toThrow(
      'Payload inválido: workOrderId obrigatório',
    );
  });
});
