import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { RedisService } from './redis.service';
import { RedisRedlock } from './redis-redlock';

@Injectable()
export class RedlockService implements OnModuleInit {
  private redlock!: RedisRedlock;

  constructor(
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    this.redlock = new RedisRedlock(this.redis.clients, {
      retryCount: this.config.redlockRetryCount,
      retryDelayMs: this.config.redlockRetryDelayMs,
      driftFactor: 0.01,
    });
  }

  using<T>(resource: string, task: () => Promise<T>): Promise<T> {
    return this.redlock.using(resource, this.config.redlockTtlMs, task);
  }
}
