import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateReservationDto } from '../../dtos/update-reservation.dto';
import {
  ReservationRepository,
  UpdateReservationDto as UpdateReservationRepositoryDto,
} from '../../repositories/contracts/reservation.repository';

@Injectable()
export class UpdateReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async updateReservation(reservationId: string, dto: UpdateReservationDto) {
    if (!dto.status && !dto.expiresAt) {
      throw new BadRequestException('No fields to update.');
    }

    const updates: UpdateReservationRepositoryDto = {};
    if (dto.status) {
      updates.status = dto.status;
    }
    if (dto.expiresAt) {
      updates.expiresAt = new Date(dto.expiresAt);
    }

    const reservation = await this.reservationRepository.update(
      reservationId,
      updates,
    );
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }
}
