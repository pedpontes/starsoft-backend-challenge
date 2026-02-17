import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SessionsPaginationFilters,
  SessionsPaginationOrderBy,
  SessionsPaginationRequest,
} from '../types/sessions.pagination';

export class SessionsPaginationFiltersDto implements SessionsPaginationFilters {
  @ApiPropertyOptional({
    example: 'Movie X',
    description: 'Filtrar por parte do título.',
  })
  @IsOptional()
  @IsString()
  movieTitle?: string;

  @ApiPropertyOptional({
    example: 'Room A',
    description: 'Filtrar por sala.',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-02-20T00:00:00.000Z',
    description: 'Data/hora inicial (ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-02-25T23:59:59.000Z',
    description: 'Data/hora final (ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SessionsPaginationRequestDto implements SessionsPaginationRequest {
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
    enum: SessionsPaginationOrderBy,
    example: SessionsPaginationOrderBy.StartsAtAsc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @IsOptional()
  @IsEnum(SessionsPaginationOrderBy)
  orderBy?: SessionsPaginationOrderBy;

  @ApiPropertyOptional({
    type: () => SessionsPaginationFiltersDto,
    description:
      'Filtros. Envie como deep object: filters[movieTitle]=...&filters[from]=...',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionsPaginationFiltersDto)
  filters?: SessionsPaginationFiltersDto;
}
