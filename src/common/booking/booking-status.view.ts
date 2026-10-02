import { BookingStatus } from '../contracts/statuses';
import { BookingEntity } from '../../database/entities/booking.entity';

export interface BookingStatusView {
  bookingId: string;
  status: BookingStatus | 'ACCEPTED';
  eventId?: string;
  seatId?: string;
  userId?: string;
  amount?: number;
  failureReason?: string | null;
  updatedAt: string;
}

export interface AcceptedBookingView {
  bookingId: string;
  status: 'ACCEPTED';
  pollUrl: string;
}

export function toBookingView(booking: BookingEntity): BookingStatusView {
  return {
    bookingId: booking.id,
    status: booking.status,
    eventId: booking.eventId,
    seatId: booking.seatId,
    userId: booking.userId,
    amount: booking.amount,
    failureReason: booking.failureReason,
    updatedAt: (booking.updatedAt ?? new Date()).toISOString(),
  };
}
