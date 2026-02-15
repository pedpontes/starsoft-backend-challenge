import {
  PaginationRequest,
  PaginationResponse,
} from 'src/common/types/pagination';
import { Sale } from '../entities/sale.entity';

export type SalePaginationFilters = {
  sessionId?: string;
  from?: string;
  to?: string;
};

export enum SalePaginationOrderBy {
  CreatedAtAsc = 'createdAt',
  CreatedAtDesc = '-createdAt',
  TotalAmountAsc = 'totalAmount',
  TotalAmountDesc = '-totalAmount',
}

export type SalePaginationRequest = PaginationRequest<
  SalePaginationFilters,
  SalePaginationOrderBy
>;

export type SalePaginationResponse = PaginationResponse<Sale>;
