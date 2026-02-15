import { Injectable } from '@nestjs/common';
import type {
  UsersPaginationRequest,
  UsersPaginationResponse,
} from '../../types/users.pagination';
import { UserTypeOrmRepository } from '../../repositories/user.repository';

@Injectable()
export class LoadUsersService {
  constructor(private readonly userRepository: UserTypeOrmRepository) {}

  async loadAll(
    request: UsersPaginationRequest,
  ): Promise<UsersPaginationResponse> {
    return await this.userRepository.loadAll(request);
  }
}
