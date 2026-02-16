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
import { PaymentRepository } from './repositories/contracts/payment.repository';
import { PaymentTypeOrmRepository } from './repositories/payment.repository';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleSeat]),
    EventsModule,
    SessionsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    ConfirmPaymentService,
    LoadPurchaseHistoryService,
    {
      provide: SaleRepository,
      useClass: SaleTypeOrmRepository,
    },
    {
      provide: PaymentRepository,
      useClass: PaymentTypeOrmRepository,
    },
  ],
})
export class PaymentsModule {}
