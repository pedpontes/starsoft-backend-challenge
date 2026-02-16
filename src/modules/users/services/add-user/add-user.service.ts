import { Injectable } from '@nestjs/common';
import { AddUserDto } from '../../dtos/add-user.dto';
import {
  AddUserInput,
  UserRepository,
} from '../../repositories/contracts/user.repository';

@Injectable()
export class AddUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async addUser(dto: AddUserDto) {
    const addUser: AddUserInput = {
      email: dto.email,
      name: dto.name,
    };
    return await this.userRepository.add(addUser);
  }
}
