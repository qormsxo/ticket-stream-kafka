import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxService } from '../common/inbox/inbox.service';
import { TransactionService } from '../common/database/transaction.service';
import { AppConfigService } from '../config/app-config.service';
import { BookingEntity } from './entities/booking.entity';
import { EventEntity } from './entities/event.entity';
import { InboxEntity } from './entities/inbox.entity';
import { NotificationEntity } from './entities/notification.entity';
import { OutboxEntity } from './entities/outbox.entity';
import { PaymentEntity } from './entities/payment.entity';
import { SeatEntity } from './entities/seat.entity';
import { SchemaReadyService } from './schema-ready.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres' as const,
        host: config.dbHost,
        port: config.dbPort,
        username: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        entities: [
          EventEntity,
          SeatEntity,
          BookingEntity,
          PaymentEntity,
          OutboxEntity,
          InboxEntity,
          NotificationEntity,
        ],
        synchronize: config.dbSynchronize,
        logging: config.dbLogging,
        retryAttempts: 20,
        retryDelay: 2_000,
      }),
    }),
  ],
  providers: [TransactionService, InboxService, SchemaReadyService],
  exports: [TypeOrmModule, TransactionService, InboxService],
})
export class DatabaseModule {}
