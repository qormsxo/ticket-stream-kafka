import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { PaymentStatus } from '../../common/contracts/statuses';

@Entity({ name: 'payments' })
@Index('uq_payments_booking', ['bookingId'], { unique: true })
@Index('uq_payments_provider_ref', ['providerRef'], { unique: true })
export class PaymentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  @Column({ name: 'provider_ref', type: 'varchar', length: 80 })
  providerRef!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: PaymentStatus;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ name: 'failure_reason', type: 'varchar', length: 64, nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
