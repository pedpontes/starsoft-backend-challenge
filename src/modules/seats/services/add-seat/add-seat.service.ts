import { Injectable, NotFoundException } from '@nestjs/common';
import { AddSeatDto } from '../../dtos/add-seat.dto';
import { SeatTypeOrmRepository } from '../../repositories/seat.repository';

@Injectable()
export class AddSeatService {
  constructor(private readonly seatRepository: SeatTypeOrmRepository) {}

  async addSeat(dto: AddSeatDto) {
    const seat = await this.seatRepository.add({
      sessionId: dto.sessionId,
      label: dto.label,
    });
    if (!seat) {
      throw new NotFoundException('Session not found.');
    }

    return seat;
  }
}
