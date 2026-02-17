import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Ana Silva',
    description: 'Nome do usuário.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    format: 'email',
    example: 'ana@example.com',
    description: 'E-mail do usuário.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
