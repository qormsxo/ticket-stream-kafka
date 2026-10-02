import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { AppConfigService } from '../../config/app-config.service';
import { DomainEvent } from './domain-event';
import { sleep } from '../utils/sleep';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer!: Producer;
  private connected = false;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    const kafka = new Kafka({
      clientId: `${this.config.kafkaClientId}-producer`,
      brokers: this.config.kafkaBrokers,
      connectionTimeout: 10_000,
      requestTimeout: 30_000,
      logLevel: logLevel.NOTHING,
    });

    this.producer = kafka.producer({
      // 같은 키의 재전송이 브로커에서 중복 저장되지 않게 함
      idempotent: true,
      allowAutoTopicCreation: true,
    });
    await this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish<T>(topic: string, event: DomainEvent<T>, key: string): Promise<void> {
    // acks -1. key가 같으면 같은 파티션으로 가 순서를 유지함
    await this.producer.send({
      topic,
      acks: -1,
      messages: [
        {
          key,
          value: JSON.stringify(event),
          headers: {
            'event-id': event.eventId,
            'event-type': event.eventType,
          },
        },
      ],
    });
  }

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        await this.producer.connect();
        this.connected = true;
        this.logger.log(`Kafka producer 연결 완료 (${this.config.kafkaBrokers.join(',')})`);
        return;
      } catch (error) {
        this.logger.warn(`Kafka producer 연결 재시도 ${attempt}/10`);
        await sleep(1_500);
      }
    }
    throw new Error('Kafka producer 연결에 실패했습니다.');
  }
}
