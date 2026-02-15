import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserDto } from '../../dtos/update-user.dto';
import { UserRepository } from '../../repositories/contracts/user.repository';

@Injectable()
export class UpdateUserService {
  constructor(private readonly userRepository: UserRepository) {}

  async updateUser(userId: string, dto: UpdateUserDto) {
    if (!dto.name && !dto.email) {
      throw new BadRequestException('No fields to update.');
    }

    const user = await this.userRepository.update(userId, dto);
    if (!user) throw new NotFoundException('User not found.');

    return user;
  }
}
