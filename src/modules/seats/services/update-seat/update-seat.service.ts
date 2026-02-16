import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSeatDto } from '../../dtos/update-seat.dto';
import {
  SeatRepository,
  UpdateSeatDto as UpdateSeatRepositoryDto,
} from '../../repositories/contracts/seat.repository';

@Injectable()
export class UpdateSeatService {
  constructor(private readonly seatRepository: SeatRepository) {}

  async updateSeat(id: string, dto: UpdateSeatDto) {
    if (!dto.label) {
      throw new BadRequestException('No fields to update.');
    }

    const updates: UpdateSeatRepositoryDto = { label: dto.label };
    const seat = await this.seatRepository.update(id, updates);
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    return seat;
  }
}
