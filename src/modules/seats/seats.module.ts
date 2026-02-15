import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatsController } from './controllers/seats.controller';
import { AddSeatService } from './services/add-seat/add-seat.service';
import { LoadSeatService } from './services/load-seat/load-seat.service';
import { LoadSeatsService } from './services/load-seats/load-seats.service';
import { UpdateSeatService } from './services/update-seat/update-seat.service';
import { RemoveSeatService } from './services/remove-seat/remove-seat.service';
import { Seat } from './entities/seat.entity';
import { SeatTypeOrmRepository } from './repositories/seat.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Seat])],
  controllers: [SeatsController],
  providers: [
    AddSeatService,
    LoadSeatService,
    LoadSeatsService,
    UpdateSeatService,
    RemoveSeatService,
    SeatTypeOrmRepository,
  ],
})
export class SeatsModule {}
