import { Logger, Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { sleep } from '../common/utils/sleep';

@Injectable()
export class SchemaReadyService implements OnModuleInit {
  private readonly logger = new Logger(SchemaReadyService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    // 게이트웨이가 bookings 테이블을 만들 때까지 워커 기동을 미룸
    for (let attempt = 1; attempt <= 90; attempt += 1) {
      const rows: Array<{ name: string | null }> = await this.dataSource.query(
        `SELECT to_regclass('public.bookings') AS name`,
      );
      if (rows[0]?.name) {
        return;
      }
      this.logger.log(`스키마 대기 ${attempt}/90`);
      await sleep(1_000);
    }
    throw new Error('bookings 테이블이 준비되지 않았습니다. 게이트웨이를 먼저 기동하세요.');
  }
}
