import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingAcceptanceService } from './booking-acceptance.service';
import { BookingQueryService } from './booking-query.service';
import { BookingStatusClient } from './booking-status.client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { IdempotencyKey } from './idempotency-key.decorator';

@ApiTags('bookings')
@Controller('bookings')
export class BookingController {
  constructor(
    private readonly acceptance: BookingAcceptanceService,
    private readonly query: BookingQueryService,
    private readonly rpc: BookingStatusClient,
  ) {}

  @Post()
  @HttpCode(202)
  @ApiOperation({ summary: '예매 요청을 Kafka 버퍼에 접수한다' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  accept(@Body() body: CreateBookingDto, @IdempotencyKey() idempotencyKey: string) {
    return this.acceptance.accept({ ...body, idempotencyKey });
  }

  @Get(':bookingId')
  @ApiOperation({ summary: '예매 상태를 조회한다. 원장보다 접수 직후 캐시를 먼저 볼 수 있다' })
  @ApiOkResponse({ description: '접수, 선점, 확정, 거절 중 하나의 상태' })
  async getStatus(@Param('bookingId', new ParseUUIDPipe()) bookingId: string) {
    const view = await this.query.getView(bookingId);
    if (!view) {
      throw new NotFoundException('예매를 찾을 수 없습니다.');
    }
    return view;
  }

  @Get(':bookingId/rpc')
  @ApiOperation({ summary: 'Kafka request-response로 예매 상태를 조회한다' })
  async getStatusViaRpc(@Param('bookingId', new ParseUUIDPipe()) bookingId: string) {
    try {
      const view = await this.rpc.getStatus(bookingId);
      if (!view) {
        throw new NotFoundException('예매를 찾을 수 없습니다.');
      }
      return view;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Kafka RPC 응답이 없습니다. booking 워커 기동 상태를 확인하세요.',
      );
    }
  }
}
