import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkOrderStatusEnum } from '../../domain/enums/work-order-status.enum';

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatusEnum })
  @IsEnum(WorkOrderStatusEnum)
  status: WorkOrderStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTitle?: string;
}
