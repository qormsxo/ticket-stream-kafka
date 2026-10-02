export interface BookingRequestedPayload {
  bookingId: string;
  eventId: string;
  seatId: string;
  userId: string;
  idempotencyKey: string;
  requestedAt: string;
}

export interface SeatHoldRequestedPayload {
  bookingId: string;
  eventId: string;
  seatId: string;
  userId: string;
  amount: number;
}

export interface SeatHeldPayload {
  bookingId: string;
  eventId: string;
  seatId: string;
  userId: string;
  amount: number;
  holdExpiresAt: string;
}

export interface SeatHoldFailedPayload {
  bookingId: string;
  eventId: string;
  seatId: string;
  userId: string;
  reason: string;
}

export interface PaymentResultPayload {
  bookingId: string;
  eventId: string;
  seatId: string;
  userId: string;
  amount: number;
  providerRef?: string;
  reason?: string;
}

export interface DeadLetterPayload {
  sourceTopic: string;
  consumerGroup: string;
  payload: unknown;
  error: string;
  failedAt: string;
}
