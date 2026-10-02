import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { OutboxStatus } from '../../common/contracts/statuses';

@Entity({ name: 'outbox_events' })
@Index('idx_outbox_dispatch', ['status', 'createdAt'])
export class OutboxEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 32 })
  aggregateType!: string;

  @Column({ name: 'aggregate_id', type: 'varchar', length: 64 })
  aggregateId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 80 })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: object;

  @Column({ type: 'varchar', length: 16 })
  status!: OutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
}
