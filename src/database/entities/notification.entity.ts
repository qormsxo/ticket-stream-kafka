import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { NotificationTemplate } from '../../common/contracts/statuses';
import { DomainEvent } from '../../common/kafka/domain-event';

@Entity({ name: 'notifications' })
@Index('uq_notifications_booking_template', ['bookingId', 'template'], { unique: true })
export class NotificationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ type: 'varchar', length: 16 })
  channel!: string;

  @Column({ type: 'varchar', length: 40 })
  template!: NotificationTemplate;

  @Column({ type: 'jsonb' })
  payload!: DomainEvent<unknown>;

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
