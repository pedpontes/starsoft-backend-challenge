import { User } from '../../entities/user.entity';
import {
  UsersPaginationRequest,
  UsersPaginationResponse,
} from '../../types/users.pagination';

export type AddUserInput = Pick<User, 'name' | 'email'>;
export type UpdateUserInput = Partial<Pick<User, 'name' | 'email'>>;

export abstract class UserRepository {
  abstract add(addUser: AddUserInput): Promise<User>;
  abstract loadById(id: User['id']): Promise<User | null>;
  abstract loadAll(
    request: UsersPaginationRequest,
  ): Promise<UsersPaginationResponse>;
  abstract update(
    id: User['id'],
    updates: UpdateUserInput,
  ): Promise<User | null>;
  abstract remove(id: User['id']): Promise<boolean>;
}
