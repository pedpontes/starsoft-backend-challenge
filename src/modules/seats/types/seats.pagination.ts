import { PaginationRequest, PaginationResponse } from 'src/common/types/pagination';
import { Seat } from '../entities/seat.entity';

export type SeatsPaginationFilters = {
  sessionId?: string;
  label?: string;
};

export enum SeatsPaginationOrderBy {
  CreatedAtAsc = 'createdAt',
  CreatedAtDesc = '-createdAt',
  LabelAsc = 'label',
  LabelDesc = '-label',
}

export type SeatsPaginationRequest = PaginationRequest<
  SeatsPaginationFilters,
  SeatsPaginationOrderBy
>;

export type SeatsPaginationResponse = PaginationResponse<Seat>;
