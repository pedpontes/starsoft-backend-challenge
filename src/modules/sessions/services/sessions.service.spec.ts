import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { DataSource } from 'typeorm';

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: DataSource, useValue: { getRepository: jest.fn() } },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
