import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { BookingConsumer } from './booking.consumer';
import { BookingIntakeService } from './booking-intake.service';
import { BookingQueryService } from './booking-query.service';
import { BookingStatusMessageController } from './booking-status.message-controller';

@Module({
  imports: [OutboxModule],
  controllers: [BookingConsumer, BookingStatusMessageController],
  providers: [BookingIntakeService, BookingQueryService],
})
export class BookingWorkerModule {}
