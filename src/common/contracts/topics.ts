export const KafkaTopics = {
  BOOKING_REQUESTED: 'ticket.booking.requested',
  SEAT_HOLD_REQUESTED: 'ticket.seat.hold.requested',
  SEAT_HELD: 'ticket.seat.held',
  SEAT_HOLD_FAILED: 'ticket.seat.hold.failed',
  PAYMENT_COMPLETED: 'ticket.payment.completed',
  PAYMENT_FAILED: 'ticket.payment.failed',
  BOOKING_STATUS: 'ticket.booking.status',
  DEAD_LETTER: 'ticket.dead-letter',
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];

export const ConsumerGroups = {
  BOOKING: 'cg-booking-intake',
  SEAT: 'cg-seat-occupancy',
  PAYMENT: 'cg-payment-processing',
  NOTIFICATION: 'cg-notification-dispatch',
  GATEWAY_RPC: 'cg-gateway-rpc',
} as const;

export const WORKER_ROLES = [
  'booking',
  'seat',
  'payment',
  'notification',
  'outbox',
] as const;

export type WorkerRole = (typeof WORKER_ROLES)[number];

export function isWorkerRole(value: string): value is WorkerRole {
  return (WORKER_ROLES as readonly string[]).includes(value);
}
