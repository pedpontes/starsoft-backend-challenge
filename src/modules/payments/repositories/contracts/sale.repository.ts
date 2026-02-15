import { Sale } from '../../entities/sale.entity';
import {
  SalePaginationRequest,
  SalePaginationResponse,
} from '../../types/sales.pagination';

export abstract class SaleRepository {
  abstract loadById(id: Sale['id']): Promise<Sale | null>;
  abstract loadPurchaseHistory(
    userId: Sale['userId'],
    request: SalePaginationRequest,
  ): Promise<SalePaginationResponse>;
}
