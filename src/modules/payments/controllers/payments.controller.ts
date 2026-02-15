import { Body, Controller, Post } from '@nestjs/common';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';
import { ConfirmPaymentService } from '../services/confirm-payment/confirm-payment.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly confirmPaymentService: ConfirmPaymentService,
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
}
