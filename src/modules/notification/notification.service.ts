import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { isUniqueViolation } from '../../common/errors';
import { BookingStatusCache } from '../../common/redis/booking-status.cache';
import { TransactionService } from '../../common/database/transaction.service';
import { InboxService } from '../../common/inbox/inbox.service';
import { ConsumerGroups } from '../../common/contracts/topics';
import { NotificationTemplate } from '../../common/contracts/statuses';
import { PaymentResultPayload, SeatHoldFailedPayload } from '../../common/contracts/payloads';
import { DomainEvent } from '../../common/kafka/domain-event';
import { NotificationEntity } from '../../database/entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly transactions: TransactionService,
    private readonly inbox: InboxService,
    private readonly cache: BookingStatusCache,
  ) {}

  async notify(
    event: DomainEvent<PaymentResultPayload | SeatHoldFailedPayload>,
    template: NotificationTemplate,
  ): Promise<void> {
    await this.transactions.run(async (manager) => {
      const claimed = await this.inbox.claim(manager, ConsumerGroups.NOTIFICATION, event.eventId);
      if (!claimed) {
        return;
      }

      try {
        await manager.insert(NotificationEntity, {
          id: randomUUID(),
          bookingId: event.payload.bookingId,
          channel: 'LOG',
          template,
          payload: event,
          status: 'SENT',
          createdAt: new Date(),
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
      }
    });

    this.logger.log(`알림 기록 template=${template} booking=${event.payload.bookingId}`);
    await this.cache.syncFromDatabase(event.payload.bookingId);
  }
}
