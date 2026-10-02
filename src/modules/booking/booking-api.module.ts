import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConsumerGroups } from '../../common/contracts/topics';
import { AppConfigModule } from '../../config/app-config.module';
import { AppConfigService } from '../../config/app-config.service';
import { OutboxModule } from '../outbox/outbox.module';
import { BookingAcceptanceService } from './booking-acceptance.service';
import { BookingController } from './booking.controller';
import { BookingQueryService } from './booking-query.service';
import { BookingStatusClient, KAFKA_RPC_CLIENT } from './booking-status.client';

@Module({
  imports: [
    OutboxModule,
    ClientsModule.registerAsync([
      {
        name: KAFKA_RPC_CLIENT,
        imports: [AppConfigModule],
        inject: [AppConfigService],
        useFactory: (config: AppConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: `${config.kafkaClientId}-rpc`,
              brokers: config.kafkaBrokers,
            },
            consumer: {
              groupId: ConsumerGroups.GATEWAY_RPC,
              allowAutoTopicCreation: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [BookingController],
  providers: [BookingAcceptanceService, BookingQueryService, BookingStatusClient],
})
export class BookingApiModule {}
