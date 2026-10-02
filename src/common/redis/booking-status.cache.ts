import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AcceptedBookingView, BookingStatusView, toBookingView } from '../booking/booking-status.view';
import { BookingEntity } from '../../database/entities/booking.entity';
import { RedisService } from './redis.service';

const DAY_SECONDS = 60 * 60 * 24;

@Injectable()
export class BookingStatusCache {
  private readonly logger = new Logger(BookingStatusCache.name);

  constructor(
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  async getAccepted(idempotencyKey: string): Promise<AcceptedBookingView | null> {
    return this.read(`idem:booking:${idempotencyKey}`);
  }

  async claimAccepted(
    idempotencyKey: string,
    view: AcceptedBookingView,
  ): Promise<'CREATED' | 'EXISTS'> {
    try {
      const result = await this.redis.primary.set(
        `idem:booking:${idempotencyKey}`,
        JSON.stringify(view),
        'EX',
        DAY_SECONDS,
        'NX',
      );
      return result === 'OK' ? 'CREATED' : 'EXISTS';
    } catch (error) {
      this.logger.warn(`멱등 키 선점 실패: ${idempotencyKey}`);
      return 'CREATED';
    }
  }

  async releaseAccepted(idempotencyKey: string): Promise<void> {
    try {
      await this.redis.primary.del(`idem:booking:${idempotencyKey}`);
    } catch (error) {
      this.logger.warn(`멱등 키 해제 실패: ${idempotencyKey}`);
    }
  }

  async getStatus(bookingId: string): Promise<BookingStatusView | null> {
    return this.read(`booking:status:${bookingId}`);
  }

  async setStatus(view: BookingStatusView): Promise<void> {
    await this.write(`booking:status:${view.bookingId}`, view);
  }

  async syncFromDatabase(bookingId: string): Promise<void> {
    const booking = await this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      return;
    }
    await this.setStatus(toBookingView(booking));
  }

  private async read<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.primary.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      this.logger.warn(`상태 캐시 조회 실패: ${key}`);
      return null;
    }
  }

  private async write(key: string, value: unknown): Promise<void> {
    try {
      await this.redis.primary.set(key, JSON.stringify(value), 'EX', DAY_SECONDS);
    } catch (error) {
      this.logger.warn(`상태 캐시 저장 실패: ${key}`);
    }
  }
}
