import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  seatId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;
}
