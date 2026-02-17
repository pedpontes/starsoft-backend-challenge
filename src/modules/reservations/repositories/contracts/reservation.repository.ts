import { Reservation, ReservationStatus } from '../../entities/reservation.entity';
import {
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../../types/reservations.pagination';

export type AddReservationInput = {
  sessionId: Reservation['sessionId'];
  userId: Reservation['userId'];
  seatIds: string[];
  expiresAt: Date;
  status?: ReservationStatus;
  idempotencyKey?: string | null;
};

export type UpdateReservationInput = {
  status?: ReservationStatus;
  expiresAt?: Date;
};

export abstract class ReservationRepository {
  abstract add(input: AddReservationInput): Promise<Reservation>;
  abstract loadById(
    id: Reservation['id'],
    includeSeats?: boolean,
  ): Promise<Reservation | null>;
  abstract loadAll(
    request: ReservationsPaginationRequest,
  ): Promise<ReservationsPaginationResponse>;
  abstract loadByIdempotencyKey(
    userId: Reservation['userId'],
    idempotencyKey: string,
    includeSeats?: boolean,
  ): Promise<Reservation | null>;
  abstract update(
    id: Reservation['id'],
    updates: UpdateReservationInput,
  ): Promise<Reservation | null>;
  abstract expireIfNeeded(
    id: Reservation['id'],
    now: Date,
  ): Promise<boolean>;
  abstract releaseSeatLocks(
    reservationId: Reservation['id'],
    releasedAt: Date,
  ): Promise<void>;
  abstract remove(id: Reservation['id']): Promise<boolean>;
}
