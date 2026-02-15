import { Test, TestingModule } from '@nestjs/testing';
import { SeatsController } from './seats.controller';
import { SeatsService } from '../services/seats.service';

describe('SeatsController', () => {
  let controller: SeatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatsController],
      providers: [{ provide: SeatsService, useValue: {} }],
    }).compile();

    controller = module.get<SeatsController>(SeatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
