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
import {
  SeatsPaginationFilters,
  SeatsPaginationOrderBy,
  SeatsPaginationRequest,
} from '../types/seats.pagination';

export class SeatsPaginationFiltersDto implements SeatsPaginationFilters {
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsString()
  label?: string;
}

export class SeatsPaginationRequestDto implements SeatsPaginationRequest {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @IsOptional()
  @IsEnum(SeatsPaginationOrderBy)
  orderBy?: SeatsPaginationOrderBy;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeatsPaginationFiltersDto)
  filters?: SeatsPaginationFiltersDto;
}
