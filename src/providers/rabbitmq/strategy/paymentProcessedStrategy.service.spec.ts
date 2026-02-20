import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentProcessedStrategy } from './paymentProcessedStrategy.service';
import { WorkOrder } from '@/modules/work-orders/infrastructure/database/work-order.entity';
import { SendEmailQueueProvider } from '../providers/send-email-queue.provider';

describe('PaymentProcessedStrategy', () => {
  let strategy: PaymentProcessedStrategy;
  let workOrderRepo: jest.Mocked<Repository<WorkOrder>>;
  let sendEmailQueue: jest.Mocked<SendEmailQueueProvider>;

  const mockWorkOrder = {
    id: 1,
    protocol: '20260220-000001',
    customerId: 10,
  } as WorkOrder;

  beforeEach(async () => {
    const mockWorkOrderRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockSendEmailQueue = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProcessedStrategy,
        { provide: getRepositoryToken(WorkOrder), useValue: mockWorkOrderRepo },
        { provide: SendEmailQueueProvider, useValue: mockSendEmailQueue },
      ],
    }).compile();

    strategy = module.get(PaymentProcessedStrategy);
    workOrderRepo = module.get(getRepositoryToken(WorkOrder));
    sendEmailQueue = module.get(SendEmailQueueProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw when workOrderId is missing', async () => {
    await expect(strategy.handle({})).rejects.toThrow(
      'Payload inválido: workOrderId obrigatório',
    );
  });

  it('should return early when work order not found', async () => {
    workOrderRepo.findOne.mockResolvedValue(null);

    await strategy.handle({
      workOrderId: 999,
      paymentId: 'p1',
      status: 'created',
    });

    expect(workOrderRepo.update).not.toHaveBeenCalled();
    expect(sendEmailQueue.send).not.toHaveBeenCalled();
  });

  it('should update work order and send email when status is created with init_point and payerEmail', async () => {
    workOrderRepo.findOne.mockResolvedValue(mockWorkOrder);

    await strategy.handle({
      workOrderId: 1,
      paymentId: 'pref-123',
      status: 'created',
      init_point: 'https://pay.mercadopago.com/checkout',
      payerEmail: 'client@test.com',
    });

    expect(workOrderRepo.update).toHaveBeenCalledWith(1, {
      paymentInitPoint: 'https://pay.mercadopago.com/checkout',
      paymentPreferenceId: 'pref-123',
    });
    expect(sendEmailQueue.send).toHaveBeenCalledWith({
      recipient: 'client@test.com',
      subject: 'Link de pagamento - Ordem de serviço 20260220-000001',
      body: expect.stringContaining('https://pay.mercadopago.com/checkout'),
      name: 'client@test.com',
      type: 'payment_link',
    });
  });

  it('should update work order but not send email when payerEmail is missing', async () => {
    workOrderRepo.findOne.mockResolvedValue(mockWorkOrder);

    await strategy.handle({
      workOrderId: 1,
      paymentId: 'pref-123',
      status: 'created',
      init_point: 'https://pay.mercadopago.com/checkout',
    });

    expect(workOrderRepo.update).toHaveBeenCalled();
    expect(sendEmailQueue.send).not.toHaveBeenCalled();
  });

  it('should not update or send email when status is not created', async () => {
    workOrderRepo.findOne.mockResolvedValue(mockWorkOrder);

    await strategy.handle({
      workOrderId: 1,
      paymentId: 'pref-123',
      status: 'pending',
    });

    expect(workOrderRepo.update).not.toHaveBeenCalled();
    expect(sendEmailQueue.send).not.toHaveBeenCalled();
  });

  it('should handle status error branch', async () => {
    workOrderRepo.findOne.mockResolvedValue(mockWorkOrder);

    await strategy.handle({
      workOrderId: 1,
      paymentId: 'pref-123',
      status: 'error',
      error: 'Payment failed',
    });

    expect(workOrderRepo.update).not.toHaveBeenCalled();
    expect(sendEmailQueue.send).not.toHaveBeenCalled();
  });

  it('should normalize payload from wrapped data', async () => {
    workOrderRepo.findOne.mockResolvedValue(mockWorkOrder);

    await strategy.handle({
      data: {
        workOrderId: 1,
        paymentId: 'pref-123',
        status: 'created',
        init_point: 'https://link.com',
        payerEmail: 'a@b.com',
      },
    });

    expect(workOrderRepo.update).toHaveBeenCalledWith(1, expect.any(Object));
    expect(sendEmailQueue.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: 'a@b.com' }),
    );
  });
});
