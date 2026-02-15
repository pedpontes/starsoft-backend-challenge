import { Injectable, NotFoundException } from '@nestjs/common';
import { UserTypeOrmRepository } from '../../repositories/user.repository';

@Injectable()
export class LoadUserService {
  constructor(private readonly userRepository: UserTypeOrmRepository) {}

  async loadById(userId: string) {
    const user = await this.userRepository.loadById(userId);
    if (!user) throw new NotFoundException('User not found.');

    return user;
  }
}
