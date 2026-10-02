import { BookingStatus, SeatStatus } from '../src/common/contracts/statuses';
import { KafkaTopics } from '../src/common/contracts/topics';
import { buildEvent } from '../src/common/kafka/domain-event';
import { BookingStatusCache } from '../src/common/redis/booking-status.cache';
import { RedlockService } from '../src/common/redis/redlock.service';
import { TransactionService } from '../src/common/database/transaction.service';
import { InboxService } from '../src/common/inbox/inbox.service';
import { AppConfigService } from '../src/config/app-config.service';
import { BookingEntity } from '../src/database/entities/booking.entity';
import { SeatEntity } from '../src/database/entities/seat.entity';
import { OutboxService } from '../src/modules/outbox/outbox.service';
import { SeatOccupancyService } from '../src/modules/seat/seat-occupancy.service';

describe('SeatOccupancyService', () => {
  const event = buildEvent(KafkaTopics.SEAT_HOLD_REQUESTED, 'seat-1', {
    bookingId: 'booking-1',
    eventId: 'event-1',
    seatId: 'seat-1',
    userId: 'user-1',
    amount: 99000,
  });

  function create(options: {
    seat: Partial<SeatEntity> | null;
    claimed?: boolean;
  }) {
    const manager = {
      findOne: jest.fn(async (entity: { name: string }) => {
        if (entity.name === SeatEntity.name) {
          return options.seat;
        }
        if (entity.name === BookingEntity.name) {
          return {
            id: 'booking-1',
            amount: 99000,
            status: BookingStatus.REQUESTED,
          };
        }
        return null;
      }),
      update: jest.fn(async () => ({ affected: 1 })),
    };
    const outbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = new SeatOccupancyService(
      {
        using: async <T>(_resource: string, task: () => Promise<T>) => task(),
      } as unknown as RedlockService,
      {
        run: async <T>(work: (current: typeof manager) => Promise<T>) => work(manager),
      } as unknown as TransactionService,
      {
        claim: jest.fn().mockResolvedValue(options.claimed ?? true),
      } as unknown as InboxService,
      outbox as unknown as OutboxService,
      { syncFromDatabase: jest.fn().mockResolvedValue(undefined) } as unknown as BookingStatusCache,
      { seatHoldTtlMs: 180_000 } as AppConfigService,
    );
    return { service, manager, outbox };
  }

  it('가용 좌석을 잠그고 선점 이벤트를 아웃박스에 남긴다', async () => {
    const { service, outbox, manager } = create({
      seat: {
        id: 'seat-1',
        eventId: 'event-1',
        status: SeatStatus.AVAILABLE,
        holdBookingId: null,
        holdExpiresAt: null,
        version: 0,
      },
    });

    await service.hold(event);

    expect(manager.update).toHaveBeenCalledWith(
      SeatEntity,
      { id: 'seat-1', version: 0 },
      expect.objectContaining({ status: SeatStatus.HELD, holdBookingId: 'booking-1', version: 1 }),
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event: expect.objectContaining({ eventType: KafkaTopics.SEAT_HELD }),
      }),
    );
  });

  it('이미 선점된 좌석은 거절 이벤트로 남기고 상태를 덮어쓰지 않는다', async () => {
    const { service, outbox, manager } = create({
      seat: {
        id: 'seat-1',
        eventId: 'event-1',
        status: SeatStatus.HELD,
        holdBookingId: 'other-booking',
        holdExpiresAt: new Date(Date.now() + 60_000),
        version: 2,
      },
    });

    await service.hold(event);

    expect(manager.update).toHaveBeenCalledWith(
      BookingEntity,
      { id: 'booking-1' },
      { status: BookingStatus.REJECTED, failureReason: 'UNAVAILABLE' },
    );
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        event: expect.objectContaining({ eventType: KafkaTopics.SEAT_HOLD_FAILED }),
      }),
    );
    expect(manager.update).not.toHaveBeenCalledWith(
      SeatEntity,
      expect.anything(),
      expect.anything(),
    );
  });

  it('이미 처리한 메시지이면 좌석을 다시 건드리지 않는다', async () => {
    const { service, manager, outbox } = create({
      seat: null,
      claimed: false,
    });

    await service.hold(event);

    expect(manager.update).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
