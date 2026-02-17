import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkOrderStatusEnum } from '../../domain/enums/work-order-status.enum';
import { columnDate } from '../../../../common/db/column-date.util';

@Entity('work_order_status_logs')
export class WorkOrderStatusLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'work_order_id' })
  workOrderId: number;

  @Column({
    type: 'simple-enum',
    enum: WorkOrderStatusEnum,
  })
  status: WorkOrderStatusEnum;

  @Column(columnDate({ name: 'started_at', nullable: false }))
  startedAt: Date;

  @Column(columnDate({ name: 'finished_at', nullable: true }))
  finishedAt: Date | null;

  @ManyToOne('WorkOrder', 'statusLogs')
  @JoinColumn({ name: 'work_order_id' })
  workOrder: any;
}
