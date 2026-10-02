import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxStatus } from '../../common/contracts/statuses';
import { DomainEvent } from '../../common/kafka/domain-event';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { AppConfigService } from '../../config/app-config.service';

interface OutboxRow {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: DomainEvent<unknown>;
  status: OutboxStatus;
}

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelayService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly producer: KafkaProducerService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.role !== 'outbox') {
      return;
    }
    this.timer = setInterval(() => {
      void this.publishPendingOnce().catch((error: Error) => {
        this.logger.error(`아웃박스 발행 실패: ${error.message}`);
      });
    }, this.config.outboxPollMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async publishPendingOnce(): Promise<number> {
    if (this.running) {
      return 0;
    }
    this.running = true;
    try {
      const rows = await this.claimBatch();
      let published = 0;
      for (const row of rows) {
        if (row.status !== OutboxStatus.DISPATCHING) {
          continue;
        }
        try {
          await this.producer.publish(row.event_type, row.payload, row.aggregate_id);
          await this.dataSource.query(
            `UPDATE outbox_events SET status = 'PUBLISHED', published_at = now(), updated_at = now() WHERE id = $1`,
            [row.id],
          );
          published += 1;
        } catch (error) {
          await this.dataSource.query(
            `UPDATE outbox_events SET status = 'PENDING', updated_at = now() WHERE id = $1`,
            [row.id],
          );
          this.logger.warn(`아웃박스 재대기 id=${row.id}`);
        }
      }
      return published;
    } finally {
      this.running = false;
    }
  }

  private async claimBatch(): Promise<OutboxRow[]> {
    return this.dataSource.transaction(async (manager) => {
      const rows: OutboxRow[] = await manager.query(
        `
        WITH picked AS (
          SELECT id
          FROM outbox_events
          WHERE status = 'PENDING'
             OR (status = 'DISPATCHING' AND updated_at < now() - ($2 * interval '1 second'))
          ORDER BY created_at
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE outbox_events AS o
        SET
          status = CASE WHEN o.attempts + 1 >= 10 THEN 'FAILED' ELSE 'DISPATCHING' END,
          attempts = o.attempts + 1,
          updated_at = now()
        FROM picked
        WHERE o.id = picked.id
        RETURNING o.id, o.aggregate_id, o.event_type, o.payload, o.status
        `,
        [this.config.outboxBatchSize, this.config.outboxStuckSeconds],
      );
      return rows;
    });
  }
}
