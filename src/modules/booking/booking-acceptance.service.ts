import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { AcceptedBookingView } from '../../common/booking/booking-status.view';
import { KafkaTopics } from '../../common/contracts/topics';
import { BookingRequestedPayload } from '../../common/contracts/payloads';
import { buildEvent } from '../../common/kafka/domain-event';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';

export interface AcceptBookingInput {
  eventId: string;
  seatId: string;
  userId: string;
  idempotencyKey: string;
}

@Injectable()
export class BookingAcceptanceService {
  constructor(
    private readonly producer: KafkaProducerService,
    private readonly cache: BookingStatusCache,
  ) {}

  async accept(input: AcceptBookingInput): Promise<AcceptedBookingView> {
    const bookingId = randomUUID();
    const requestedAt = new Date().toISOString();
    const accepted: AcceptedBookingView = {
      bookingId,
      status: 'ACCEPTED',
      pollUrl: `/api/v1/bookings/${bookingId}`,
    };

    const cached = await this.cache.getAccepted(input.idempotencyKey);
    if (cached) {
      return cached;
    }

    const claim = await this.cache.claimAccepted(input.idempotencyKey, accepted);
    if (claim === 'EXISTS') {
      const winner = await this.cache.getAccepted(input.idempotencyKey);
      if (winner) {
        return winner;
      }
    }

    const event = buildEvent<BookingRequestedPayload>(KafkaTopics.BOOKING_REQUESTED, input.seatId, {
      bookingId,
      eventId: input.eventId,
      seatId: input.seatId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestedAt,
    });

    try {
      await this.producer.publish(KafkaTopics.BOOKING_REQUESTED, event, input.seatId);
    } catch (error) {
      await this.cache.releaseAccepted(input.idempotencyKey);
      throw error;
    }

    await this.cache.setStatus({
      bookingId,
      status: 'ACCEPTED',
      eventId: input.eventId,
      seatId: input.seatId,
      userId: input.userId,
      updatedAt: requestedAt,
    });
    return accepted;
  }
}
