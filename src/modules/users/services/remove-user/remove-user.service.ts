import { Injectable, NotFoundException } from '@nestjs/common';
import { UserTypeOrmRepository } from '../../repositories/user.repository';

@Injectable()
export class RemoveUserService {
  constructor(private readonly userRepository: UserTypeOrmRepository) {}

  async removeUser(userId: string) {
    const removed = await this.userRepository.remove(userId);
    if (!removed) throw new NotFoundException('User not found.');
  }
}
