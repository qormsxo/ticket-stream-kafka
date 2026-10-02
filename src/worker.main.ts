import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { ConsumerGroups, isWorkerRole, WorkerRole } from './common/contracts/topics';
import { kafkaMicroserviceOptions } from './common/kafka/kafka-microservice.options';
import { AppConfigService } from './config/app-config.service';
import { WorkerRootModule } from './worker.module';

function groupIdFor(role: Exclude<WorkerRole, 'outbox'>): string {
  switch (role) {
    case 'booking':
      return ConsumerGroups.BOOKING;
    case 'seat':
      return ConsumerGroups.SEAT;
    case 'payment':
      return ConsumerGroups.PAYMENT;
    case 'notification':
      return ConsumerGroups.NOTIFICATION;
  }
}

async function bootstrap(): Promise<void> {
  const role = process.env.WORKER_ROLE ?? '';
  if (!isWorkerRole(role)) {
    throw new Error(`WORKER_ROLE이 올바르지 않습니다: ${role || '(empty)'}`);
  }

  const app = await NestFactory.create(WorkerRootModule.register(role));
  const config = app.get(AppConfigService);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  if (role !== 'outbox') {
    app.connectMicroservice<MicroserviceOptions>(
      kafkaMicroserviceOptions(config, groupIdFor(role)),
    );
    await app.startAllMicroservices();
  }

  await app.listen(config.workerPort);
  Logger.log(`worker=${role} port=${config.workerPort}`, 'Bootstrap');
}

void bootstrap();
