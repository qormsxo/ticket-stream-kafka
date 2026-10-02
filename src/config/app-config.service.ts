import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnv } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get nodeEnv(): string {
    return this.config.get('nodeEnv', { infer: true });
  }

  get role(): string {
    return this.config.get('role', { infer: true });
  }

  get httpPort(): number {
    return this.config.get('httpPort', { infer: true });
  }

  get workerPort(): number {
    return this.config.get('workerPort', { infer: true });
  }

  get dbHost(): string {
    return this.config.get('dbHost', { infer: true });
  }

  get dbPort(): number {
    return this.config.get('dbPort', { infer: true });
  }

  get dbUser(): string {
    return this.config.get('dbUser', { infer: true });
  }

  get dbPassword(): string {
    return this.config.get('dbPassword', { infer: true });
  }

  get dbName(): string {
    return this.config.get('dbName', { infer: true });
  }

  get dbSynchronize(): boolean {
    return this.config.get('dbSynchronize', { infer: true });
  }

  get dbLogging(): boolean {
    return this.config.get('dbLogging', { infer: true });
  }

  get redisUrls(): string[] {
    return this.config.get('redisUrls', { infer: true });
  }

  get kafkaBrokers(): string[] {
    return this.config.get('kafkaBrokers', { infer: true });
  }

  get kafkaClientId(): string {
    return this.config.get('kafkaClientId', { infer: true });
  }

  get seatHoldTtlMs(): number {
    return this.config.get('seatHoldTtlMs', { infer: true });
  }

  get redlockTtlMs(): number {
    return this.config.get('redlockTtlMs', { infer: true });
  }

  get redlockRetryCount(): number {
    return this.config.get('redlockRetryCount', { infer: true });
  }

  get redlockRetryDelayMs(): number {
    return this.config.get('redlockRetryDelayMs', { infer: true });
  }

  get lockTimeoutMs(): number {
    return this.config.get('lockTimeoutMs', { infer: true });
  }

  get paymentProvider(): string {
    return this.config.get('paymentProvider', { infer: true });
  }

  get fakePaymentMode(): AppEnv['fakePaymentMode'] {
    return this.config.get('fakePaymentMode', { infer: true });
  }

  get fakePaymentDelayMs(): number {
    return this.config.get('fakePaymentDelayMs', { infer: true });
  }

  get fakePaymentFailRate(): number {
    return this.config.get('fakePaymentFailRate', { infer: true });
  }

  get seedOnBoot(): boolean {
    return this.config.get('seedOnBoot', { infer: true });
  }

  get seedSeatCount(): number {
    return this.config.get('seedSeatCount', { infer: true });
  }

  get outboxPollMs(): number {
    return this.config.get('outboxPollMs', { infer: true });
  }

  get outboxBatchSize(): number {
    return this.config.get('outboxBatchSize', { infer: true });
  }

  get outboxStuckSeconds(): number {
    return this.config.get('outboxStuckSeconds', { infer: true });
  }

  get holdSweepMs(): number {
    return this.config.get('holdSweepMs', { infer: true });
  }
}
