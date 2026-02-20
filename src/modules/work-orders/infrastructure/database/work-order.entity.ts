import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkOrderStatusEnum } from '../../domain/enums/work-order-status.enum';

@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'customer_id' })
  customerId: number;

  @Column({ type: 'int', name: 'vehicle_id' })
  vehicleId: number;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar', name: 'hash_view', nullable: true })
  hashView: string;

  @Column({ type: 'varchar', name: 'protocol', unique: true })
  protocol: string;

  @Column({
    type: 'simple-enum',
    enum: WorkOrderStatusEnum,
    default: WorkOrderStatusEnum.RECEIVED,
  })
  status: WorkOrderStatusEnum;

  @Column({ type: 'int', default: 0, name: 'total_amount' })
  totalAmount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'started_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startedAt: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'finished_at',
    nullable: true,
  })
  finishedAt: Date | null;

  @Column({ type: 'varchar', name: 'payment_init_point', nullable: true })
  paymentInitPoint: string | null;

  @Column({ type: 'varchar', name: 'payment_preference_id', nullable: true })
  paymentPreferenceId: string | null;
}
