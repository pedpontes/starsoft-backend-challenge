import { Injectable } from '@nestjs/common';
import type {
  UsersPaginationRequest,
  UsersPaginationResponse,
} from '../../types/users.pagination';
import { UserRepository } from '../../repositories/contracts/user.repository';

@Injectable()
export class LoadUsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async loadAll(
    request: UsersPaginationRequest,
  ): Promise<UsersPaginationResponse> {
    return await this.userRepository.loadAll(request);
  }
}
