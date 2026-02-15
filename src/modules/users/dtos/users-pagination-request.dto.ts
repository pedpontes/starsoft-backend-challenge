import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  UsersPaginationFilters,
  UsersPaginationOrderBy,
  UsersPaginationRequest,
} from '../types/users.pagination';

export class UsersPaginationFiltersDto implements UsersPaginationFilters {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class UsersPaginationRequestDto implements UsersPaginationRequest {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number;

  @IsOptional()
  @IsEnum(UsersPaginationOrderBy)
  orderBy?: UsersPaginationOrderBy;

  @IsOptional()
  @ValidateNested()
  @Type(() => UsersPaginationFiltersDto)
  filters?: UsersPaginationFiltersDto;
}
