import { PaginationRequest, PaginationResponse } from 'src/common/types/pagination';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';

export type ReservationsPaginationFilters = {
  userId?: string;
  sessionId?: string;
  status?: ReservationStatus;
  from?: string;
  to?: string;
};

export enum ReservationsPaginationOrderBy {
  CreatedAtAsc = 'createdAt',
  CreatedAtDesc = '-createdAt',
  ExpiresAtAsc = 'expiresAt',
  ExpiresAtDesc = '-expiresAt',
}

export type ReservationsPaginationRequest = PaginationRequest<
  ReservationsPaginationFilters,
  ReservationsPaginationOrderBy
>;

export type ReservationsPaginationResponse = PaginationResponse<Reservation>;
