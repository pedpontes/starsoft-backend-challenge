import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  ReservationsPaginationRequest,
  ReservationsPaginationResponse,
} from '../../types/reservations.pagination';
import { ReservationsPaginationOrderBy } from '../../types/reservations.pagination';
import { Reservation } from '../../entities/reservation.entity';

@Injectable()
export class LoadReservationsService {
  constructor(private readonly dataSource: DataSource) {}

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
}
