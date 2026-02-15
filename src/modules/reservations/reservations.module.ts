import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './controllers/reservations.controller';
import { ReservationsService } from './services/reservations.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationSeat } from './entities/reservation-seat.entity';
import { ReservationExpirationService } from './jobs/reservation-expiration.service';
import { EventsModule } from '../../shared/events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationSeat]),
    EventsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationExpirationService],
})
export class ReservationsModule {}
