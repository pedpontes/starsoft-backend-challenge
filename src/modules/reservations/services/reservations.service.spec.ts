import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { DataSource } from 'typeorm';

describe('ReservationsService', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: DataSource, useValue: { getRepository: jest.fn() } },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
