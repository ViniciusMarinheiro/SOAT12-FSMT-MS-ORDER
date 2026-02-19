import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StockValidationService } from '../application/services/stock-validation.service';
import { ApiHttpService } from '@/providers/http/api-http.service';
import { CreateWorkOrderDto } from '@/modules/work-orders/application/dtos/create-work-order.dto';

describe('StockValidationService', () => {
  let service: StockValidationService;
  let apiHttpService: jest.Mocked<ApiHttpService>;

  beforeEach(async () => {
    const mockApiHttpService = {
      getPartsByIds: jest.fn(),
      getServicesByIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockValidationService,
        { provide: ApiHttpService, useValue: mockApiHttpService },
      ],
    }).compile();

    service = module.get(StockValidationService);
    apiHttpService = module.get(ApiHttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should pass when dto has no parts and no services', async () => {
    const dto = {
      customerId: 1,
      vehicleId: 1,
      userId: 1,
    } as CreateWorkOrderDto;
    await expect(service.validateWorkOrderItems(dto)).resolves.toBeUndefined();
    expect(apiHttpService.getPartsByIds).not.toHaveBeenCalled();
    expect(apiHttpService.getServicesByIds).not.toHaveBeenCalled();
  });

  describe('validateWorkOrderItems (parts)', () => {
    it('should throw NotFoundException when part ids are not found', async () => {
      const dto = {
        customerId: 1,
        vehicleId: 1,
        userId: 1,
        parts: [{ partId: 1, quantity: 1 }],
      } as CreateWorkOrderDto;
      apiHttpService.getPartsByIds.mockResolvedValue([]);

      await expect(service.validateWorkOrderItems(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.validateWorkOrderItems(dto)).rejects.toThrow(
        'Peças não encontradas: 1',
      );
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const dto = {
        customerId: 1,
        vehicleId: 1,
        userId: 1,
        parts: [{ partId: 1, quantity: 5 }],
      } as CreateWorkOrderDto;
      apiHttpService.getPartsByIds.mockResolvedValue([
        { id: 1, name: 'Peça A', stock: 2 },
      ] as any);

      await expect(service.validateWorkOrderItems(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateWorkOrderItems(dto)).rejects.toThrow(
        /Estoque insuficiente/,
      );
    });

    it('should pass when parts have enough stock', async () => {
      const dto = {
        customerId: 1,
        vehicleId: 1,
        userId: 1,
        parts: [{ partId: 1, quantity: 2 }],
      } as CreateWorkOrderDto;
      apiHttpService.getPartsByIds.mockResolvedValue([
        { id: 1, name: 'Peça A', stock: 10 },
      ] as any);

      await expect(
        service.validateWorkOrderItems(dto),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateWorkOrderItems (services)', () => {
    it('should throw NotFoundException when service ids are not found', async () => {
      const dto = {
        customerId: 1,
        vehicleId: 1,
        userId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
      } as CreateWorkOrderDto;
      apiHttpService.getServicesByIds.mockResolvedValue([]);

      await expect(service.validateWorkOrderItems(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.validateWorkOrderItems(dto)).rejects.toThrow(
        'Serviços não encontrados: 1',
      );
    });

    it('should pass when services exist', async () => {
      const dto = {
        customerId: 1,
        vehicleId: 1,
        userId: 1,
        services: [{ serviceId: 1, quantity: 1 }],
      } as CreateWorkOrderDto;
      apiHttpService.getServicesByIds.mockResolvedValue([
        { id: 1, name: 'Serviço A', price: 100 },
      ] as any);

      await expect(
        service.validateWorkOrderItems(dto),
      ).resolves.toBeUndefined();
    });
  });
});
