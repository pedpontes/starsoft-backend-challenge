import { Reservation, ReservationStatus } from '../../entities/reservation.entity';
import {
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../../types/reservations.pagination';

export type ReservationAddInput = {
  sessionId: Reservation['sessionId'];
  userId: Reservation['userId'];
  seatIds: string[];
  expiresAt: Date;
  status?: ReservationStatus;
};

export type ReservationUpdateInput = {
  status?: ReservationStatus;
  expiresAt?: Date;
};

export abstract class ReservationRepository {
  abstract add(input: ReservationAddInput): Promise<Reservation>;
  abstract loadById(
    id: Reservation['id'],
    includeSeats?: boolean,
  ): Promise<Reservation | null>;
  abstract loadAll(
    request: ReservationsPaginationRequest,
  ): Promise<ReservationsPaginationResponse>;
  abstract update(
    id: Reservation['id'],
    updates: ReservationUpdateInput,
  ): Promise<Reservation | null>;
  abstract remove(id: Reservation['id']): Promise<boolean>;
}
