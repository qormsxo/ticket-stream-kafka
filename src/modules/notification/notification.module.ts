import { Module } from '@nestjs/common';
import { NotificationConsumer } from './notification.consumer';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationConsumer],
  providers: [NotificationService],
})
export class NotificationModule {}
