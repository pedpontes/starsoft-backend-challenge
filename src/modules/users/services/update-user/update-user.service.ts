import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from '../../dtos/update-user.dto';
import {
  UpdateUserInput,
  UserRepository,
} from '../../repositories/contracts/user.repository';

@Injectable()
export class UpdateUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async updateUser(userId: string, dto: UpdateUserDto) {
    if (!dto.name && !dto.email) {
      throw new BadRequestException('No fields to update.');
    }

    const updates: UpdateUserInput = {};
    if (dto.name) {
      updates.name = dto.name;
    }
    if (dto.email) {
      updates.email = dto.email;
    }

    const user = await this.userRepository.update(userId, updates);
    if (!user) throw new NotFoundException('User not found.');

    return user;
  }
}
