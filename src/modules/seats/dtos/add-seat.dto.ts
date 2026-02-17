import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddSeatDto {
  @ApiProperty({
    format: 'uuid',
    example: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
    description: 'ID da sessão.',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    example: 'A1',
    description: 'Label do assento.',
  })
  @IsString()
  label: string;
}
