import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSeatDto } from '../../dtos/update-seat.dto';
import { SeatRepository } from '../../repositories/contracts/seat.repository';

@Injectable()
export class UpdateSeatService {
  constructor(private readonly seatRepository: SeatRepository) {}

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
