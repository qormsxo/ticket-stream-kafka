import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { RedlockService } from '../../common/redis/redlock.service';
import { TransactionService } from '../../common/database/transaction.service';
import { InboxService } from '../../common/inbox/inbox.service';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { BookingStatus } from '../../common/contracts/statuses';
import { SeatHoldRequestedPayload } from '../../common/contracts/payloads';
import { DomainEvent, buildEvent } from '../../common/kafka/domain-event';
import { RetryableError } from '../../common/errors';
import { AppConfigService } from '../../config/app-config.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { SeatEntity } from '../../database/entities/seat.entity';
import { OutboxService } from '../outbox/outbox.service';
import { SeatTransition, toSeatSnapshot } from './domain/seat-transition';
import { applySeatSnapshot } from './seat-writer';

@Injectable()
export class SeatOccupancyService {
  private readonly logger = new Logger(SeatOccupancyService.name);

  constructor(
    private readonly redlock: RedlockService,
    private readonly transactions: TransactionService,
    private readonly inbox: InboxService,
    private readonly outbox: OutboxService,
    private readonly cache: BookingStatusCache,
    private readonly config: AppConfigService,
  ) {}

  async hold(event: DomainEvent<SeatHoldRequestedPayload>): Promise<void> {
    const { seatId, bookingId } = event.payload;

    await this.redlock.using(`lock:seat:${seatId}`, async () => {
      await this.transactions.run(async (manager) => {
        const claimed = await this.inbox.claim(manager, ConsumerGroups.SEAT, event.eventId);
        if (!claimed) {
          return;
        }

        const seat = await manager.findOne(SeatEntity, {
          where: { id: seatId },
          lock: { mode: 'pessimistic_write' },
        });
        const booking = await manager.findOne(BookingEntity, {
          where: { id: bookingId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!booking) {
          throw new RetryableError('예매 원장이 아직 보이지 않습니다.');
        }

        if (!seat || seat.eventId !== event.payload.eventId) {
          await this.reject(manager, event, 'NOT_FOUND');
          return;
        }

        const decision = SeatTransition.hold(
          toSeatSnapshot(seat),
          bookingId,
          new Date(),
          this.config.seatHoldTtlMs,
        );
        if (!decision.ok) {
          await this.reject(manager, event, decision.reason);
          return;
        }

        await applySeatSnapshot(manager, seat, decision.seat);
        await manager.update(
          BookingEntity,
          { id: bookingId },
          { status: BookingStatus.SEAT_HELD, failureReason: null },
        );
        await this.outbox.enqueue(manager, {
          aggregateType: 'Seat',
          aggregateId: seatId,
          event: buildEvent(KafkaTopics.SEAT_HELD, seatId, {
            bookingId,
            eventId: event.payload.eventId,
            seatId,
            userId: event.payload.userId,
            amount: booking.amount,
            holdExpiresAt: decision.seat.holdExpiresAt!.toISOString(),
          }),
        });
      });
    });

    await this.cache.syncFromDatabase(bookingId);
  }

  private async reject(
    manager: EntityManager,
    event: DomainEvent<SeatHoldRequestedPayload>,
    reason: string,
  ): Promise<void> {
    const { bookingId, eventId, seatId, userId } = event.payload;
    await manager.update(
      BookingEntity,
      { id: bookingId },
      { status: BookingStatus.REJECTED, failureReason: reason },
    );
    await this.outbox.enqueue(manager, {
      aggregateType: 'Booking',
      aggregateId: seatId,
      event: buildEvent(KafkaTopics.SEAT_HOLD_FAILED, seatId, {
        bookingId,
        eventId,
        seatId,
        userId,
        reason,
      }),
    });
    this.logger.log(`좌석 점유 거절 booking=${bookingId} reason=${reason}`);
  }
}
