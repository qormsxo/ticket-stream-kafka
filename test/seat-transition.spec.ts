import { SeatStatus } from '../src/common/contracts/statuses';
import { SeatSnapshot, SeatTransition } from '../src/modules/seat/domain/seat-transition';

function seat(overrides: Partial<SeatSnapshot> = {}): SeatSnapshot {
  return {
    id: 'seat-1',
    status: SeatStatus.AVAILABLE,
    holdBookingId: null,
    holdExpiresAt: null,
    version: 3,
    ...overrides,
  };
}

describe('SeatTransition', () => {
  const now = new Date('2026-10-02T00:00:00.000Z');

  it('빈 좌석만 선점하고 버전을 올린다', () => {
    const result = SeatTransition.hold(seat(), 'booking-1', now, 60_000);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.seat.status).toBe(SeatStatus.HELD);
    expect(result.seat.holdBookingId).toBe('booking-1');
    expect(result.seat.version).toBe(4);
    expect(result.seat.holdExpiresAt?.toISOString()).toBe('2026-10-02T00:01:00.000Z');
  });

  it('이미 선점된 좌석은 두 번째 예매를 거절한다', () => {
    const first = SeatTransition.hold(seat(), 'booking-1', now, 60_000);
    if (!first.ok) {
      throw new Error('첫 선점이 성공해야 합니다.');
    }
    const second = SeatTransition.hold(first.seat, 'booking-2', now, 60_000);
    expect(second).toEqual({ ok: false, reason: 'UNAVAILABLE' });
  });

  it('선점한 예매만 판매로 확정한다', () => {
    const held = SeatTransition.hold(seat(), 'booking-1', now, 60_000);
    if (!held.ok) {
      throw new Error('선점이 성공해야 합니다.');
    }
    const confirmed = SeatTransition.confirm(held.seat, 'booking-1', new Date(now.getTime() + 1_000));
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.seat.status).toBe(SeatStatus.SOLD);
    }
    const stolen = SeatTransition.confirm(held.seat, 'booking-2', now);
    expect(stolen).toEqual({ ok: false, reason: 'HOLD_MISMATCH' });
  });

  it('만료된 선점은 확정하지 않는다', () => {
    const held = SeatTransition.hold(seat(), 'booking-1', now, 1_000);
    if (!held.ok) {
      throw new Error('선점이 성공해야 합니다.');
    }
    const expired = SeatTransition.confirm(held.seat, 'booking-1', new Date(now.getTime() + 1_000));
    expect(expired).toEqual({ ok: false, reason: 'HOLD_EXPIRED' });
  });

  it('본인 선점만 다시 풀어 준다', () => {
    const held = SeatTransition.hold(seat(), 'booking-1', now, 60_000);
    if (!held.ok) {
      throw new Error('선점이 성공해야 합니다.');
    }
    const released = SeatTransition.release(held.seat, 'booking-1');
    expect(released.ok).toBe(true);
    if (released.ok) {
      expect(released.seat.status).toBe(SeatStatus.AVAILABLE);
      expect(released.seat.holdBookingId).toBeNull();
    }
    const sold = SeatTransition.confirm(held.seat, 'booking-1', now);
    if (!sold.ok) {
      throw new Error('확정이 성공해야 합니다.');
    }
    expect(SeatTransition.release(sold.seat, 'booking-1')).toEqual({
      ok: false,
      reason: 'UNAVAILABLE',
    });
  });
});
