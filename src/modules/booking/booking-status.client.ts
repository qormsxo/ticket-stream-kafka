import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { BookingStatusView } from '../../common/booking/booking-status.view';
import { KafkaTopics } from '../../common/contracts/topics';
import { sleep } from '../../common/utils/sleep';

export const KAFKA_RPC_CLIENT = 'KAFKA_RPC_CLIENT';

@Injectable()
export class BookingStatusClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(KAFKA_RPC_CLIENT) private readonly client: ClientKafka) {}

  async onModuleInit(): Promise<void> {
    // 응답 토픽 구독은 connect보다 먼저 해야 request-response가 동작함
    this.client.subscribeToResponseOf(KafkaTopics.BOOKING_STATUS);
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        await this.client.connect();
        return;
      } catch {
        await sleep(1_500);
      }
    }
    throw new Error('Kafka RPC 클라이언트 연결에 실패했습니다.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  getStatus(bookingId: string): Promise<BookingStatusView | null> {
    return firstValueFrom(
      this.client
        .send<BookingStatusView | null>(KafkaTopics.BOOKING_STATUS, { bookingId })
        .pipe(timeout(4_000)),
    );
  }
}
