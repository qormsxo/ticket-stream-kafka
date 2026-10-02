import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { SeatHeldPayload } from '../../common/contracts/payloads';
import { asDomainEvent } from '../../common/kafka/domain-event';
import { KafkaConsumePolicy } from '../../common/kafka/consume-policy.service';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentConsumer {
  constructor(
    private readonly payments: PaymentService,
    private readonly policy: KafkaConsumePolicy,
  ) {}

  @EventPattern(KafkaTopics.SEAT_HELD)
  onSeatHeld(@Payload() payload: unknown, @Ctx() context: KafkaContext): Promise<void> {
    return this.policy.run({
      context,
      groupId: ConsumerGroups.PAYMENT,
      payload,
      handler: () => this.payments.handleSeatHeld(asDomainEvent<SeatHeldPayload>(payload)),
    });
  }
}
