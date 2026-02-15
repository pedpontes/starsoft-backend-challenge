import { Test, TestingModule } from '@nestjs/testing';
import { SeatsService } from './seats.service';
import { DataSource } from 'typeorm';

describe('SeatsService', () => {
  let service: SeatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatsService,
        { provide: DataSource, useValue: { getRepository: jest.fn() } },
      ],
    }).compile();

    service = module.get<SeatsService>(SeatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
