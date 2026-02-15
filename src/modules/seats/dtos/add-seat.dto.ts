import { IsString, IsUUID } from 'class-validator';

export class AddSeatDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  label: string;
}
