import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { ReservationSeat } from '../entities/reservation-seat.entity';
import {
  ReservationRepository,
  AddReservationDto,
  UpdateReservationDto,
} from './contracts/reservation.repository';
import {
  ReservationsPaginationOrderBy,
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../types/reservations.pagination';

@Injectable()
export class ReservationTypeOrmRepository extends ReservationRepository {
  #reservation: Repository<Reservation>;
  #reservationSeat: Repository<ReservationSeat>;

  constructor(private readonly dataSource: DataSource) {
    super();
    this.#reservation = this.dataSource.getRepository(Reservation);
    this.#reservationSeat = this.dataSource.getRepository(ReservationSeat);
  }

  async add(input: AddReservationDto) {
    try {
      const reservation = this.#reservation.create({
        sessionId: input.sessionId,
        userId: input.userId,
        status: input.status ?? ReservationStatus.RESERVED,
        expiresAt: input.expiresAt,
      });

      await this.#reservation.save(reservation);

      const reservationSeats = input.seatIds.map((seatId) =>
        this.#reservationSeat.create({
          reservationId: reservation.id,
          seatId,
        }),
      );

      await this.#reservationSeat.save(reservationSeats);

      return reservation;
    } catch (e) {
      console.error('(ReservationRepository.add) Error create Reservation', e);
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
      console.error(
        '(ReservationRepository.loadById) Error load Reservation',
        e,
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
      console.error(
        '(ReservationRepository.loadAll) Error load Reservations',
        e,
      );
      throw new Error(
        '(ReservationRepository.loadAll) Error load Reservations',
      );
    }
  }

  async update(id: Reservation['id'], updates: UpdateReservationDto) {
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
      console.error(
        '(ReservationRepository.update) Error update Reservation',
        e,
      );
      throw new Error(
        '(ReservationRepository.update) Error update Reservation',
      );
    }
  }

  async remove(id: Reservation['id']) {
    try {
      const result = await this.#reservation.delete({ id });
      return (result.affected ?? 0) > 0;
    } catch (e) {
      console.error(
        '(ReservationRepository.remove) Error remove Reservation',
        e,
      );
      throw new Error(
        '(ReservationRepository.remove) Error remove Reservation',
      );
    }
  }
}
