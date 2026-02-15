import { Injectable, NotFoundException } from '@nestjs/common';
import { SeatTypeOrmRepository } from '../../repositories/seat.repository';

@Injectable()
export class RemoveSeatService {
  constructor(private readonly seatRepository: SeatTypeOrmRepository) {}

  async removeSeat(id: string) {
    const removed = await this.seatRepository.remove(id);
    if (!removed) {
      throw new NotFoundException('Seat not found.');
    }
  }
}
