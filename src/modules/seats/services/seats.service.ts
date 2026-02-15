import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seat } from '../entities/seat.entity';
import { Session } from '../../sessions/entities/session.entity';
import { AddSeatDto } from '../dtos/add-seat.dto';
import { UpdateSeatDto } from '../dtos/update-seat.dto';
import type {
  SeatsPaginationRequest,
  SeatsPaginationResponse,
} from '../types/seats.pagination';
import { SeatsPaginationOrderBy } from '../types/seats.pagination';

@Injectable()
export class SeatsService {
  constructor(private readonly dataSource: DataSource) {}

  async addSeat(dto: AddSeatDto) {
    const sessionRepo = this.dataSource.getRepository(Session);
    const seatRepo = this.dataSource.getRepository(Seat);

    const session = await sessionRepo.findOne({ where: { id: dto.sessionId } });
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    const seat = seatRepo.create({
      sessionId: dto.sessionId,
      label: dto.label,
    });

    return seatRepo.save(seat);
  }

  async loadSeat(id: string) {
    const seatRepo = this.dataSource.getRepository(Seat);
    const seat = await seatRepo.findOne({ where: { id } });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    return seat;
  }

  async loadSeats(
    request: SeatsPaginationRequest,
  ): Promise<SeatsPaginationResponse> {
    const page = request.page;
    const limit = request.limit;
    const orderBy = request.orderBy ?? SeatsPaginationOrderBy.LabelAsc;

    const seatRepo = this.dataSource.getRepository(Seat);
    const query = seatRepo.createQueryBuilder('seat');

    const filters = request.filters;
    if (filters?.sessionId) {
      query.andWhere('seat.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }
    if (filters?.label) {
      query.andWhere('seat.label ILIKE :label', {
        label: `%${filters.label}%`,
      });
    }

    const orderValue = String(orderBy);
    const isDesc = orderValue.startsWith('-');
    const field = isDesc ? orderValue.slice(1) : orderValue;
    const column = field === 'createdAt' ? 'seat.createdAt' : 'seat.label';

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

  async updateSeat(id: string, dto: UpdateSeatDto) {
    if (!dto.label) {
      throw new BadRequestException('No fields to update.');
    }

    const seatRepo = this.dataSource.getRepository(Seat);
    const seat = await seatRepo.findOne({ where: { id } });
    if (!seat) {
      throw new NotFoundException('Seat not found.');
    }

    seat.label = dto.label;
    return seatRepo.save(seat);
  }

  async removeSeat(id: string) {
    const seatRepo = this.dataSource.getRepository(Seat);
    const result = await seatRepo.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Seat not found.');
    }
  }
}
