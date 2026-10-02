import { SeatStatus } from '../../../common/contracts/statuses';

export interface SeatSnapshot {
  id: string;
  status: SeatStatus;
  holdBookingId: string | null;
  holdExpiresAt: Date | null;
  version: number;
}

export type SeatRejectReason = 'NOT_FOUND' | 'UNAVAILABLE' | 'HOLD_MISMATCH' | 'HOLD_EXPIRED';

export type TransitionResult =
  | { ok: true; seat: SeatSnapshot }
  | { ok: false; reason: SeatRejectReason };

export class SeatTransition {
  // AVAILABLE일 때만 HELD로 바꾸고 선점 만료 시각을 심는 기능
  static hold(
    seat: SeatSnapshot | null,
    bookingId: string,
    now: Date,
    ttlMs: number,
  ): TransitionResult {
    if (!seat) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (seat.status !== SeatStatus.AVAILABLE) {
      return { ok: false, reason: 'UNAVAILABLE' };
    }

    return {
      ok: true,
      seat: {
        ...seat,
        status: SeatStatus.HELD,
        holdBookingId: bookingId,
        holdExpiresAt: new Date(now.getTime() + ttlMs),
        version: seat.version + 1,
      },
    };
  }

  // 본인 선점이고 만료 전일 때만 SOLD로 수정함
  static confirm(seat: SeatSnapshot | null, bookingId: string, now: Date): TransitionResult {
    if (!seat) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (seat.status !== SeatStatus.HELD || seat.holdBookingId !== bookingId) {
      return { ok: false, reason: 'HOLD_MISMATCH' };
    }
    if (seat.holdExpiresAt && seat.holdExpiresAt.getTime() <= now.getTime()) {
      return { ok: false, reason: 'HOLD_EXPIRED' };
    }

    return {
      ok: true,
      seat: {
        ...seat,
        status: SeatStatus.SOLD,
        holdExpiresAt: null,
        version: seat.version + 1,
      },
    };
  }

  // 이미 SOLD인 좌석은 되돌리지 않음. 본인 HELD만 AVAILABLE로 수정함
  static release(seat: SeatSnapshot | null, bookingId: string): TransitionResult {
    if (!seat) {
      return { ok: false, reason: 'NOT_FOUND' };
    }
    if (seat.status === SeatStatus.SOLD) {
      return { ok: false, reason: 'UNAVAILABLE' };
    }
    if (seat.status !== SeatStatus.HELD || seat.holdBookingId !== bookingId) {
      return { ok: false, reason: 'HOLD_MISMATCH' };
    }

    return {
      ok: true,
      seat: {
        ...seat,
        status: SeatStatus.AVAILABLE,
        holdBookingId: null,
        holdExpiresAt: null,
        version: seat.version + 1,
      },
    };
  }
}

export function toSeatSnapshot(seat: {
  id: string;
  status: SeatStatus;
  holdBookingId: string | null;
  holdExpiresAt: Date | null;
  version: number;
}): SeatSnapshot {
  return {
    id: seat.id,
    status: seat.status,
    holdBookingId: seat.holdBookingId,
    holdExpiresAt: seat.holdExpiresAt,
    version: seat.version,
  };
}
