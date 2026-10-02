import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BookingStatusView } from '../../common/booking/booking-status.view';
import { KafkaTopics } from '../../common/contracts/topics';
import { BookingQueryService } from './booking-query.service';

@Controller()
export class BookingStatusMessageController {
  constructor(private readonly query: BookingQueryService) {}

  @MessagePattern(KafkaTopics.BOOKING_STATUS)
  getStatus(@Payload() data: { bookingId?: string }): Promise<BookingStatusView | null> {
    if (!data?.bookingId) {
      return Promise.resolve(null);
    }
    return this.query.getView(data.bookingId);
  }
}
