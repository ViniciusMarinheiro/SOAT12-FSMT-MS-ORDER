import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWorkOrderDto } from '../../application/dtos/create-work-order.dto';
import { UpdateWorkOrderStatusDto } from '../../application/dtos/update-work-order-status.dto';
import { CreateWorkOrderUseCase } from '../../application/use-cases/create-work-order.use-case';
import { UpdateWorkOrderStatusUseCase } from '../../application/use-cases/update-work-order-status.use-case';
import { GetWorkOrderStatusUseCase } from '../../application/use-cases/get-work-order-status.use-case';
import { GetWorkOrderHistoryUseCase } from '../../application/use-cases/get-work-order-history.use-case';

@ApiTags('work-orders')
@Controller('work-orders')
@ApiBearerAuth('Bearer')
export class WorkOrdersController {
  constructor(
    private readonly createWorkOrderUseCase: CreateWorkOrderUseCase,
    private readonly updateWorkOrderStatusUseCase: UpdateWorkOrderStatusUseCase,
    private readonly getWorkOrderStatusUseCase: GetWorkOrderStatusUseCase,
    private readonly getWorkOrderHistoryUseCase: GetWorkOrderHistoryUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Abertura da OS' })
  @ApiResponse({ status: 201, description: 'OS criada com sucesso' })
  create(@Body() dto: CreateWorkOrderDto) {
    return this.createWorkOrderUseCase.execute(dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualização de status da OS' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateWorkOrderStatusDto) {
    return this.updateWorkOrderStatusUseCase.execute(+id, dto.status);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Consulta de status atual' })
  getStatus(@Param('id') id: string) {
    return this.getWorkOrderStatusUseCase.execute(+id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Consulta do histórico de status' })
  getHistory(@Param('id') id: string) {
    return this.getWorkOrderHistoryUseCase.execute(+id);
  }
}
