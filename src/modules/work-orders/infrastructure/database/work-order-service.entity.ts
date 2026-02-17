import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkOrder } from './work-order.entity';

@Entity('work_order_services')
export class WorkOrderService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'work_order_id' })
  workOrderId: number;

  @Column({ type: 'int', name: 'service_id' })
  serviceId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int', name: 'total_price' })
  totalPrice: number;

  @ManyToOne(() => WorkOrder, { onDelete: 'CASCADE' })
  workOrder: WorkOrder;
}
