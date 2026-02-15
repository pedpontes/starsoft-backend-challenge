import { Injectable, NotFoundException } from '@nestjs/common';
import { SeatTypeOrmRepository } from '../../repositories/seat.repository';

@Injectable()
export class LoadSeatService {
  constructor(private readonly seatRepository: SeatTypeOrmRepository) {}

  async loadSeat(id: string) {
    const seat = await this.seatRepository.loadById(id);
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    return seat;
  }
}
