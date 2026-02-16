import { Seat } from '../../entities/seat.entity';

export class AddSeatDto {
  sessionId: Seat['sessionId'];
  label: Seat['label'];
}
