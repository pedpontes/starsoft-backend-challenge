import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReservationsPaginationFilters,
  ReservationsPaginationOrderBy,
  ReservationsPaginationRequest,
} from '../types/reservations.pagination';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationsPaginationFiltersDto
  implements ReservationsPaginationFilters
{
  @ApiPropertyOptional({
    format: 'uuid',
    example: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
    description: 'Filtrar por usuário.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
    description: 'Filtrar por sessão.',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.RESERVED,
    description: 'Filtrar por status.',
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-02-10T00:00:00.000Z',
    description: 'Data/hora inicial (ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-02-20T23:59:59.000Z',
    description: 'Data/hora final (ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ReservationsPaginationRequestDto
  implements ReservationsPaginationRequest
{
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Número da página (1-based).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({
    example: 10,
    minimum: 1,
    description: 'Quantidade de itens por página.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @ApiPropertyOptional({
    enum: ReservationsPaginationOrderBy,
    example: ReservationsPaginationOrderBy.CreatedAtDesc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @IsOptional()
  @IsEnum(ReservationsPaginationOrderBy)
  orderBy?: ReservationsPaginationOrderBy;

  @ApiPropertyOptional({
    type: () => ReservationsPaginationFiltersDto,
    description:
      'Filtros. Envie como deep object: filters[userId]=...&filters[status]=...',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReservationsPaginationFiltersDto)
  filters?: ReservationsPaginationFiltersDto;
}
