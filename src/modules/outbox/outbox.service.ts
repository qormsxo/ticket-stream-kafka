import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OutboxStatus } from '../../common/contracts/statuses';
import { DomainEvent } from '../../common/kafka/domain-event';
import { OutboxEntity } from '../../database/entities/outbox.entity';

export interface EnqueueOutboxInput<T> {
  aggregateType: string;
  aggregateId: string;
  event: DomainEvent<T>;
}

@Injectable()
export class OutboxService {
  async enqueue<T>(manager: EntityManager, input: EnqueueOutboxInput<T>): Promise<void> {
    // Kafka를 여기서 호출하지 않음. 업무 트랜잭션이 커밋된 뒤에만 발행 대상이 됨
    const now = new Date();
    await manager.insert(OutboxEntity, {
      id: randomUUID(),
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.event.eventType,
      payload: input.event as object,
      status: OutboxStatus.PENDING,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    });
  }
}
