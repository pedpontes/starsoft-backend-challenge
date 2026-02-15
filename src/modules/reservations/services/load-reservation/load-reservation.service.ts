import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Reservation } from '../../entities/reservation.entity';

@Injectable()
export class LoadReservationService {
  constructor(private readonly dataSource: DataSource) {}

  async loadReservation(reservationId: string) {
    const reservationRepo = this.dataSource.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({
      where: { id: reservationId },
      relations: {
        seats: true,
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }
}
