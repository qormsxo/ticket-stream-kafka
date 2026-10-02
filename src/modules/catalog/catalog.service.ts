import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventStatus, SeatStatus } from '../../common/contracts/statuses';
import { AppConfigService } from '../../config/app-config.service';
import { EventEntity } from '../../database/entities/event.entity';
import { SeatEntity } from '../../database/entities/seat.entity';
import { demoEventId, demoSeatId } from './fixture-ids';

export interface EventFixture {
  eventId: string;
  name: string;
  seatIds: string[];
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(EventEntity) private readonly events: Repository<EventEntity>,
    @InjectRepository(SeatEntity) private readonly seats: Repository<SeatEntity>,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.seedOnBoot) {
      return;
    }
    const fixture = await this.seedDemo();
    this.logger.log(`데모 공연 준비 event=${fixture.eventId} seats=${fixture.seatIds.length}`);
  }

  async seedDemo(): Promise<EventFixture> {
    const eventId = demoEventId();
    const existing = await this.events.findOne({ where: { id: eventId } });
    // 고정 UUID라 재기동해도 같은 공연을 씀. 이미 있으면 좌석을 다시 만들지 않음
    if (!existing) {
      await this.events.insert({
        id: eventId,
        name: 'High Concurrency Live',
        venue: 'Seoul Arena',
        startsAt: new Date('2026-12-01T10:00:00.000Z'),
        status: EventStatus.OPEN,
        createdAt: new Date(),
      });

      const count = Math.max(1, Math.min(this.config.seedSeatCount, 500));
      const rows = Array.from({ length: count }, (_, index) => {
        const number = index + 1;
        return {
          id: demoSeatId(number),
          eventId,
          section: 'A',
          rowLabel: String(Math.ceil(number / 10)),
          seatNumber: ((number - 1) % 10) + 1,
          priceAmount: 99_000,
          status: SeatStatus.AVAILABLE,
          holdBookingId: null,
          holdExpiresAt: null,
          version: 0,
          updatedAt: new Date(),
        };
      });
      await this.seats.insert(rows);
    }

    return this.fixture();
  }

  async listEvents(): Promise<EventEntity[]> {
    return this.events.find({ order: { startsAt: 'ASC' } });
  }

  async getEvent(eventId: string): Promise<EventEntity> {
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('공연을 찾을 수 없습니다.');
    }
    return event;
  }

  async listSeats(eventId: string): Promise<SeatEntity[]> {
    await this.getEvent(eventId);
    return this.seats.find({
      where: { eventId },
      order: { rowLabel: 'ASC', seatNumber: 'ASC' },
    });
  }

  async stats(eventId: string): Promise<{
    eventId: string;
    seats: Record<SeatStatus, number>;
  }> {
    await this.getEvent(eventId);
    const rows = await this.seats
      .createQueryBuilder('seat')
      .select('seat.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('seat.event_id = :eventId', { eventId })
      .groupBy('seat.status')
      .getRawMany<{ status: SeatStatus; count: string }>();

    const seats: Record<SeatStatus, number> = {
      [SeatStatus.AVAILABLE]: 0,
      [SeatStatus.HELD]: 0,
      [SeatStatus.SOLD]: 0,
    };
    for (const row of rows) {
      seats[row.status] = Number(row.count);
    }
    return { eventId, seats };
  }

  async fixture(): Promise<EventFixture> {
    const eventId = demoEventId();
    const event = await this.getEvent(eventId);
    const seats = await this.listSeats(eventId);
    return {
      eventId,
      name: event.name,
      seatIds: seats.map((seat) => seat.id),
    };
  }
}
