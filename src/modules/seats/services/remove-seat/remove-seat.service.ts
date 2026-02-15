import { Injectable, NotFoundException } from '@nestjs/common';
import { SeatRepository } from '../../repositories/contracts/seat.repository';

@Injectable()
export class RemoveSeatService {
  constructor(private readonly seatRepository: SeatRepository) {}

  async removeSeat(id: string) {
    const removed = await this.seatRepository.remove(id);
    if (!removed) {
      throw new NotFoundException('Seat not found.');
    }
  }
}
