import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { SeatStatus } from '../../common/contracts/statuses';

@Entity({ name: 'seats' })
@Index('idx_seats_event_status', ['eventId', 'status'])
@Index('idx_seats_hold_expiry', ['status', 'holdExpiresAt'])
export class SeatEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ type: 'varchar', length: 16 })
  section!: string;

  @Column({ name: 'row_label', type: 'varchar', length: 8 })
  rowLabel!: string;

  @Column({ name: 'seat_number', type: 'int' })
  seatNumber!: number;

  @Column({ name: 'price_amount', type: 'int' })
  priceAmount!: number;

  @Column({ type: 'varchar', length: 16 })
  status!: SeatStatus;

  @Column({ name: 'hold_booking_id', type: 'uuid', nullable: true })
  holdBookingId!: string | null;

  @Column({ name: 'hold_expires_at', type: 'timestamptz', nullable: true })
  holdExpiresAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  version!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
