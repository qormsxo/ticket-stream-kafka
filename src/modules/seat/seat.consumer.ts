import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ConsumerGroups, KafkaTopics } from '../../common/contracts/topics';
import { SeatHoldRequestedPayload } from '../../common/contracts/payloads';
import { asDomainEvent } from '../../common/kafka/domain-event';
import { KafkaConsumePolicy } from '../../common/kafka/consume-policy.service';
import { SeatOccupancyService } from './seat-occupancy.service';

@Controller()
export class SeatConsumer {
  constructor(
    private readonly seats: SeatOccupancyService,
    private readonly policy: KafkaConsumePolicy,
  ) {}

  @EventPattern(KafkaTopics.SEAT_HOLD_REQUESTED)
  onSeatHoldRequested(@Payload() payload: unknown, @Ctx() context: KafkaContext): Promise<void> {
    return this.policy.run({
      context,
      groupId: ConsumerGroups.SEAT,
      payload,
      handler: () => this.seats.hold(asDomainEvent<SeatHoldRequestedPayload>(payload)),
    });
  }
}
