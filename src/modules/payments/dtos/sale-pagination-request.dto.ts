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
  SalePaginationFilters,
  SalePaginationOrderBy,
  SalePaginationRequest,
} from '../types/sales.pagination';

export class SalePaginationFiltersDto implements SalePaginationFilters {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
    description: 'Filtrar por sessão.',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

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

export class SalePaginationRequestDto implements SalePaginationRequest {
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
    enum: SalePaginationOrderBy,
    example: SalePaginationOrderBy.CreatedAtDesc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @IsOptional()
  @IsEnum(SalePaginationOrderBy)
  orderBy?: SalePaginationOrderBy;

  @ApiPropertyOptional({
    type: () => SalePaginationFiltersDto,
    description:
      'Filtros. Envie como deep object: filters[sessionId]=...&filters[from]=...',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SalePaginationFiltersDto)
  filters?: SalePaginationFiltersDto;
}
