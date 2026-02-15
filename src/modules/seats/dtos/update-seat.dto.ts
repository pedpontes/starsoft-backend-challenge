import { IsOptional, IsString } from 'class-validator';

export class UpdateSeatDto {
  @IsOptional()
  @IsString()
  label?: string;
}
