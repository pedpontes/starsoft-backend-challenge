import { Injectable } from '@nestjs/common';
import type {
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../../types/reservations.pagination';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';

@Injectable()
export class LoadReservationsService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async loadReservations(
    request: ReservationsPaginationRequest,
  ): Promise<ReservationsPaginationResponse> {
    return await this.reservationRepository.loadAll(request);
  }
}
