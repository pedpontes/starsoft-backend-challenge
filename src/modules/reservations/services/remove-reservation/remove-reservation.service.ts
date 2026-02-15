import { Injectable, NotFoundException } from '@nestjs/common';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';

@Injectable()
export class RemoveReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async removeReservation(reservationId: string) {
    const removed = await this.reservationRepository.remove(reservationId);
    if (!removed) {
      throw new NotFoundException('Reservation not found.');
    }
  }
}
