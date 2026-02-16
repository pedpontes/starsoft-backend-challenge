import { Injectable } from '@nestjs/common';
import { AddUserDto } from '../../dtos/add-user.dto';
import {
  AddUserDto as AddUserRepositoryDto,
  UserRepository,
} from '../../repositories/contracts/user.repository';

@Injectable()
export class AddUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async addUser(dto: AddUserDto) {
    const addUser: AddUserRepositoryDto = {
      email: dto.email,
      name: dto.name,
    };
    return await this.userRepository.add(addUser);
  }
}
