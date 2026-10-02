import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { RedlockService } from '../../common/redis/redlock.service';
import { TransactionService } from '../../common/database/transaction.service';
import { InboxService } from '../../common/inbox/inbox.service';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { BookingStatus, PaymentStatus } from '../../common/contracts/statuses';
import { SeatHeldPayload } from '../../common/contracts/payloads';
import { DomainEvent, buildEvent } from '../../common/kafka/domain-event';
import { RetryableError } from '../../common/errors';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { SeatEntity } from '../../database/entities/seat.entity';
import { OutboxService } from '../outbox/outbox.service';
import { SeatTransition, toSeatSnapshot } from '../seat/domain/seat-transition';
import { applySeatSnapshot } from '../seat/seat-writer';
import { ChargeResult, PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';

type PaymentOutcome = { action: 'DONE' } | { action: 'VOID'; providerRef: string };

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly transactions: TransactionService,
    private readonly redlock: RedlockService,
    private readonly inbox: InboxService,
    private readonly outbox: OutboxService,
    private readonly cache: BookingStatusCache,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async handleSeatHeld(event: DomainEvent<SeatHeldPayload>): Promise<void> {
    if (await this.inbox.alreadyProcessed(ConsumerGroups.PAYMENT, event.eventId)) {
      return;
    }

    const preview = await this.transactions.run((manager) =>
      manager.findOne(BookingEntity, { where: { id: event.payload.bookingId } }),
    );
    if (!preview) {
      throw new RetryableError('결제 대상 예매가 아직 보이지 않습니다.');
    }
    if (
      preview.status === BookingStatus.CONFIRMED ||
      preview.status === BookingStatus.FAILED ||
      preview.status === BookingStatus.REJECTED
    ) {
      return;
    }

    const charge = await this.provider.charge({
      bookingId: preview.id,
      userId: preview.userId,
      amount: preview.amount,
      idempotencyKey: preview.id,
    });

    const outcome = await this.redlock.using(`lock:seat:${preview.seatId}`, () =>
      this.transactions.run((manager) => this.commitCharge(manager, event, charge)),
    );

    if (outcome.action === 'VOID') {
      await this.provider.voidCharge({
        bookingId: preview.id,
        providerRef: outcome.providerRef,
      });
    }

    await this.cache.syncFromDatabase(preview.id);
  }

  private async commitCharge(
    manager: EntityManager,
    event: DomainEvent<SeatHeldPayload>,
    charge: ChargeResult,
  ): Promise<PaymentOutcome> {
    const claimed = await this.inbox.claim(manager, ConsumerGroups.PAYMENT, event.eventId);
    if (!claimed) {
      return { action: 'DONE' };
    }

    const seat = await manager.findOne(SeatEntity, {
      where: { id: event.payload.seatId },
      lock: { mode: 'pessimistic_write' },
    });
    const booking = await manager.findOne(BookingEntity, {
      where: { id: event.payload.bookingId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!seat || !booking) {
      throw new RetryableError('결제 확정에 필요한 행을 잠글 수 없습니다.');
    }

    if (!charge.approved) {
      await this.releaseHold(manager, seat, booking.id);
      await this.savePayment(manager, booking, charge, PaymentStatus.DECLINED, 'FAKE_DECLINED');
      await manager.update(
        BookingEntity,
        { id: booking.id },
        { status: BookingStatus.FAILED, failureReason: 'PAYMENT_DECLINED' },
      );
      await this.emitResult(manager, event, KafkaTopics.PAYMENT_FAILED, charge, 'PAYMENT_DECLINED');
      this.logger.log(`결제 거절 booking=${booking.id}`);
      return { action: 'DONE' };
    }

    const decision = SeatTransition.confirm(toSeatSnapshot(seat), booking.id, new Date());
    if (!decision.ok) {
      await this.releaseHold(manager, seat, booking.id);
      await this.savePayment(manager, booking, charge, PaymentStatus.VOIDED, decision.reason);
      await manager.update(
        BookingEntity,
        { id: booking.id },
        { status: BookingStatus.FAILED, failureReason: decision.reason },
      );
      await this.emitResult(manager, event, KafkaTopics.PAYMENT_FAILED, charge, decision.reason);
      return { action: 'VOID', providerRef: charge.providerRef };
    }

    await applySeatSnapshot(manager, seat, decision.seat);
    await this.savePayment(manager, booking, charge, PaymentStatus.APPROVED, null);
    await manager.update(
      BookingEntity,
      { id: booking.id },
      { status: BookingStatus.CONFIRMED, failureReason: null },
    );
    await this.emitResult(manager, event, KafkaTopics.PAYMENT_COMPLETED, charge);
    this.logger.log(`결제 승인 booking=${booking.id} ref=${charge.providerRef}`);
    return { action: 'DONE' };
  }

  private async releaseHold(
    manager: EntityManager,
    seat: SeatEntity,
    bookingId: string,
  ): Promise<void> {
    const released = SeatTransition.release(toSeatSnapshot(seat), bookingId);
    if (released.ok) {
      await applySeatSnapshot(manager, seat, released.seat);
    }
  }

  private async savePayment(
    manager: EntityManager,
    booking: BookingEntity,
    charge: ChargeResult,
    status: PaymentStatus,
    failureReason: string | null,
  ): Promise<void> {
    await manager.insert(PaymentEntity, {
      id: randomUUID(),
      bookingId: booking.id,
      provider: this.provider.name,
      providerRef: charge.providerRef,
      status,
      amount: booking.amount,
      failureReason,
      createdAt: new Date(),
    });
  }

  private async emitResult(
    manager: EntityManager,
    event: DomainEvent<SeatHeldPayload>,
    topic: string,
    charge: ChargeResult,
    reason?: string,
  ): Promise<void> {
    await this.outbox.enqueue(manager, {
      aggregateType: 'Payment',
      aggregateId: event.payload.seatId,
      event: buildEvent(topic, event.payload.seatId, {
        bookingId: event.payload.bookingId,
        eventId: event.payload.eventId,
        seatId: event.payload.seatId,
        userId: event.payload.userId,
        amount: event.payload.amount,
        providerRef: charge.providerRef,
        reason,
      }),
    });
  }
}
