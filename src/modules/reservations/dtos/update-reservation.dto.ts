import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../entities/reservation.entity';

export class UpdateReservationDto {
  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
    description: 'Status da reserva.',
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-02-20T19:00:30.000Z',
    description: 'Nova data/hora de expiração (ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
