import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly clients: Redis[];

  constructor(config: AppConfigService) {
    this.clients = config.redisUrls.map(
      (url) =>
        new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        }),
    );
    this.clients.forEach((client, index) => {
      client.on('error', (error: Error) => {
        this.logger.warn(`Redis 노드 ${index + 1} 오류: ${error.message}`);
      });
    });
  }

  get primary(): Redis {
    return this.clients[0];
  }

  async ping(): Promise<boolean> {
    const replies = await Promise.all(
      this.clients.map(async (client) => {
        try {
          return await client.ping();
        } catch {
          return 'FAIL';
        }
      }),
    );
    const quorum = Math.floor(this.clients.length / 2) + 1;
    return replies.filter((reply) => reply === 'PONG').length >= quorum;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.clients.map((client) => client.quit().catch(() => undefined)));
  }
}
