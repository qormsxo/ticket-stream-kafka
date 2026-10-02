import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from '../../database/entities/event.entity';
import { SeatEntity } from '../../database/entities/seat.entity';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, SeatEntity])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
