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
import { Reservation } from '../../entities/reservation.entity';
import { SeatAlreadyLockedError } from '../../errors/seat-already-locked.error';
import { IdempotencyKeyConflictError } from '../../errors/idempotency-key-conflict.error';

@Injectable()
export class AddReservationService {
  #RESERVATION_TTL_MS = 30_000;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly eventsService: EventsService,
    private readonly seatAvailabilityCacheService: SeatAvailabilityCacheService,
  ) {}

  async addReservation(dto: CreateReservationDto, idempotencyKey?: string) {
    const normalizedIdempotencyKey =
      this.normalizeIdempotencyKey(idempotencyKey);
    const seatIds = this.ensureUniqueSeatIds(dto.seatIds);
    const existing = await this.loadExistingReservationForIdempotency(
      dto,
      normalizedIdempotencyKey,
      seatIds,
    );
    if (existing) {
      return existing;
    }

    const seats = await this.sessionRepository.loadSeatsBySessionId(
      dto.sessionId,
    );

    this.ensureSeatsExist(seats, seatIds);
    await this.ensureSeatsAvailability(dto.sessionId, seatIds);

    const expiresAt = this.buildExpirationDate();
    const reservation = await this.createReservation(
      dto,
      seatIds,
      normalizedIdempotencyKey,
      expiresAt,
    );

    const ttlSeconds = this.computeTtlSeconds(expiresAt);
    await Promise.allSettled([
      this.safeUpdateCachedSeats(
        dto.sessionId,
        seatIds,
        SeatStatus.RESERVED,
        ttlSeconds,
      ),
      this.eventsService.publish(EventName.ReservationCreated, reservation),
    ]);

    return reservation;
  }

  private normalizeIdempotencyKey(idempotencyKey?: string) {
    const normalized = idempotencyKey?.trim();
    return normalized ? normalized : undefined;
  }

  private ensureUniqueSeatIds(seatIds: string[]) {
    const uniqueSeatIds = [...new Set(seatIds)].sort();
    if (uniqueSeatIds.length !== seatIds.length)
      throw new BadRequestException('Duplicated seats in request.');
    return uniqueSeatIds;
  }

  private async loadExistingReservationForIdempotency(
    dto: CreateReservationDto,
    idempotencyKey: string | undefined,
    seatIds: string[],
  ) {
    if (!idempotencyKey) return undefined;

    const existing = await this.reservationRepository.loadByIdempotencyKey(
      dto.userId,
      idempotencyKey,
      true,
    );
    if (!existing) return undefined;

    this.ensureIdempotencyMatchesRequest(existing, dto.sessionId, seatIds);
    return existing;
  }

  private buildExpirationDate() {
    return new Date(Date.now() + this.#RESERVATION_TTL_MS);
  }

  private computeTtlSeconds(expiresAt: Date) {
    return Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
  }

  private async createReservation(
    dto: CreateReservationDto,
    seatIds: string[],
    idempotencyKey: string | undefined,
    expiresAt: Date,
  ) {
    try {
      return await this.reservationRepository.add({
        sessionId: dto.sessionId,
        userId: dto.userId,
        seatIds,
        expiresAt,
        idempotencyKey,
      });
    } catch (error) {
      const existing = await this.tryLoadExistingOnConflict(
        error,
        dto,
        seatIds,
        idempotencyKey,
      );
      if (existing) {
        return existing;
      }
      if (error instanceof SeatAlreadyLockedError) {
        throw new ConflictException('Some seats are already reserved.');
      }
      if (error instanceof IdempotencyKeyConflictError) {
        throw new ConflictException('Idempotency key already used.');
      }
      throw error;
    }
  }

  private async tryLoadExistingOnConflict(
    error: unknown,
    dto: CreateReservationDto,
    seatIds: string[],
    idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey) return undefined;
    if (
      !(error instanceof SeatAlreadyLockedError) &&
      !(error instanceof IdempotencyKeyConflictError)
    ) {
      return undefined;
    }

    const existing = await this.reservationRepository.loadByIdempotencyKey(
      dto.userId,
      idempotencyKey,
      true,
    );
    if (!existing) return undefined;

    this.ensureIdempotencyMatchesRequest(existing, dto.sessionId, seatIds);
    return existing;
  }

  private ensureIdempotencyMatchesRequest(
    existing: Reservation,
    sessionId: string,
    seatIds: string[],
  ) {
    if (existing.sessionId !== sessionId) {
      throw new ConflictException('Idempotency key already used.');
    }

    const existingSeatIds = (existing.seats ?? [])
      .map((seat) => seat.seatId)
      .sort();
    if (existingSeatIds.length !== seatIds.length) {
      throw new ConflictException('Idempotency key already used.');
    }

    for (let i = 0; i < seatIds.length; i += 1) {
      if (existingSeatIds[i] !== seatIds[i]) {
        throw new ConflictException('Idempotency key already used.');
      }
    }
  }

  private ensureSeatsExist(seats: Seat[], seatIds: string[]) {
    const seatIdSet = new Set(seats.map((seat) => seat.id));
    const missingSeatsIds = seatIds.filter((seatId) => !seatIdSet.has(seatId));

    if (missingSeatsIds.length > 0)
      throw new BadRequestException(
        'Some seats were not found for this session.',
      );
  }

  private async ensureSeatsAvailability(sessionId: string, seatIds: string[]) {
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

  // Expiration is scheduled by ReservationCreatedConsumer via events.
}
