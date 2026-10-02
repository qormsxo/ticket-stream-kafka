import { KafkaContext } from '@nestjs/microservices';

export async function commitKafkaOffset(context: KafkaContext): Promise<void> {
  const message = context.getMessage();
  const offset = message.offset;
  if (!offset) {
    return;
  }

  await context.getConsumer().commitOffsets([
    {
      topic: context.getTopic(),
      partition: context.getPartition(),
      // 커밋 값은 다음에 읽을 위치라 처리한 오프셋에 1을 더함
      offset: (BigInt(offset) + 1n).toString(),
    },
  ]);
}
