import { Reservation, ReservationStatus } from '../../entities/reservation.entity';

export class AddReservationDto {
  sessionId: Reservation['sessionId'];
  userId: Reservation['userId'];
  seatIds: string[];
  expiresAt: Date;
  status?: ReservationStatus;
}
