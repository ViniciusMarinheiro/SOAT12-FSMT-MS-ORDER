import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkOrderStatusEnum } from '../../domain/enums/work-order-status.enum';

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatusEnum })
  @IsEnum(WorkOrderStatusEnum)
  status: WorkOrderStatusEnum;
}
