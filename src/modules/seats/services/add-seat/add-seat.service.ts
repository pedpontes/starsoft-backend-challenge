import { Injectable, NotFoundException } from '@nestjs/common';
import { AddSeatDto } from '../../dtos/add-seat.dto';
import {
  AddSeatDto as AddSeatRepositoryDto,
  SeatRepository,
} from '../../repositories/contracts/seat.repository';

@Injectable()
export class AddSeatService {
  constructor(private readonly seatRepository: SeatRepository) {}

  async addSeat(dto: AddSeatDto) {
    const addSeat: AddSeatRepositoryDto = {
      sessionId: dto.sessionId,
      label: dto.label,
    };
    const seat = await this.seatRepository.add(addSeat);
    if (!seat) {
      throw new NotFoundException('Session not found.');
    }

    return seat;
  }
}
