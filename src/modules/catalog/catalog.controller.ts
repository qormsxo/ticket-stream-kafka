import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('events')
  @ApiOperation({ summary: '공연 목록' })
  listEvents() {
    return this.catalog.listEvents();
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: '공연 상세' })
  getEvent(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.catalog.getEvent(eventId);
  }

  @Get('events/:eventId/seats')
  @ApiOperation({ summary: '좌석과 현재 점유 상태' })
  listSeats(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.catalog.listSeats(eventId);
  }

  @Get('events/:eventId/stats')
  @ApiOperation({ summary: '좌석 상태 집계. 부하 테스트 후 초과 판매 여부를 확인한다' })
  stats(@Param('eventId', new ParseUUIDPipe()) eventId: string) {
    return this.catalog.stats(eventId);
  }

  @Get('dev/fixture')
  @ApiOperation({ summary: 'k6가 사용할 데모 공연과 좌석 ID' })
  fixture() {
    return this.catalog.fixture();
  }
}
