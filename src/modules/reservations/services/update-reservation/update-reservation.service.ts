import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UpdateReservationDto } from '../../dtos/update-reservation.dto';
import { Reservation } from '../../entities/reservation.entity';

@Injectable()
export class UpdateReservationService {
  constructor(private readonly dataSource: DataSource) {}

  async updateReservation(reservationId: string, dto: UpdateReservationDto) {
    if (!dto.status && !dto.expiresAt) {
      throw new BadRequestException('No fields to update.');
    }

    const reservationRepo = this.dataSource.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    if (dto.status) {
      reservation.status = dto.status;
    }
    if (dto.expiresAt) {
      reservation.expiresAt = new Date(dto.expiresAt);
    }

    return reservationRepo.save(reservation);
  }
}
