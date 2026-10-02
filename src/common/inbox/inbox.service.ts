import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { InboxEntity } from '../../database/entities/inbox.entity';
import { isUniqueViolation } from '../errors';

@Injectable()
export class InboxService {
  constructor(private readonly dataSource: DataSource) {}

  async alreadyProcessed(consumerGroup: string, eventId: string): Promise<boolean> {
    const found = await this.dataSource.getRepository(InboxEntity).findOne({
      where: { consumerGroup, eventId },
    });
    return found !== null;
  }

  async claim(
    manager: EntityManager,
    consumerGroup: string,
    eventId: string,
  ): Promise<boolean> {
    try {
      await manager.insert(InboxEntity, {
        id: randomUUID(),
        consumerGroup,
        eventId,
        processedAt: new Date(),
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }
}
