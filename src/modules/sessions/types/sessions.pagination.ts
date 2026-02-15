import { PaginationRequest, PaginationResponse } from 'src/common/types/pagination';
import { Session } from '../entities/session.entity';

export type SessionsPaginationFilters = {
  movieTitle?: string;
  room?: string;
  from?: string;
  to?: string;
};

export enum SessionsPaginationOrderBy {
  CreatedAtAsc = 'createdAt',
  CreatedAtDesc = '-createdAt',
  StartsAtAsc = 'startsAt',
  StartsAtDesc = '-startsAt',
  PriceAsc = 'price',
  PriceDesc = '-price',
}

export type SessionsPaginationRequest = PaginationRequest<
  SessionsPaginationFilters,
  SessionsPaginationOrderBy
>;

export type SessionsPaginationResponse = PaginationResponse<Session>;
