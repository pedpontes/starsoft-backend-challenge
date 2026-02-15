import { Injectable } from '@nestjs/common';
import type {
  SeatsPaginationRequest,
  SeatsPaginationResponse,
} from '../../types/seats.pagination';
import { SeatRepository } from '../../repositories/contracts/seat.repository';

@Injectable()
export class LoadSeatsService {
  constructor(private readonly seatRepository: SeatRepository) {}

  async loadSeats(
    request: SeatsPaginationRequest,
  ): Promise<SeatsPaginationResponse> {
    return await this.seatRepository.loadAll(request);
  }
}
