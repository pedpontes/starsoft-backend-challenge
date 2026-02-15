import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seat } from '../../seats/entities/seat.entity';
import { ReservationSeat } from '../entities/reservation-seat.entity';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { SaleSeat } from '../../payments/entities/sale-seat.entity';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import type {
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../types/reservations.pagination';
import { ReservationsPaginationOrderBy } from '../types/reservations.pagination';

@Injectable()
export class ReservationsService {
  constructor(private readonly dataSource: DataSource) {}

  async addReservation(dto: CreateReservationDto) {
    const seatIds = [...new Set(dto.seatIds)].sort();
    if (seatIds.length !== dto.seatIds.length) {
      throw new BadRequestException('Duplicated seats in request.');
    }

    const expiresAt = new Date(Date.now() + 30_000);

    const reservation = await this.dataSource.transaction(async (manager) => {
      const seatRepo = manager.getRepository(Seat);
      const reservationRepo = manager.getRepository(Reservation);
      const reservationSeatRepo = manager.getRepository(ReservationSeat);
      const saleSeatRepo = manager.getRepository(SaleSeat);

      const seats = await seatRepo
        .createQueryBuilder('seat')
        .setLock('pessimistic_write')
        .where('seat.id IN (:...seatIds)', { seatIds })
        .andWhere('seat.sessionId = :sessionId', { sessionId: dto.sessionId })
        .orderBy('seat.id', 'ASC')
        .getMany();

      if (seats.length !== seatIds.length) {
        throw new BadRequestException(
          'Some seats were not found for this session.',
        );
      }

      const soldCount = await saleSeatRepo
        .createQueryBuilder('saleSeat')
        .innerJoin('saleSeat.sale', 'sale')
        .where('saleSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('sale.sessionId = :sessionId', { sessionId: dto.sessionId })
        .getCount();

      if (soldCount > 0) {
        throw new ConflictException('Some seats are already sold.');
      }

      const activeReservations = await reservationSeatRepo
        .createQueryBuilder('reservationSeat')
        .innerJoin('reservationSeat.reservation', 'reservation')
        .where('reservationSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('reservation.sessionId = :sessionId', {
          sessionId: dto.sessionId,
        })
        .andWhere('reservation.status = :status', {
          status: ReservationStatus.RESERVED,
        })
        .andWhere('reservation.expiresAt > NOW()')
        .getCount();

      if (activeReservations > 0) {
        throw new ConflictException('Some seats are already reserved.');
      }

      const reservation = reservationRepo.create({
        sessionId: dto.sessionId,
        userId: dto.userId,
        status: ReservationStatus.RESERVED,
        expiresAt,
      });

      await reservationRepo.save(reservation);

      const reservationSeats = seatIds.map((seatId) =>
        reservationSeatRepo.create({
          reservationId: reservation.id,
          seatId,
        }),
      );

      await reservationSeatRepo.save(reservationSeats);

      return reservation;
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

  async loadReservation(reservationId: string) {
    const reservationRepo = this.dataSource.getRepository(Reservation);
    const reservation = await reservationRepo.findOne({
      where: { id: reservationId },
      relations: {
        seats: true,
      },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }

  async loadReservations(
    request: ReservationsPaginationRequest,
  ): Promise<ReservationsPaginationResponse> {
    const page = request.page;
    const limit = request.limit;
    const orderBy =
      request.orderBy ?? ReservationsPaginationOrderBy.CreatedAtDesc;

    const reservationRepo = this.dataSource.getRepository(Reservation);
    const qb = reservationRepo.createQueryBuilder('reservation');

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

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      page,
      limit,
      count: { total },
    };
  }

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

  async removeReservation(reservationId: string) {
    const reservationRepo = this.dataSource.getRepository(Reservation);
    const result = await reservationRepo.delete({ id: reservationId });
    if (!result.affected) {
      throw new NotFoundException('Reservation not found.');
    }
  }
}
