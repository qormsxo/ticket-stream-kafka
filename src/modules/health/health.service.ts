import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KafkaProducerService } from '../../common/kafka/kafka-producer.service';
import { RedisService } from '../../common/redis/redis.service';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly producer: KafkaProducerService,
    private readonly config: AppConfigService,
  ) {}

  async snapshot(): Promise<{
    status: 'ok' | 'degraded';
    role: string;
    database: boolean;
    redis: boolean;
    kafka: boolean;
  }> {
    const [database, redis] = await Promise.all([this.pingDatabase(), this.redis.ping()]);
    const kafka = this.producer.isConnected();
    return {
      status: database && redis && kafka ? 'ok' : 'degraded',
      role: this.config.role,
      database,
      redis,
      kafka,
    };
  }

  private async pingDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
