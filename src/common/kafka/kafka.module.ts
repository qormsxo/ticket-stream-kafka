import { Global, Module } from '@nestjs/common';
import { KafkaConsumePolicy } from './consume-policy.service';
import { KafkaProducerService } from './kafka-producer.service';

@Global()
@Module({
  providers: [KafkaProducerService, KafkaConsumePolicy],
  exports: [KafkaProducerService, KafkaConsumePolicy],
})
export class KafkaModule {}
