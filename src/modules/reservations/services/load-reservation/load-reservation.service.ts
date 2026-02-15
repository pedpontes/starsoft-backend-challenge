import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';

@Injectable()
export class LoadReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async loadReservation(reservationId: string) {
    const reservation = await this.reservationRepository.loadById(
      reservationId,
      true,
    );
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }
}
