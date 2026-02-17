import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    example: 'Movie X',
    description: 'Título do filme.',
  })
  @IsOptional()
  @IsString()
  movieTitle?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-02-20T21:00:00.000Z',
    description: 'Data/hora da sessão (ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    example: 'Room B',
    description: 'Sala da sessão.',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({
    example: 30,
    minimum: 0.01,
    description: 'Preço do ingresso.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price?: number;
}
