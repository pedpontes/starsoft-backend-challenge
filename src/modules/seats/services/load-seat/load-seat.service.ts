import { Injectable, NotFoundException } from '@nestjs/common';
import { SeatRepository } from '../../repositories/contracts/seat.repository';

@Injectable()
export class LoadSeatService {
  constructor(private readonly seatRepository: SeatRepository) {}

  async loadSeat(id: string) {
    const seat = await this.seatRepository.loadById(id);
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    return seat;
  }
}
