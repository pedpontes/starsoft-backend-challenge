import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  userId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  seatIds: string[];
}
