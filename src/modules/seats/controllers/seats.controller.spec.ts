import { Test, TestingModule } from '@nestjs/testing';
import { SeatsController } from './seats.controller';
import { AddSeatService } from '../services/add-seat/add-seat.service';
import { LoadSeatService } from '../services/load-seat/load-seat.service';
import { LoadSeatsService } from '../services/load-seats/load-seats.service';
import { UpdateSeatService } from '../services/update-seat/update-seat.service';
import { RemoveSeatService } from '../services/remove-seat/remove-seat.service';

describe('SeatsController', () => {
  let controller: SeatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatsController],
      providers: [
        { provide: AddSeatService, useValue: {} },
        { provide: LoadSeatService, useValue: {} },
        { provide: LoadSeatsService, useValue: {} },
        { provide: UpdateSeatService, useValue: {} },
        { provide: RemoveSeatService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SeatsController>(SeatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
