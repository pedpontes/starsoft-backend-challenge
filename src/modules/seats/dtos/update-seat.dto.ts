import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSeatDto {
  @ApiPropertyOptional({
    example: 'A2',
    description: 'Novo label do assento.',
  })
  @IsOptional()
  @IsString()
  label?: string;
}
