import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories/contracts/user.repository';

@Injectable()
export class RemoveUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async removeUser(userId: string) {
    const removed = await this.userRepository.remove(userId);
    if (!removed) throw new NotFoundException('User not found.');
  }
}
