import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories/contracts/user.repository';

@Injectable()
export class LoadUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async loadById(userId: string) {
    const user = await this.userRepository.loadById(userId);
    if (!user) throw new NotFoundException('User not found.');

    return user;
  }
}
