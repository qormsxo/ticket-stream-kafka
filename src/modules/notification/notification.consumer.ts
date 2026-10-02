import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { NotificationTemplate } from '../../common/contracts/statuses';
import { PaymentResultPayload, SeatHoldFailedPayload } from '../../common/contracts/payloads';
import { asDomainEvent } from '../../common/kafka/domain-event';
import { KafkaConsumePolicy } from '../../common/kafka/consume-policy.service';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationConsumer {
  constructor(
    private readonly notifications: NotificationService,
    private readonly policy: KafkaConsumePolicy,
  ) {}

  @EventPattern(KafkaTopics.PAYMENT_COMPLETED)
  onPaymentCompleted(@Payload() payload: unknown, @Ctx() context: KafkaContext): Promise<void> {
    return this.dispatch(context, payload, NotificationTemplate.BOOKING_CONFIRMED);
  }

  @EventPattern(KafkaTopics.PAYMENT_FAILED)
  onPaymentFailed(@Payload() payload: unknown, @Ctx() context: KafkaContext): Promise<void> {
    return this.dispatch(context, payload, NotificationTemplate.BOOKING_FAILED);
  }

  @EventPattern(KafkaTopics.SEAT_HOLD_FAILED)
  onSeatHoldFailed(@Payload() payload: unknown, @Ctx() context: KafkaContext): Promise<void> {
    return this.dispatch(context, payload, NotificationTemplate.SEAT_REJECTED);
  }

  private dispatch(
    context: KafkaContext,
    payload: unknown,
    template: NotificationTemplate,
  ): Promise<void> {
    return this.policy.run({
      context,
      groupId: ConsumerGroups.NOTIFICATION,
      payload,
      handler: () =>
        this.notifications.notify(
          asDomainEvent<PaymentResultPayload | SeatHoldFailedPayload>(payload),
          template,
        ),
    });
  }
}
