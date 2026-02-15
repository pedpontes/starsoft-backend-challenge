import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './controllers/reservations.controller';
import { AddReservationService } from './services/add-reservation/add-reservation.service';
import { LoadReservationsService } from './services/load-reservations/load-reservations.service';
import { LoadReservationService } from './services/load-reservation/load-reservation.service';
import { UpdateReservationService } from './services/update-reservation/update-reservation.service';
import { RemoveReservationService } from './services/remove-reservation/remove-reservation.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationSeat } from './entities/reservation-seat.entity';
import { ReservationExpirationService } from './jobs/reservation-expiration.service';
import { EventsModule } from '../../shared/events/events.module';
import { ReservationRepository } from './repositories/contracts/reservation.repository';
import { ReservationTypeOrmRepository } from './repositories/reservation.repository';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, ReservationSeat]),
    EventsModule,
    SessionsModule,
  ],
  controllers: [ReservationsController],
  providers: [
    AddReservationService,
    LoadReservationsService,
    LoadReservationService,
    UpdateReservationService,
    RemoveReservationService,
    ReservationExpirationService,
    {
      provide: ReservationRepository,
      useClass: ReservationTypeOrmRepository,
    },
  ],
})
export class ReservationsModule {}
