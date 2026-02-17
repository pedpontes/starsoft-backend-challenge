import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({
    format: 'uuid',
    example: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
    description: 'ID da sessão.',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    format: 'uuid',
    example: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
    description: 'ID do usuário.',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    example: [
      'bf2c2df8-61e6-4b31-86ad-82053aa9cfd7',
      '5f4c2c6a-2b5a-4a73-a9d2-3b2b7e9f1c8a',
    ],
    description: 'IDs dos assentos.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  seatIds: string[];
}
