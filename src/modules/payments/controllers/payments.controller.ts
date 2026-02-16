import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';
import { SalePaginationRequestDto } from '../dtos/sale-pagination-request.dto';
import { ConfirmPaymentService } from '../services/confirm-payment/confirm-payment.service';
import { LoadPurchaseHistoryService } from '../services/load-purchase-history/load-purchase-history.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly confirmPaymentService: ConfirmPaymentService,
    private readonly loadPurchaseHistoryService: LoadPurchaseHistoryService,
  ) {}

  @Post('confirm')
  async confirm(@Body() dto: ConfirmPaymentDto) {
    const sale = await this.confirmPaymentService.confirmPayment(dto);
    return {
      id: sale.id,
      reservationId: sale.reservationId,
      totalAmount: sale.totalAmount,
      createdAt: sale.createdAt,
    };
  }

  @Get('users/:id/sales')
  async loadUserSales(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() pagination: SalePaginationRequestDto,
  ) {
    const sales = await this.loadPurchaseHistoryService.loadPurchaseHistory(
      id,
      pagination,
    );
    return { userId: id, sales };
  }
}
