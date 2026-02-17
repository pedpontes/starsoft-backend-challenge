import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { ReservationSeat } from '../entities/reservation-seat.entity';
import { SeatLock } from '../entities/seat-lock.entity';
import { SeatAlreadyLockedError } from '../errors/seat-already-locked.error';
import { IdempotencyKeyConflictError } from '../errors/idempotency-key-conflict.error';
import {
  ReservationRepository,
  AddReservationInput,
  UpdateReservationInput,
} from './contracts/reservation.repository';
import {
  ReservationsPaginationOrderBy,
  ReservationsPaginationRequest,
} from '../types/reservations.pagination';

@Injectable()
export class ReservationTypeOrmRepository extends ReservationRepository {
  #reservation: Repository<Reservation>;
  #seatLock: Repository<SeatLock>;
  #logger: Logger;

  constructor(private readonly dataSource: DataSource) {
    super();
    this.#reservation = this.dataSource.getRepository(Reservation);
    this.#seatLock = this.dataSource.getRepository(SeatLock);
    this.#logger = new Logger(ReservationTypeOrmRepository.name);
  }

  async add(input: AddReservationInput) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const reservationRepo = manager.getRepository(Reservation);
        const reservationSeatRepo = manager.getRepository(ReservationSeat);
        const seatLockRepo = manager.getRepository(SeatLock);

        const reservation = reservationRepo.create({
          sessionId: input.sessionId,
          userId: input.userId,
          status: input.status ?? ReservationStatus.RESERVED,
          expiresAt: input.expiresAt,
          idempotencyKey: input.idempotencyKey ?? null,
        });

        await reservationRepo.save(reservation);

        const reservationSeats = input.seatIds.map((seatId) =>
          reservationSeatRepo.create({
            reservationId: reservation.id,
            seatId,
          }),
        );

        await reservationSeatRepo.save(reservationSeats);

        const seatLocks = input.seatIds.map((seatId) =>
          seatLockRepo.create({
            reservationId: reservation.id,
            sessionId: input.sessionId,
            seatId,
            expiresAt: input.expiresAt,
          }),
        );

        await seatLockRepo.save(seatLocks);

        return reservation;
      });
    } catch (e) {
      const error = e as QueryFailedError & {
        code?: string;
        constraint?: string;
      };
      if (
        error.code === '23505' &&
        error.constraint === 'uniq_seat_locks_active_seat'
      ) {
        throw new SeatAlreadyLockedError();
      }
      if (
        error.code === '23505' &&
        error.constraint === 'uniq_reservations_user_idempotency_key'
      ) {
        throw new IdempotencyKeyConflictError();
      }
      this.#logger.error(
        '(ReservationRepository.add) Error create Reservation',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error('(ReservationRepository.add) Error create Reservation');
    }
  }

  async loadById(id: Reservation['id'], includeSeats = false) {
    try {
      return await this.#reservation.findOne({
        where: { id },
        relations: includeSeats ? { seats: true } : undefined,
      });
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.loadById) Error load Reservation',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.loadById) Error load Reservation',
      );
    }
  }

  async loadAll(request: ReservationsPaginationRequest) {
    const page = request.page;
    const limit = request.limit;
    const orderBy =
      request.orderBy ?? ReservationsPaginationOrderBy.CreatedAtDesc;

    const qb = this.#reservation.createQueryBuilder('reservation');

    const filters = request.filters;
    if (filters?.userId) {
      qb.andWhere('reservation.userId = :userId', { userId: filters.userId });
    }
    if (filters?.sessionId) {
      qb.andWhere('reservation.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }
    if (filters?.status) {
      qb.andWhere('reservation.status = :status', { status: filters.status });
    }
    if (filters?.from) {
      qb.andWhere('reservation.createdAt >= :from', { from: filters.from });
    }
    if (filters?.to) {
      qb.andWhere('reservation.createdAt <= :to', { to: filters.to });
    }

    const orderValue = String(orderBy);
    const isDesc = orderValue.startsWith('-');
    const field = isDesc ? orderValue.slice(1) : orderValue;
    const column =
      field === 'expiresAt' ? 'reservation.expiresAt' : 'reservation.createdAt';

    qb.orderBy(column, isDesc ? 'DESC' : 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    try {
      const [data, total] = await qb.getManyAndCount();
      return {
        data,
        page,
        limit,
        count: { total },
      };
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.loadAll) Error load Reservations',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.loadAll) Error load Reservations',
      );
    }
  }

  async loadByIdempotencyKey(
    userId: Reservation['userId'],
    idempotencyKey: string,
    includeSeats = false,
  ) {
    try {
      return await this.#reservation.findOne({
        where: { userId, idempotencyKey },
        relations: includeSeats ? { seats: true } : undefined,
      });
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.loadByIdempotencyKey) Error load Reservation',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.loadByIdempotencyKey) Error load Reservation',
      );
    }
  }

  async update(id: Reservation['id'], updates: UpdateReservationInput) {
    try {
      const reservation = await this.#reservation.findOne({
        where: { id },
      });
      if (!reservation) {
        return null;
      }

      const next = this.#reservation.merge(reservation, updates);
      return await this.#reservation.save(next);
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.update) Error update Reservation',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.update) Error update Reservation',
      );
    }
  }

  async expireIfNeeded(id: Reservation['id'], now: Date) {
    try {
      const result = await this.#reservation
        .createQueryBuilder('reservation')
        .update(Reservation)
        .set({ status: ReservationStatus.EXPIRED })
        // UpdateQueryBuilder doesn't define the alias in the UPDATE statement,
        // so referencing "reservation." causes a missing FROM-clause error.
        .where('id = :id', { id })
        .andWhere('status = :status', {
          status: ReservationStatus.RESERVED,
        })
        .andWhere('expiresAt <= :now', { now })
        .execute();

      return (result.affected ?? 0) > 0;
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.expireIfNeeded) Error expire Reservation',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.expireIfNeeded) Error expire Reservation',
      );
    }
  }

  async releaseSeatLocks(reservationId: Reservation['id'], releasedAt: Date) {
    try {
      await this.#seatLock
        .createQueryBuilder('seatLock')
        .update(SeatLock)
        .set({ releasedAt })
        // UpdateQueryBuilder doesn't define the alias in the UPDATE statement,
        // so referencing "seatLock." causes a missing FROM-clause error.
        .where('reservationId = :reservationId', { reservationId })
        .andWhere('releasedAt IS NULL')
        .execute();
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.releaseSeatLocks) Error release seat locks',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.releaseSeatLocks) Error release seat locks',
      );
    }
  }

  async remove(id: Reservation['id']) {
    try {
      const result = await this.#reservation.delete({ id });
      return (result.affected ?? 0) > 0;
    } catch (e) {
      this.#logger.error(
        '(ReservationRepository.remove) Error remove Reservation',
        e instanceof Error ? e.stack : String(e),
      );
      throw new Error(
        '(ReservationRepository.remove) Error remove Reservation',
      );
    }
  }
}
