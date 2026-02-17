import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({
    format: 'uuid',
    example: '1c0dcbfd-1f6d-4fd6-8f18-1d2aa5d1d0b7',
    description: 'ID da reserva.',
  })
  @IsUUID()
  reservationId: string;
}
