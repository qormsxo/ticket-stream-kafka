import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { TransactionService } from '../../common/database/transaction.service';
import { InboxService } from '../../common/inbox/inbox.service';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { BookingStatus, EventStatus } from '../../common/contracts/statuses';
import { BookingRequestedPayload } from '../../common/contracts/payloads';
import { DomainEvent, buildEvent } from '../../common/kafka/domain-event';
import { BookingEntity } from '../../database/entities/booking.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { SeatEntity } from '../../database/entities/seat.entity';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class BookingIntakeService {
  constructor(
    private readonly transactions: TransactionService,
    private readonly inbox: InboxService,
    private readonly outbox: OutboxService,
    private readonly cache: BookingStatusCache,
  ) {}

  async intake(event: DomainEvent<BookingRequestedPayload>): Promise<void> {
    const payload = event.payload;

    await this.transactions.run(async (manager) => {
      const claimed = await this.inbox.claim(manager, ConsumerGroups.BOOKING, event.eventId);
      if (!claimed) {
        return;
      }

      const duplicated = await manager.findOne(BookingEntity, {
        where: { idempotencyKey: payload.idempotencyKey },
      });
      if (duplicated) {
        return;
      }

      const show = await manager.findOne(EventEntity, { where: { id: payload.eventId } });
      const seat = await manager.findOne(SeatEntity, { where: { id: payload.seatId } });
      const seatMatches = Boolean(seat && seat.eventId === payload.eventId);
      const eventOpen = show?.status === EventStatus.OPEN;
      const now = new Date();

      if (!eventOpen || !seatMatches || !seat) {
        await this.insertBooking(manager, payload, seat?.priceAmount ?? 0, BookingStatus.REJECTED, 'EVENT_OR_SEAT_NOT_FOUND', now);
        await this.outbox.enqueue(manager, {
          aggregateType: 'Booking',
          aggregateId: payload.seatId,
          event: buildEvent(KafkaTopics.SEAT_HOLD_FAILED, payload.seatId, {
            bookingId: payload.bookingId,
            eventId: payload.eventId,
            seatId: payload.seatId,
            userId: payload.userId,
            reason: 'EVENT_OR_SEAT_NOT_FOUND',
          }),
        });
        return;
      }

      await this.insertBooking(manager, payload, seat.priceAmount, BookingStatus.REQUESTED, null, now);

      await this.outbox.enqueue(manager, {
        aggregateType: 'Booking',
        aggregateId: payload.seatId,
        event: buildEvent(KafkaTopics.SEAT_HOLD_REQUESTED, payload.seatId, {
          bookingId: payload.bookingId,
          eventId: payload.eventId,
          seatId: payload.seatId,
          userId: payload.userId,
          amount: seat.priceAmount,
        }),
      });
    });

    await this.cache.syncFromDatabase(payload.bookingId);
  }

  private async insertBooking(
    manager: EntityManager,
    payload: BookingRequestedPayload,
    amount: number,
    status: BookingStatus,
    failureReason: string | null,
    now: Date,
  ): Promise<void> {
    await manager.insert(BookingEntity, {
      id: payload.bookingId,
      eventId: payload.eventId,
      seatId: payload.seatId,
      userId: payload.userId,
      idempotencyKey: payload.idempotencyKey,
      status,
      amount,
      failureReason,
      createdAt: now,
      updatedAt: now,
    });
  }
}
