import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  UsersPaginationFilters,
  UsersPaginationOrderBy,
  UsersPaginationRequest,
} from '../types/users.pagination';

export class UsersPaginationFiltersDto implements UsersPaginationFilters {
  @ApiPropertyOptional({
    example: 'Ana',
    description: 'Filtrar por parte do nome.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'ana@example.com',
    description: 'Filtrar por e-mail.',
  })
  @IsOptional()
  @IsString()
  email?: string;
}

export class UsersPaginationRequestDto implements UsersPaginationRequest {
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
    enum: UsersPaginationOrderBy,
    example: UsersPaginationOrderBy.CreatedAtDesc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @IsOptional()
  @IsEnum(UsersPaginationOrderBy)
  orderBy?: UsersPaginationOrderBy;

  @ApiPropertyOptional({
    type: () => UsersPaginationFiltersDto,
    description:
      'Filtros. Envie como deep object: filters[name]=...&filters[email]=...',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UsersPaginationFiltersDto)
  filters?: UsersPaginationFiltersDto;
}
