import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Reservation } from '../../entities/reservation.entity';

@Injectable()
export class RemoveReservationService {
  constructor(private readonly dataSource: DataSource) {}

  async removeReservation(reservationId: string) {
    const reservationRepo = this.dataSource.getRepository(Reservation);
    const result = await reservationRepo.delete({ id: reservationId });
    if (!result.affected) {
      throw new NotFoundException('Reservation not found.');
    }
  }
}
