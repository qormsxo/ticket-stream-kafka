import { v5 as uuidv5 } from 'uuid';

export const FIXTURE_NAMESPACE = 'a3b7c1d2-5e6f-4a8b-9c0d-1e2f3a4b5c6d';

export function demoEventId(): string {
  return uuidv5('demo-event', FIXTURE_NAMESPACE);
}

export function demoSeatId(index: number): string {
  return uuidv5(`demo-seat-${index}`, FIXTURE_NAMESPACE);
}
