import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppConfigService } from '../../config/app-config.service';

export function kafkaMicroserviceOptions(
  config: AppConfigService,
  groupId: string,
): MicroserviceOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: `${config.kafkaClientId}-${groupId}`,
        brokers: config.kafkaBrokers,
        connectionTimeout: 10_000,
        requestTimeout: 30_000,
      },
      consumer: {
        groupId,
        sessionTimeout: 30_000,
        heartbeatInterval: 3_000,
        allowAutoTopicCreation: true,
      },
      run: {
        autoCommit: false,
        partitionsConsumedConcurrently: 3,
      },
      subscribe: {
        fromBeginning: true,
      },
    },
  };
}
