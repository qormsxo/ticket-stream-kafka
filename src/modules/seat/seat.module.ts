import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { HoldExpiryService } from './hold-expiry.service';
import { SeatConsumer } from './seat.consumer';
import { SeatOccupancyService } from './seat-occupancy.service';

@Module({
  imports: [OutboxModule],
  controllers: [SeatConsumer],
  providers: [SeatOccupancyService, HoldExpiryService],
})
export class SeatModule {}
