import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({
    example: 'Movie X',
    description: 'Título do filme.',
  })
  @IsString()
  movieTitle: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-02-20T19:00:00.000Z',
    description: 'Data/hora da sessão (ISO 8601).',
  })
  @IsDateString()
  startsAt: string;

  @ApiProperty({
    example: 'Room A',
    description: 'Sala da sessão.',
  })
  @IsString()
  room: string;

  @ApiProperty({
    example: 25,
    minimum: 0.01,
    description: 'Preço do ingresso.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @ApiPropertyOptional({
    example: 64,
    minimum: 16,
    description:
      'Quantidade de assentos (>= 16). Usado para gerar labels automaticamente.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  seatsCount?: number;

  @ApiPropertyOptional({
    type: [String],
    example: [
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
      'S8',
      'S9',
      'S10',
      'S11',
      'S12',
      'S13',
      'S14',
      'S15',
      'S16',
    ],
    description:
      'Labels dos assentos (>= 16). Se informado, tem prioridade sobre seatsCount.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(16)
  @ArrayUnique()
  @IsString({ each: true })
  seatLabels?: string[];
}
