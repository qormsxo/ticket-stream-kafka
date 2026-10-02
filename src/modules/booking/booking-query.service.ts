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
    if (booking) {
      return toBookingView(booking);
    }
    return this.cache.getStatus(bookingId);
  }
}
