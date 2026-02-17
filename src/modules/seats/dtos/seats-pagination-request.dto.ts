import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SeatsPaginationFilters,
  SeatsPaginationOrderBy,
  SeatsPaginationRequest,
} from '../types/seats.pagination';

export class SeatsPaginationFiltersDto implements SeatsPaginationFilters {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
    description: 'Filtrar por sessão.',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'A1',
    description: 'Filtrar por etiqueta do assento.',
  })
  @IsOptional()
  @IsString()
  label?: string;
}

export class SeatsPaginationRequestDto implements SeatsPaginationRequest {
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
    enum: SeatsPaginationOrderBy,
    example: SeatsPaginationOrderBy.LabelAsc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @IsOptional()
  @IsEnum(SeatsPaginationOrderBy)
  orderBy?: SeatsPaginationOrderBy;

  @ApiPropertyOptional({
    type: () => SeatsPaginationFiltersDto,
    description:
      'Filtros. Envie como deep object: filters[sessionId]=...&filters[label]=...',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeatsPaginationFiltersDto)
  filters?: SeatsPaginationFiltersDto;
}
