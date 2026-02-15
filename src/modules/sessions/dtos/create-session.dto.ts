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

export class CreateSessionDto {
  @IsString()
  movieTitle: string;

  @IsDateString()
  startsAt: string;

  @IsString()
  room: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(16)
  seatsCount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(16)
  @ArrayUnique()
  @IsString({ each: true })
  seatLabels?: string[];
}
