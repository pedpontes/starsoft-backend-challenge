import { Body, Controller, Post } from '@nestjs/common';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';
import { PaymentsService } from '../services/payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('confirm')
  async confirm(@Body() dto: ConfirmPaymentDto) {
    const sale = await this.paymentsService.confirmPayment(dto);
    return {
      id: sale.id,
      reservationId: sale.reservationId,
      totalAmount: sale.totalAmount,
      createdAt: sale.createdAt,
    };
  }
}
