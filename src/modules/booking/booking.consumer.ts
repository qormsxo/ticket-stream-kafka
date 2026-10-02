import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { BookingRequestedPayload } from '../../common/contracts/payloads';
import { asDomainEvent } from '../../common/kafka/domain-event';
import { KafkaConsumePolicy } from '../../common/kafka/consume-policy.service';
import { BookingIntakeService } from './booking-intake.service';

@Controller()
export class BookingConsumer {
  constructor(
    private readonly intake: BookingIntakeService,
    private readonly policy: KafkaConsumePolicy,
  ) {}

  @EventPattern(KafkaTopics.BOOKING_REQUESTED)
  onBookingRequested(@Payload() payload: unknown, @Ctx() context: KafkaContext): Promise<void> {
    return this.policy.run({
      context,
      groupId: ConsumerGroups.BOOKING,
      payload,
      handler: () => this.intake.intake(asDomainEvent<BookingRequestedPayload>(payload)),
    });
  }
}
