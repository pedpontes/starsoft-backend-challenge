import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './controllers/payments.controller';
import { ConfirmPaymentService } from './services/confirm-payment/confirm-payment.service';
import { Sale } from './entities/sale.entity';
import { SaleSeat } from './entities/sale-seat.entity';
import { EventsModule } from '../../shared/events/events.module';
import { LoadPurchaseHistoryService } from './services/load-purchase-history/load-purchase-history.service';
import { SaleRepository } from './repositories/contracts/sale.repository';
import { SaleTypeOrmRepository } from './repositories/sale.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleSeat]), EventsModule],
  controllers: [PaymentsController],
  providers: [
    ConfirmPaymentService,
    LoadPurchaseHistoryService,
    {
      provide: SaleRepository,
      useClass: SaleTypeOrmRepository,
    },
  ],
})
export class PaymentsModule {}
