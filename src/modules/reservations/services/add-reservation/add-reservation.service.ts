import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateReservationDto } from '../../dtos/create-reservation.dto';
import { EventsService } from '../../../../shared/events/usecases/events.service';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';
import { SessionRepository } from '../../../sessions/repositories/contracts/session.repository';

@Injectable()
export class AddReservationService {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly eventsService: EventsService,
  ) {}

  async addReservation(dto: CreateReservationDto) {
    const seatIds = [...new Set(dto.seatIds)].sort();
    if (seatIds.length !== dto.seatIds.length) {
      throw new BadRequestException('Duplicated seats in request.');
    }

    const expiresAt = new Date(Date.now() + 30_000);

    const seats = await this.sessionRepository.loadSeatsBySessionId(
      dto.sessionId,
    );
    const seatIdSet = new Set(seats.map((seat) => seat.id));
    const missingSeats = seatIds.filter((seatId) => !seatIdSet.has(seatId));
    if (missingSeats.length > 0) {
      throw new BadRequestException(
        'Some seats were not found for this session.',
      );
    }

    const soldSeatIds = await this.sessionRepository.loadSoldSeatIds(
      dto.sessionId,
      seatIds,
    );
    if (soldSeatIds.length > 0) {
      throw new ConflictException('Some seats are already sold.');
    }

    const reservedSeatIds = await this.sessionRepository.loadReservedSeatIds(
      dto.sessionId,
      seatIds,
    );
    if (reservedSeatIds.length > 0) {
      throw new ConflictException('Some seats are already reserved.');
    }

    const reservation = await this.reservationRepository.add({
      sessionId: dto.sessionId,
      userId: dto.userId,
      seatIds,
      expiresAt,
    });

    await this.eventsService.publish('reservation.created', {
      reservationId: reservation.id,
      sessionId: dto.sessionId,
      userId: dto.userId,
      seatIds,
      expiresAt: expiresAt.toISOString(),
    });

    return reservation;
  }
}
