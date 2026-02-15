import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Seat } from '../entities/seat.entity';
import { Session } from '../../sessions/entities/session.entity';
import { AddSeatDto } from '../dtos/add-seat.dto';
import {
  SeatsPaginationOrderBy,
  SeatsPaginationRequest,
  SeatsPaginationResponse,
} from '../types/seats.pagination';

export interface SeatRepository {
  add(addSeat: AddSeatDto): Promise<Seat | null>;
  loadById(id: Seat['id']): Promise<Seat | null>;
  loadAll(request: SeatsPaginationRequest): Promise<SeatsPaginationResponse>;
  update(id: Seat['id'], updates: Partial<AddSeatDto>): Promise<Seat | null>;
  remove(id: Seat['id']): Promise<boolean>;
}

@Injectable()
export class SeatTypeOrmRepository implements SeatRepository {
  #seat: Repository<Seat>;
  #session: Repository<Session>;

  constructor(private readonly dataSource: DataSource) {
    this.#seat = this.dataSource.getRepository(Seat);
    this.#session = this.dataSource.getRepository(Session);
  }

  async add(addSeat: AddSeatDto) {
    try {
      const session = await this.#session.findOne({
        where: { id: addSeat.sessionId },
      });
      if (!session) {
        return null;
      }

      const seat = this.#seat.create({
        sessionId: addSeat.sessionId,
        label: addSeat.label,
      });

      return await this.#seat.save(seat);
    } catch (e) {
      console.error('(SeatRepository.add) Error create Seat', e);
      throw new Error('(SeatRepository.add) Error create Seat');
    }
  }

  async loadById(id: Seat['id']) {
    try {
      return await this.#seat.findOne({
        where: { id: id },
      });
    } catch (e) {
      console.error('(SeatRepository.loadById) Error load Seat', e);
      throw new Error('(SeatRepository.loadById) Error load Seat');
    }
  }

  async loadAll(request: SeatsPaginationRequest) {
    const page = request.page;
    const limit = request.limit;
    const orderBy = request.orderBy ?? SeatsPaginationOrderBy.LabelAsc;

    const query = this.#seat.createQueryBuilder('seat');

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

    try {
      const [data, total] = await query.getManyAndCount();
      return {
        data,
        page,
        limit,
        count: { total },
      };
    } catch (e) {
      console.error('(SeatRepository.loadAll) Error load Seats', e);
      throw new Error('(SeatRepository.loadAll) Error load Seats');
    }
  }

  async update(id: Seat['id'], updates: Partial<AddSeatDto>) {
    try {
      const seat = await this.#seat.findOne({
        where: { id: id },
      });
      if (!seat) {
        return null;
      }

      const next = this.#seat.merge(seat, updates);
      return await this.#seat.save(next);
    } catch (e) {
      console.error('(SeatRepository.update) Error update Seat', e);
      throw new Error('(SeatRepository.update) Error update Seat');
    }
  }

  async remove(id: Seat['id']) {
    try {
      const result = await this.#seat.delete({ id });
      return (result.affected ?? 0) > 0;
    } catch (e) {
      console.error('(SeatRepository.remove) Error remove Seat', e);
      throw new Error('(SeatRepository.remove) Error remove Seat');
    }
  }
}
