import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { EventStatus } from '../../common/contracts/statuses';

@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 120 })
  venue!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Index('idx_events_status')
  @Column({ type: 'varchar', length: 16 })
  status!: EventStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
