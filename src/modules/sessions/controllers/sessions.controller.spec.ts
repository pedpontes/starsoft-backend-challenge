import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { AddSessionService } from '../services/add-session/add-session.service';
import { UpdateSessionService } from '../services/update-session/update-session.service';
import { RemoveSessionService } from '../services/remove-session/remove-session.service';
import { LoadSessionsService } from '../services/load-sessions/load-sessions.service';
import { LoadSessionService } from '../services/load-session/load-session.service';
import { LoadAvailabilityService } from '../services/load-availability/load-availability.service';

describe('SessionsController', () => {
  let controller: SessionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        { provide: AddSessionService, useValue: {} },
        { provide: LoadSessionsService, useValue: {} },
        { provide: LoadSessionService, useValue: {} },
        { provide: LoadAvailabilityService, useValue: {} },
        { provide: UpdateSessionService, useValue: {} },
        { provide: RemoveSessionService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
