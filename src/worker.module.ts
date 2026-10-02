import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { KafkaModule } from './common/kafka/kafka.module';
import { RedisModule } from './common/redis/redis.module';
import { WorkerRole } from './common/contracts/topics';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { BookingWorkerModule } from './modules/booking/booking-worker.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { OutboxRelayService } from './modules/outbox/outbox-relay.service';
import { PaymentModule } from './modules/payment/payment.module';
import { SeatModule } from './modules/seat/seat.module';

@Module({})
export class WorkerRootModule {
  static register(role: WorkerRole): DynamicModule {
    const imports: Array<Type | DynamicModule> = [
      AppConfigModule,
      DatabaseModule,
      RedisModule,
      KafkaModule,
      HealthModule,
      OutboxModule,
    ];
    const providers: Provider[] = [];

    if (role === 'booking') {
      imports.push(BookingWorkerModule);
    } else if (role === 'seat') {
      imports.push(SeatModule);
    } else if (role === 'payment') {
      imports.push(PaymentModule);
    } else if (role === 'notification') {
      imports.push(NotificationModule);
    } else {
      providers.push(OutboxRelayService);
    }

    return {
      module: WorkerRootModule,
      imports,
      providers,
    };
  }
}
