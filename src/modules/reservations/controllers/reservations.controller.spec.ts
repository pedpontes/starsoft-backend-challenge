import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { AddReservationService } from '../services/add-reservation/add-reservation.service';
import { LoadReservationsService } from '../services/load-reservations/load-reservations.service';
import { LoadReservationService } from '../services/load-reservation/load-reservation.service';
import { UpdateReservationService } from '../services/update-reservation/update-reservation.service';
import { RemoveReservationService } from '../services/remove-reservation/remove-reservation.service';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        { provide: AddReservationService, useValue: {} },
        { provide: LoadReservationsService, useValue: {} },
        { provide: LoadReservationService, useValue: {} },
        { provide: UpdateReservationService, useValue: {} },
        { provide: RemoveReservationService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
