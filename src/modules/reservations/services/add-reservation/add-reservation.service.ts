import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateReservationDto } from '../../dtos/create-reservation.dto';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';
import { SessionRepository } from '../../../sessions/repositories/contracts/session.repository';
import { Seat } from 'src/modules/seats/entities/seat.entity';

@Injectable()
export class AddReservationService {
  #EXPIRE_SEC = 30_000;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async addReservation(dto: CreateReservationDto) {
    const uniqueSeatIds = [...new Set(dto.seatIds)].sort();
    if (uniqueSeatIds.length !== dto.seatIds.length)
      throw new BadRequestException('Duplicated seats in request.');

    const seats = await this.sessionRepository.loadSeatsBySessionId(
      dto.sessionId,
    );

    this.ensureExistsSeats(seats, uniqueSeatIds);
    await this.ensureSeatsAvaibility(dto.sessionId, uniqueSeatIds);

    const expiresAt = new Date(Date.now() + this.#EXPIRE_SEC);
    const reservation = await this.reservationRepository.add({
      sessionId: dto.sessionId,
      userId: dto.userId,
      seatIds: uniqueSeatIds,
      expiresAt,
    });

    return reservation;
  }

  private ensureExistsSeats(seats: Seat[], seatIds: string[]) {
    const seatIdSet = new Set(seats.map((seat) => seat.id));
    const missingSeatsIds = seatIds.filter((seatId) => !seatIdSet.has(seatId));

    if (missingSeatsIds.length > 0)
      throw new BadRequestException(
        'Some seats were not found for this session.',
      );
  }

  private async ensureSeatsAvaibility(sessionId: string, seatIds: string[]) {
    const [soldSeatIds, reservedSeatIds] = await Promise.all([
      this.sessionRepository.loadSoldSeatIds(sessionId, seatIds),
      this.sessionRepository.loadReservedSeatIds(sessionId, seatIds),
    ]);

    if (soldSeatIds.length > 0)
      throw new ConflictException('Some seats are already sold.');
    if (reservedSeatIds.length > 0)
      throw new ConflictException('Some seats are already reserved.');
  }
}
