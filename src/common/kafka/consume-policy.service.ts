import { Injectable, Logger } from '@nestjs/common';
import { KafkaContext } from '@nestjs/microservices';
import { KafkaTopics } from '../contracts/topics';
import { errorMessage } from '../errors';
import { sleep } from '../utils/sleep';
import { buildEvent } from './domain-event';
import { commitKafkaOffset } from './commit-offset';
import { KafkaProducerService } from './kafka-producer.service';

export interface ConsumeOptions {
  context: KafkaContext;
  groupId: string;
  payload: unknown;
  handler: () => Promise<void>;
}

@Injectable()
export class KafkaConsumePolicy {
  private readonly logger = new Logger(KafkaConsumePolicy.name);

  constructor(private readonly producer: KafkaProducerService) {}

  async run(options: ConsumeOptions): Promise<void> {
    const maxAttempts = 3;
    const heartbeat = options.context.getHeartbeat();
    const timer = setInterval(() => {
      void heartbeat().catch(() => undefined);
    }, 3_000);

    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          await options.handler();
          // 처리가 끝난 뒤에만 오프셋을 커밋함
          await commitKafkaOffset(options.context);
          return;
        } catch (error) {
          const message = errorMessage(error);
          if (attempt === maxAttempts) {
            // 한도를 넘기면 DLQ로 옮기고 오프셋을 진행함. 파티션을 그 메시지에 멈추지 않음
            await this.publishDeadLetter(options, message);
            await commitKafkaOffset(options.context);
            this.logger.error(
              `DLQ 이동 topic=${options.context.getTopic()} group=${options.groupId} error=${message}`,
            );
            return;
          }
          this.logger.warn(
            `메시지 재시도 ${attempt}/${maxAttempts} topic=${options.context.getTopic()} error=${message}`,
          );
          await sleep(attempt * 150);
        }
      }
    } finally {
      clearInterval(timer);
    }
  }

  private async publishDeadLetter(options: ConsumeOptions, message: string): Promise<void> {
    const event = buildEvent(KafkaTopics.DEAD_LETTER, options.context.getTopic(), {
      sourceTopic: options.context.getTopic(),
      consumerGroup: options.groupId,
      payload: options.payload,
      error: message,
      failedAt: new Date().toISOString(),
    });
    await this.producer.publish(KafkaTopics.DEAD_LETTER, event, options.context.getTopic());
  }
}
