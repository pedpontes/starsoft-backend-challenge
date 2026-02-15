import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddUserDto } from '../dtos/add-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserTypeOrmRepository } from '../repositories/user.repository';
import type {
  UsersPaginationRequest,
  UsersPaginationResponse,
} from '../types/users.pagination';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserTypeOrmRepository) {}

  async addUser(dto: AddUserDto) {
    return await this.userRepository.add({
      email: dto.email,
      name: dto.name,
    });
  }

  async loadAll(
    request: UsersPaginationRequest,
  ): Promise<UsersPaginationResponse> {
    return await this.userRepository.loadAll(request);
  }

  async loadById(userId: string) {
    const user = await this.userRepository.loadById(userId);
    if (!user) throw new NotFoundException('User not found.');

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    if (!dto.name && !dto.email) {
      throw new BadRequestException('No fields to update.');
    }

    const user = await this.userRepository.update(userId, dto);
    if (!user) throw new NotFoundException('User not found.');

    return user;
  }

  async removeUser(userId: string) {
    const removed = await this.userRepository.remove(userId);
    if (!removed) throw new NotFoundException('User not found.');
  }
}
