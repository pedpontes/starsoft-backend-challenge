import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSeatDto } from '../../dtos/update-seat.dto';
import { SeatTypeOrmRepository } from '../../repositories/seat.repository';

@Injectable()
export class UpdateSeatService {
  constructor(private readonly seatRepository: SeatTypeOrmRepository) {}

  async updateSeat(id: string, dto: UpdateSeatDto) {
    if (!dto.label) {
      throw new BadRequestException('No fields to update.');
    }

    const seat = await this.seatRepository.update(id, { label: dto.label });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    return seat;
  }
}
