import { Module } from '@nestjs/common';
import { KafkaModule } from './common/kafka/kafka.module';
import { RedisModule } from './common/redis/redis.module';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { BookingApiModule } from './modules/booking/booking-api.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    KafkaModule,
    HealthModule,
    CatalogModule,
    BookingApiModule,
  ],
})
export class AppModule {}
