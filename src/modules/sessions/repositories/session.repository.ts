import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Seat } from '../../seats/entities/seat.entity';
import { ReservationSeat } from '../../reservations/entities/reservation-seat.entity';
import { ReservationStatus } from '../../reservations/entities/reservation.entity';
import { SaleSeat } from '../../payments/entities/sale-seat.entity';
import { Session } from '../entities/session.entity';
import {
  SessionRepository,
  AddSessionDto,
  UpdateSessionDto,
} from './contracts/session.repository';
import {
  SessionsPaginationOrderBy,
  SessionsPaginationRequest,
  SessionsPaginationResponse,
} from '../types/sessions.pagination';

@Injectable()
export class SessionTypeOrmRepository extends SessionRepository {
  #session: Repository<Session>;
  #seat: Repository<Seat>;
  #reservationSeat: Repository<ReservationSeat>;
  #saleSeat: Repository<SaleSeat>;

  constructor(private readonly dataSource: DataSource) {
    super();
    this.#session = this.dataSource.getRepository(Session);
    this.#seat = this.dataSource.getRepository(Seat);
    this.#reservationSeat = this.dataSource.getRepository(ReservationSeat);
    this.#saleSeat = this.dataSource.getRepository(SaleSeat);
  }

  async add(addSession: AddSessionDto, seatLabels: string[]) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const sessionRepo = manager.getRepository(Session);
        const seatRepo = manager.getRepository(Seat);

        const session = sessionRepo.create({
          movieTitle: addSession.movieTitle,
          startsAt: addSession.startsAt,
          room: addSession.room,
          price: addSession.price,
        });

        await sessionRepo.save(session);

        const seats = seatLabels.map((label) =>
          seatRepo.create({
            sessionId: session.id,
            label,
          }),
        );

        await seatRepo.save(seats);

        return {
          sessionId: session.id,
          seatsCount: seats.length,
        };
      });
    } catch (e) {
      console.error('(SessionRepository.add) Error create Session', e);
      throw new Error('(SessionRepository.add) Error create Session');
    }
  }

  async loadAll(request: SessionsPaginationRequest) {
    const page = request.page;
    const limit = request.limit;
    const orderBy = request.orderBy ?? SessionsPaginationOrderBy.StartsAtAsc;

    const query = this.#session.createQueryBuilder('session');

    const filters = request.filters;
    if (filters?.movieTitle) {
      query.andWhere('session.movieTitle ILIKE :movieTitle', {
        movieTitle: `%${filters.movieTitle}%`,
      });
    }
    if (filters?.room) {
      query.andWhere('session.room ILIKE :room', {
        room: `%${filters.room}%`,
      });
    }
    if (filters?.from) {
      query.andWhere('session.startsAt >= :from', { from: filters.from });
    }
    if (filters?.to) {
      query.andWhere('session.startsAt <= :to', { to: filters.to });
    }

    const orderValue = String(orderBy);
    const isDesc = orderValue.startsWith('-');
    const field = isDesc ? orderValue.slice(1) : orderValue;
    const orderColumns: Record<string, string> = {
      price: 'session.price',
      createdAt: 'session.createdAt',
      startsAt: 'session.startsAt',
    };
    const column = orderColumns[field] ?? orderColumns.startsAt;

    query
      .orderBy(column, isDesc ? 'DESC' : 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    try {
      const [data, total] = await query.getManyAndCount();
      return {
        data,
        page,
        limit,
        count: { total },
      };
    } catch (e) {
      console.error('(SessionRepository.loadAll) Error load Sessions', e);
      throw new Error('(SessionRepository.loadAll) Error load Sessions');
    }
  }

  async loadById(id: Session['id']) {
    try {
      return await this.#session.findOne({
        where: { id: id },
      });
    } catch (e) {
      console.error('(SessionRepository.loadById) Error load Session', e);
      throw new Error('(SessionRepository.loadById) Error load Session');
    }
  }

  async loadSeatsBySessionId(sessionId: Session['id']) {
    try {
      return await this.#seat.find({
        where: { sessionId },
        order: { label: 'ASC' },
      });
    } catch (e) {
      console.error(
        '(SessionRepository.loadSeatsBySessionId) Error load seats',
        e,
      );
      throw new Error('(SessionRepository.loadSeatsBySessionId) Error load seats');
    }
  }

  async loadReservedSeatIds(
    sessionId: Session['id'],
    seatIds: Seat['id'][],
  ) {
    try {
      const reservedRows = await this.#reservationSeat
        .createQueryBuilder('reservationSeat')
        .select('reservationSeat.seatId', 'seatId')
        .innerJoin('reservationSeat.reservation', 'reservation')
        .where('reservationSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('reservation.sessionId = :sessionId', { sessionId })
        .andWhere('reservation.status = :status', {
          status: ReservationStatus.RESERVED,
        })
        .andWhere('reservation.expiresAt > NOW()')
        .getRawMany<{ seatId: string }>();

      return reservedRows.map((row) => row.seatId);
    } catch (e) {
      console.error(
        '(SessionRepository.loadReservedSeatIds) Error load reserved seats',
        e,
      );
      throw new Error(
        '(SessionRepository.loadReservedSeatIds) Error load reserved seats',
      );
    }
  }

  async loadSoldSeatIds(sessionId: Session['id'], seatIds: Seat['id'][]) {
    try {
      const soldRows = await this.#saleSeat
        .createQueryBuilder('saleSeat')
        .select('saleSeat.seatId', 'seatId')
        .innerJoin('saleSeat.sale', 'sale')
        .where('saleSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('sale.sessionId = :sessionId', { sessionId })
        .getRawMany<{ seatId: string }>();

      return soldRows.map((row) => row.seatId);
    } catch (e) {
      console.error(
        '(SessionRepository.loadSoldSeatIds) Error load sold seats',
        e,
      );
      throw new Error(
        '(SessionRepository.loadSoldSeatIds) Error load sold seats',
      );
    }
  }

  async update(id: Session['id'], updates: UpdateSessionDto) {
    try {
      const session = await this.#session.findOne({
        where: { id: id },
      });
      if (!session) {
        return null;
      }

      const next = this.#session.merge(session, updates);
      return await this.#session.save(next);
    } catch (e) {
      console.error('(SessionRepository.update) Error update Session', e);
      throw new Error('(SessionRepository.update) Error update Session');
    }
  }

  async remove(id: Session['id']) {
    try {
      const result = await this.#session.delete({ id });
      return (result.affected ?? 0) > 0;
    } catch (e) {
      console.error('(SessionRepository.remove) Error remove Session', e);
      throw new Error('(SessionRepository.remove) Error remove Session');
    }
  }
}
