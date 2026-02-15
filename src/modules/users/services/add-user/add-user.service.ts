import { Injectable } from '@nestjs/common';
import { AddUserDto } from '../../dtos/add-user.dto';
import { UserRepository } from '../../repositories/contracts/user.repository';

@Injectable()
export class AddUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async addUser(dto: AddUserDto) {
    return await this.userRepository.add({
      email: dto.email,
      name: dto.name,
    });
  }
}
