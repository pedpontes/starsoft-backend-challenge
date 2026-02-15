import { Injectable } from '@nestjs/common';
import type {
  SeatsPaginationRequest,
  SeatsPaginationResponse,
} from '../../types/seats.pagination';
import { SeatTypeOrmRepository } from '../../repositories/seat.repository';

@Injectable()
export class LoadSeatsService {
  constructor(private readonly seatRepository: SeatTypeOrmRepository) {}

  async loadSeats(
    request: SeatsPaginationRequest,
  ): Promise<SeatsPaginationResponse> {
    return await this.seatRepository.loadAll(request);
  }
}
