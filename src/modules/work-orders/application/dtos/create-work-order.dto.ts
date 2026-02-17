import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WorkOrderServiceDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  serviceId: number;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  totalPrice: number;
}

export class WorkOrderPartDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  partId: number;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  totalPrice: number;
}

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  customerId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  vehicleId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hashView?: string;

  @ApiProperty({ required: false, type: [WorkOrderServiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderServiceDto)
  services?: WorkOrderServiceDto[];

  @ApiProperty({ required: false, type: [WorkOrderPartDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartDto)
  parts?: WorkOrderPartDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  totalAmount?: number;
}
