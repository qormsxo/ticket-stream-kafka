import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { BookingStatusView, toBookingView } from '../../common/booking/booking-status.view';
import { BookingEntity } from '../../database/entities/booking.entity';

@Injectable()
export class BookingQueryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cache: BookingStatusCache,
  ) {}

  async getView(bookingId: string): Promise<BookingStatusView | null> {
    const booking = await this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
    });
    // 원장이 생기면 DB를 우선함. 접수 직후 행이 없을 때만 Redis의 ACCEPTED를 봄
    if (booking) {
      return toBookingView(booking);
    }
    return this.cache.getStatus(bookingId);
  }
}
