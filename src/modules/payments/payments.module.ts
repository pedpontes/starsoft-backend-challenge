import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsService } from './services/payments.service';
import { Sale } from './entities/sale.entity';
import { SaleSeat } from './entities/sale-seat.entity';
import { EventsModule } from '../../shared/events/events.module';
import { SalesService } from './services/sales.service';
import { SaleTypeOrmRepository } from './repositories/sale.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleSeat]), EventsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, SalesService, SaleTypeOrmRepository],
  exports: [SalesService],
})
export class PaymentsModule {}
