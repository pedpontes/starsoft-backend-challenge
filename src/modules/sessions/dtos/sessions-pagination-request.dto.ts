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
import {
  SessionsPaginationFilters,
  SessionsPaginationOrderBy,
  SessionsPaginationRequest,
} from '../types/sessions.pagination';

export class SessionsPaginationFiltersDto implements SessionsPaginationFilters {
  @IsOptional()
  @IsString()
  movieTitle?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SessionsPaginationRequestDto implements SessionsPaginationRequest {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @IsOptional()
  @IsEnum(SessionsPaginationOrderBy)
  orderBy?: SessionsPaginationOrderBy;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionsPaginationFiltersDto)
  filters?: SessionsPaginationFiltersDto;
}
