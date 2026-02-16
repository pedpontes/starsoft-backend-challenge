import { Reservation } from '../../entities/reservation.entity';
import { AddReservationDto } from '../dtos/add-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import {
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../../types/reservations.pagination';

export abstract class ReservationRepository {
  abstract add(input: AddReservationDto): Promise<Reservation>;
  abstract loadById(
    id: Reservation['id'],
    includeSeats?: boolean,
  ): Promise<Reservation | null>;
  abstract loadAll(
    request: ReservationsPaginationRequest,
  ): Promise<ReservationsPaginationResponse>;
  abstract update(
    id: Reservation['id'],
    updates: UpdateReservationDto,
  ): Promise<Reservation | null>;
  abstract remove(id: Reservation['id']): Promise<boolean>;
}

export { AddReservationDto, UpdateReservationDto };
