import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AppConfigService } from '../../config/app-config.service';
import { RetryableError, isRetryableDbError } from '../errors';

@Injectable()
export class TransactionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: AppConfigService,
  ) {}

  async run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // 이 트랜잭션 안에서만 lock_timeout을 걸음. 대기가 길면 재시도함
        await manager.query(`SELECT set_config('lock_timeout', $1, true)`, [
          `${this.config.lockTimeoutMs}ms`,
        ]);
        return work(manager);
      });
    } catch (error) {
      if (error instanceof RetryableError) {
        throw error;
      }
      if (isRetryableDbError(error)) {
        throw new RetryableError('데이터베이스 락 충돌', { cause: error });
      }
      throw error;
    }
  }
}
