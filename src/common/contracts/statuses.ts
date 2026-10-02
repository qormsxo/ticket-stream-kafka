export enum EventStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  SOLD = 'SOLD',
}

export enum BookingStatus {
  REQUESTED = 'REQUESTED',
  SEAT_HELD = 'SEAT_HELD',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export enum PaymentStatus {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  VOIDED = 'VOIDED',
}

export enum OutboxStatus {
  PENDING = 'PENDING',
  DISPATCHING = 'DISPATCHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum NotificationTemplate {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_FAILED = 'BOOKING_FAILED',
  SEAT_REJECTED = 'SEAT_REJECTED',
}
