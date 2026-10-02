import { Global, Module } from '@nestjs/common';
import { BookingStatusCache } from './booking-status.cache';
import { RedisService } from './redis.service';
import { RedlockService } from './redlock.service';

@Global()
@Module({
  providers: [RedisService, RedlockService, BookingStatusCache],
  exports: [RedisService, RedlockService, BookingStatusCache],
})
export class RedisModule {}
