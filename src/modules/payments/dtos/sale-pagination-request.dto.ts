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
import {
  SalePaginationFilters,
  SalePaginationOrderBy,
  SalePaginationRequest,
} from '../types/sales.pagination';

export class SalePaginationFiltersDto implements SalePaginationFilters {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SalePaginationRequestDto implements SalePaginationRequest {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @IsOptional()
  @IsEnum(SalePaginationOrderBy)
  orderBy?: SalePaginationOrderBy;

  @IsOptional()
  @ValidateNested()
  @Type(() => SalePaginationFiltersDto)
  filters?: SalePaginationFiltersDto;
}
