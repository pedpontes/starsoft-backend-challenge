import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateReservationDto } from '../../dtos/create-reservation.dto';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';
import { SessionRepository } from '../../../sessions/repositories/contracts/session.repository';
import { Seat } from 'src/modules/seats/entities/seat.entity';
import { EventsService } from 'src/shared/events/usecases/events.service';
import { EventName } from 'src/shared/events/types/event-names';
import { SeatAvailabilityCacheService } from '../../../sessions/services/seat-availability-cache/seat-availability-cache.service';
import { SeatStatus } from '../../../sessions/types/seat-status';
import { ReservationExpirationScheduler } from '../../schedulers/reservation-expiration.scheduler';
import { Reservation } from '../../entities/reservation.entity';
import { SeatAlreadyLockedError } from '../../errors/seat-already-locked.error';

@Injectable()
export class AddReservationService {
  #EXPIRE_SEC = 30_000;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly eventsService: EventsService,
    private readonly seatAvailabilityCacheService: SeatAvailabilityCacheService,
    private readonly reservationExpirationScheduler: ReservationExpirationScheduler,
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
    let reservation: Reservation;
    try {
      reservation = await this.reservationRepository.add({
        sessionId: dto.sessionId,
        userId: dto.userId,
        seatIds: uniqueSeatIds,
        expiresAt,
      });
    } catch (error) {
      if (error instanceof SeatAlreadyLockedError) {
        throw new ConflictException('Some seats are already reserved.');
      }
      throw error;
    }

    const ttlSeconds = Math.max(
      1,
      Math.ceil((expiresAt.getTime() - Date.now()) / 1000),
    );
    await this.safeUpdateCachedSeats(
      dto.sessionId,
      uniqueSeatIds,
      SeatStatus.RESERVED,
      ttlSeconds,
    );
    await this.safeScheduleExpiration(reservation, uniqueSeatIds);
    await this.eventsService.publish(EventName.ReservationCreated, reservation);

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

  private async safeUpdateCachedSeats(
    sessionId: string,
    seatIds: string[],
    status: SeatStatus,
    ttlSeconds: number,
  ) {
    try {
      await this.seatAvailabilityCacheService.setSeatStatuses(
        sessionId,
        seatIds,
        status,
        ttlSeconds,
      );
    } catch {}
  }

  private async safeScheduleExpiration(
    reservation: Reservation,
    seatIds: string[],
  ) {
    try {
      await this.reservationExpirationScheduler.schedule(reservation, seatIds);
    } catch {}
  }
}
