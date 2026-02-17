import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddUserDto {
  @ApiProperty({
    example: 'Ana Silva',
    description: 'Nome do usuário.',
  })
  @IsString()
  name: string;

  @ApiProperty({
    format: 'email',
    example: 'ana@example.com',
    description: 'E-mail do usuário.',
  })
  @IsEmail()
  email: string;
}
