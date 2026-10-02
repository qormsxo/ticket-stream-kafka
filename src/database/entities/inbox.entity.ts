import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inbox_messages' })
@Index('uq_inbox_consumer_event', ['consumerGroup', 'eventId'], { unique: true })
export class InboxEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'consumer_group', type: 'varchar', length: 80 })
  consumerGroup!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt!: Date;
}
