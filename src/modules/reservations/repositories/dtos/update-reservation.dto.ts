import { ReservationStatus } from '../../entities/reservation.entity';

export class UpdateReservationDto {
  status?: ReservationStatus;
  expiresAt?: Date;
}
