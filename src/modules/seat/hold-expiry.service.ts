import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { RedlockService } from '../../common/redis/redlock.service';
import { TransactionService } from '../../common/database/transaction.service';
import { KafkaTopics } from '../../common/contracts/topics';
import { BookingStatus, SeatStatus } from '../../common/contracts/statuses';
import { buildEvent } from '../../common/kafka/domain-event';
import { AppConfigService } from '../../config/app-config.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { SeatEntity } from '../../database/entities/seat.entity';
import { OutboxService } from '../outbox/outbox.service';
import { SeatTransition, toSeatSnapshot } from './domain/seat-transition';
import { applySeatSnapshot } from './seat-writer';

@Injectable()
export class HoldExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HoldExpiryService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly redlock: RedlockService,
    private readonly transactions: TransactionService,
    private readonly outbox: OutboxService,
    private readonly cache: BookingStatusCache,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (this.config.role !== 'seat') {
      return;
    }
    this.timer = setInterval(() => {
      void this.releaseExpired().catch((error: Error) => {
        this.logger.warn(`선점 만료 정리 실패: ${error.message}`);
      });
    }, this.config.holdSweepMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async releaseExpired(now = new Date()): Promise<number> {
    const seats = await this.transactions.run((manager) =>
      manager.find(SeatEntity, {
        where: {
          status: SeatStatus.HELD,
          holdExpiresAt: LessThan(now),
        },
        take: 50,
      }),
    );

    let released = 0;
    for (const candidate of seats) {
      const bookingId = candidate.holdBookingId;
      if (!bookingId) {
        continue;
      }

      // 조회와 잠금 사이에 결제가 끝날 수 있어, 잠금 아래서 만료 여부를 다시 확인함
      const didRelease = await this.redlock.using(`lock:seat:${candidate.id}`, async () => {
        return this.transactions.run(async (manager) => {
          const seat = await manager.findOne(SeatEntity, {
            where: { id: candidate.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            !seat ||
            seat.status !== SeatStatus.HELD ||
            seat.holdBookingId !== bookingId ||
            !seat.holdExpiresAt ||
            seat.holdExpiresAt.getTime() > now.getTime()
          ) {
            return false;
          }

          const booking = await manager.findOne(BookingEntity, {
            where: { id: bookingId },
            lock: { mode: 'pessimistic_write' },
          });
          const decision = SeatTransition.release(toSeatSnapshot(seat), bookingId);
          if (!decision.ok) {
            return false;
          }

          // 여기서 선점을 풀고 예매를 HOLD_EXPIRED로 수정함
          await applySeatSnapshot(manager, seat, decision.seat);
          await manager.update(
            BookingEntity,
            { id: bookingId, status: BookingStatus.SEAT_HELD },
            { status: BookingStatus.FAILED, failureReason: 'HOLD_EXPIRED' },
          );
          await this.outbox.enqueue(manager, {
            aggregateType: 'Seat',
            aggregateId: seat.id,
            event: buildEvent(KafkaTopics.SEAT_HOLD_FAILED, seat.id, {
              bookingId,
              eventId: seat.eventId,
              seatId: seat.id,
              userId: booking?.userId ?? 'unknown',
              reason: 'HOLD_EXPIRED',
            }),
          });
          return true;
        });
      });

      if (didRelease) {
        released += 1;
        await this.cache.syncFromDatabase(bookingId);
      }
    }

    return released;
  }
}
