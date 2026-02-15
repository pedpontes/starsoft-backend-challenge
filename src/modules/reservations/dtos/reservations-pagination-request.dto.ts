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
  ReservationsPaginationFilters,
  ReservationsPaginationOrderBy,
  ReservationsPaginationRequest,
} from '../types/reservations.pagination';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationsPaginationFiltersDto
  implements ReservationsPaginationFilters
{
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ReservationsPaginationRequestDto
  implements ReservationsPaginationRequest
{
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @IsOptional()
  @IsEnum(ReservationsPaginationOrderBy)
  orderBy?: ReservationsPaginationOrderBy;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReservationsPaginationFiltersDto)
  filters?: ReservationsPaginationFiltersDto;
}
