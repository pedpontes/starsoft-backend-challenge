import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seat } from '../../seats/entities/seat.entity';
import { ReservationSeat } from '../../reservations/entities/reservation-seat.entity';
import { ReservationStatus } from '../../reservations/entities/reservation.entity';
import { SaleSeat } from '../../payments/entities/sale-seat.entity';
import { Session } from '../entities/session.entity';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { UpdateSessionDto } from '../dtos/update-session.dto';
import type {
  SessionsPaginationRequest,
  SessionsPaginationResponse,
} from '../types/sessions.pagination';
import { SessionsPaginationOrderBy } from '../types/sessions.pagination';

@Injectable()
export class SessionsService {
  constructor(private readonly dataSource: DataSource) {}

  async addSession(dto: CreateSessionDto) {
    const labels =
      dto.seatLabels && dto.seatLabels.length > 0
        ? dto.seatLabels
        : this.generateSeatLabels(dto.seatsCount);

    if (!labels || labels.length < 16) {
      throw new BadRequestException('At least 16 seats are required.');
    }

    const unique = new Set(labels);
    if (unique.size !== labels.length) {
      throw new BadRequestException('Duplicated seat labels.');
    }

    return this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(Session);
      const seatRepo = manager.getRepository(Seat);

      const session = sessionRepo.create({
        movieTitle: dto.movieTitle,
        startsAt: new Date(dto.startsAt),
        room: dto.room,
        price: dto.price.toFixed(2),
      });

      await sessionRepo.save(session);

      const seats = labels.map((label) =>
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
  }

  async loadSessions(
    request: SessionsPaginationRequest,
  ): Promise<SessionsPaginationResponse> {
    const page = request.page;
    const limit = request.limit;
    const orderBy = request.orderBy ?? SessionsPaginationOrderBy.StartsAtAsc;

    const sessionRepo = this.dataSource.getRepository(Session);
    const query = sessionRepo.createQueryBuilder('session');

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
    const column =
      field === 'price'
        ? 'session.price'
        : field === 'createdAt'
          ? 'session.createdAt'
          : 'session.startsAt';

    query
      .orderBy(column, isDesc ? 'DESC' : 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return {
      data,
      page,
      limit,
      count: { total },
    };
  }

  async loadSession(sessionId: string) {
    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    return session;
  }

  async loadAvailability(sessionId: string) {
    const sessionRepo = this.dataSource.getRepository(Session);
    const seatRepo = this.dataSource.getRepository(Seat);
    const reservationSeatRepo = this.dataSource.getRepository(ReservationSeat);
    const saleSeatRepo = this.dataSource.getRepository(SaleSeat);

    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    const seats = await seatRepo.find({
      where: { sessionId },
      order: { label: 'ASC' },
    });

    if (seats.length === 0) {
      return { sessionId, seats: [] };
    }

    const seatIds = seats.map((seat) => seat.id);

    const reservedRows = await reservationSeatRepo
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

    const soldRows = await saleSeatRepo
      .createQueryBuilder('saleSeat')
      .select('saleSeat.seatId', 'seatId')
      .innerJoin('saleSeat.sale', 'sale')
      .where('saleSeat.seatId IN (:...seatIds)', { seatIds })
      .andWhere('sale.sessionId = :sessionId', { sessionId })
      .getRawMany<{ seatId: string }>();

    const reservedSet = new Set(reservedRows.map((row) => row.seatId));
    const soldSet = new Set(soldRows.map((row) => row.seatId));

    const availability = seats.map((seat) => ({
      id: seat.id,
      label: seat.label,
      status: soldSet.has(seat.id)
        ? 'SOLD'
        : reservedSet.has(seat.id)
          ? 'RESERVED'
          : 'AVAILABLE',
    }));

    return {
      sessionId,
      seats: availability,
    };
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto) {
    if (
      !dto.movieTitle &&
      !dto.startsAt &&
      !dto.room &&
      dto.price === undefined
    ) {
      throw new BadRequestException('No fields to update.');
    }

    const sessionRepo = this.dataSource.getRepository(Session);
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    if (dto.movieTitle) {
      session.movieTitle = dto.movieTitle;
    }
    if (dto.startsAt) {
      session.startsAt = new Date(dto.startsAt);
    }
    if (dto.room) {
      session.room = dto.room;
    }
    if (dto.price !== undefined) {
      session.price = dto.price.toFixed(2);
    }

    return sessionRepo.save(session);
  }

  async removeSession(sessionId: string) {
    const sessionRepo = this.dataSource.getRepository(Session);
    const result = await sessionRepo.delete({ id: sessionId });
    if (!result.affected) {
      throw new NotFoundException('Session not found.');
    }
  }

  private generateSeatLabels(seatsCount?: number) {
    if (!seatsCount) {
      return null;
    }

    return Array.from({ length: seatsCount }, (_, index) => `S${index + 1}`);
  }
}
