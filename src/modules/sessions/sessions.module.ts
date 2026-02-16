import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './controllers/sessions.controller';
import { AddSessionService } from './services/add-session/add-session.service';
import { UpdateSessionService } from './services/update-session/update-session.service';
import { RemoveSessionService } from './services/remove-session/remove-session.service';
import { LoadSessionsService } from './services/load-sessions/load-sessions.service';
import { LoadSessionService } from './services/load-session/load-session.service';
import { LoadAvailabilityService } from './services/load-availability/load-availability.service';
import { Session } from './entities/session.entity';
import { SessionRepository } from './repositories/contracts/session.repository';
import { SessionTypeOrmRepository } from './repositories/session.repository';
import { CacheModule } from '../../infra/cache/cache.module';
import { SeatAvailabilityCacheService } from './services/seat-availability-cache/seat-availability-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session]), CacheModule],
  controllers: [SessionsController],
  providers: [
    AddSessionService,
    UpdateSessionService,
    RemoveSessionService,
    LoadSessionsService,
    LoadSessionService,
    LoadAvailabilityService,
    SeatAvailabilityCacheService,
    {
      provide: SessionRepository,
      useClass: SessionTypeOrmRepository,
    },
  ],
  exports: [SessionRepository, SeatAvailabilityCacheService],
})
export class SessionsModule {}
