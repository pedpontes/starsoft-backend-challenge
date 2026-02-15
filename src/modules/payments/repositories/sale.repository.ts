import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import {
  SalePaginationOrderBy,
  SalePaginationRequest,
  SalePaginationResponse,
} from '../types/sales.pagination';

export interface SaleRepository {
  loadById(id: Sale['id']): Promise<Sale | null>;
  loadPurchaseHistory(
    userId: Sale['userId'],
    request: SalePaginationRequest,
  ): Promise<SalePaginationResponse>;
}

@Injectable()
export class SaleTypeOrmRepository implements SaleRepository {
  #sale: Repository<Sale>;

  constructor(private readonly dataSource: DataSource) {
    this.#sale = this.dataSource.getRepository(Sale);
  }

  async loadById(id: Sale['id']) {
    try {
      return await this.#sale.findOne({
        where: {
          id: id,
        },
      });
    } catch (e) {
      console.error('(SaleRepository.loadById) Error load Sale', e);
      throw new Error('(SaleRepository.loadById) Error load Sale');
    }
  }

  async loadPurchaseHistory(
    userId: Sale['userId'],
    request: SalePaginationRequest,
  ): Promise<SalePaginationResponse> {
    const page = request.page;
    const limit = request.limit;
    const orderBy = request.orderBy ?? SalePaginationOrderBy.CreatedAtDesc;

    const query = this.#sale
      .createQueryBuilder('sale')
      .where('sale.userId = :userId', { userId });

    const filters = request.filters;
    if (filters?.sessionId) {
      query.andWhere('sale.sessionId = :sessionId', {
        sessionId: filters.sessionId,
      });
    }
    if (filters?.from) {
      query.andWhere('sale.createdAt >= :from', { from: filters.from });
    }
    if (filters?.to) {
      query.andWhere('sale.createdAt <= :to', { to: filters.to });
    }

    const orderValue = String(orderBy);
    const isDesc = orderValue.startsWith('-');
    const field = isDesc ? orderValue.slice(1) : orderValue;
    const column =
      field === 'totalAmount' ? 'sale.totalAmount' : 'sale.createdAt';

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
      console.error(
        '(SaleRepository.loadPurchaseHistory) Error load Sales',
        e,
      );
      throw new Error(
        '(SaleRepository.loadPurchaseHistory) Error load Sales',
      );
    }
  }
}
