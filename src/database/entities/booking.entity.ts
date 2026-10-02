import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../common/contracts/statuses';

@Entity({ name: 'bookings' })
@Index('uq_bookings_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('idx_bookings_user_created', ['userId', 'createdAt'])
export class BookingEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'seat_id', type: 'uuid' })
  seatId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 128 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: BookingStatus;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ name: 'failure_reason', type: 'varchar', length: 64, nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
