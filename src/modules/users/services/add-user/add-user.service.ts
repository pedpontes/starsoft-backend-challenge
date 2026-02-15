import { Injectable } from '@nestjs/common';
import { AddUserDto } from '../../dtos/add-user.dto';
import { UserTypeOrmRepository } from '../../repositories/user.repository';

@Injectable()
export class AddUserService {
  constructor(private readonly userRepository: UserTypeOrmRepository) {}

  async addUser(dto: AddUserDto) {
    return await this.userRepository.add({
      email: dto.email,
      name: dto.name,
    });
  }
}
