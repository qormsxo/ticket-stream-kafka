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
      offset: (BigInt(offset) + 1n).toString(),
    },
  ]);
}
