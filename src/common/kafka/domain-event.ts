import { randomUUID } from 'crypto';

export interface DomainEvent<T> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  payload: T;
}

export function buildEvent<T>(
  eventType: string,
  aggregateId: string,
  payload: T,
): DomainEvent<T> {
  return {
    eventId: randomUUID(),
    eventType,
    aggregateId,
    occurredAt: new Date().toISOString(),
    payload,
  };
}

export function asDomainEvent<T>(input: unknown): DomainEvent<T> {
  if (!input || typeof input !== 'object') {
    throw new Error('도메인 이벤트 형식이 아닙니다.');
  }

  const event = input as Partial<DomainEvent<T>>;
  if (!event.eventId || !event.eventType || !event.payload) {
    throw new Error('도메인 이벤트 필수 필드가 없습니다.');
  }

  return event as DomainEvent<T>;
}
