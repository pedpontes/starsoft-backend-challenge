import { Injectable } from '@nestjs/common';
import type {
  SalePaginationRequest,
  SalePaginationResponse,
} from '../types/sales.pagination';
import { SaleTypeOrmRepository } from '../repositories/sale.repository';

@Injectable()
export class SalesService {
  constructor(private readonly saleRepository: SaleTypeOrmRepository) {}

  async loadPurchaseHistory(
    userId: string,
    request: SalePaginationRequest,
  ): Promise<SalePaginationResponse> {
    return this.saleRepository.loadPurchaseHistory(userId, request);
  }
}
