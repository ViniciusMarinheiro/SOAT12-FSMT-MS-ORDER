import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkOrder } from './work-order.entity';

@Entity('work_order_parts')
export class WorkOrderPart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'work_order_id' })
  workOrderId: number;

  @Column({ type: 'int', name: 'part_id' })
  partId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', name: 'total_price' })
  totalPrice: number;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;
}
