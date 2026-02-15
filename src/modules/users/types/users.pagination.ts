import { PaginationRequest, PaginationResponse } from 'src/common/types/pagination';
import { User } from '../entities/user.entity';

export type UsersPaginationFilters = {
  name?: string;
  email?: string;
};

export enum UsersPaginationOrderBy {
  CreatedAtAsc = 'createdAt',
  CreatedAtDesc = '-createdAt',
  NameAsc = 'name',
  NameDesc = '-name',
  EmailAsc = 'email',
  EmailDesc = '-email',
}

export type UsersPaginationRequest = PaginationRequest<
  UsersPaginationFilters,
  UsersPaginationOrderBy
>;

export type UsersPaginationResponse = PaginationResponse<User>;
