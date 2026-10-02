import { EntityManager } from 'typeorm';
import { RetryableError } from '../../common/errors';
import { SeatEntity } from '../../database/entities/seat.entity';
import { SeatSnapshot } from './domain/seat-transition';

export async function applySeatSnapshot(
  manager: EntityManager,
  current: { id: string; version: number },
  next: SeatSnapshot,
): Promise<void> {
  const result = await manager.update(
    SeatEntity,
    { id: current.id, version: current.version },
    {
      status: next.status,
      holdBookingId: next.holdBookingId,
      holdExpiresAt: next.holdExpiresAt,
      version: next.version,
    },
  );
  if (result.affected === 0) {
    throw new RetryableError('좌석 버전 충돌');
  }
}
