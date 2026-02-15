import { User } from '../../entities/user.entity';
import { AddUserDto } from '../../dtos/add-user.dto';
import {
  UsersPaginationRequest,
  UsersPaginationResponse,
} from '../../types/users.pagination';

export abstract class UserRepository {
  abstract add(addUser: AddUserDto): Promise<User>;
  abstract loadById(id: User['id']): Promise<User | null>;
  abstract loadAll(
    request: UsersPaginationRequest,
  ): Promise<UsersPaginationResponse>;
  abstract update(
    id: User['id'],
    updates: Partial<AddUserDto>,
  ): Promise<User | null>;
  abstract remove(id: User['id']): Promise<boolean>;
}
