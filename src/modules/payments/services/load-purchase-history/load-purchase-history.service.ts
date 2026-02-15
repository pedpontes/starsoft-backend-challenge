import { Injectable } from '@nestjs/common';
import type {
  SalePaginationRequest,
  SalePaginationResponse,
} from '../../types/sales.pagination';
import { SaleRepository } from '../../repositories/contracts/sale.repository';

@Injectable()
export class LoadPurchaseHistoryService {
  constructor(private readonly saleRepository: SaleRepository) {}

  async loadPurchaseHistory(
    userId: string,
    request: SalePaginationRequest,
  ): Promise<SalePaginationResponse> {
    return this.saleRepository.loadPurchaseHistory(userId, request);
  }
}
