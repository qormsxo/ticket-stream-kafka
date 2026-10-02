import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'PostgreSQL, Redis 쿼럼, Kafka producer 연결 상태' })
  async check(@Res({ passthrough: true }) response: Response) {
    const body = await this.health.snapshot();
    response.status(body.status === 'ok' ? 200 : 503);
    return body;
  }
}
