import { BookingAcceptanceService } from '../src/modules/booking/booking-acceptance.service';
import { KafkaProducerService } from '../src/common/kafka/kafka-producer.service';
import { BookingStatusCache } from '../src/common/redis/booking-status.cache';
import { AcceptedBookingView } from '../src/common/booking/booking-status.view';

describe('BookingAcceptanceService', () => {
  it('Kafka에 한 번만 넣고 같은 Idempotency-Key는 캐시로 응답한다', async () => {
    const cache = new Map<string, AcceptedBookingView>();
    const producer = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    const statusCache = {
      getAccepted: jest.fn(async (key: string) => cache.get(key) ?? null),
      claimAccepted: jest.fn(async (key: string, value: AcceptedBookingView) => {
        if (cache.has(key)) {
          return 'EXISTS' as const;
        }
        cache.set(key, value);
        return 'CREATED' as const;
      }),
      releaseAccepted: jest.fn().mockResolvedValue(undefined),
      setStatus: jest.fn().mockResolvedValue(undefined),
    };
    const service = new BookingAcceptanceService(
      producer as unknown as KafkaProducerService,
      statusCache as unknown as BookingStatusCache,
    );
    const input = {
      eventId: '11111111-1111-4111-8111-111111111111',
      seatId: '22222222-2222-4222-8222-222222222222',
      userId: '33333333-3333-4333-8333-333333333333',
      idempotencyKey: 'idem-key-001',
    };

    const first = await service.accept(input);
    const second = await service.accept(input);

    expect(second).toEqual(first);
    expect(producer.publish).toHaveBeenCalledTimes(1);
    expect(producer.publish).toHaveBeenCalledWith(
      'ticket.booking.requested',
      expect.objectContaining({
        aggregateId: input.seatId,
        payload: expect.objectContaining({ bookingId: first.bookingId, seatId: input.seatId }),
      }),
      input.seatId,
    );
    expect(first.pollUrl).toBe(`/api/v1/bookings/${first.bookingId}`);
  });
});
