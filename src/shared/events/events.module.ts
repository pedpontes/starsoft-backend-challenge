import { Module } from '@nestjs/common';
import { EventsService } from './usecases/events.service';
import { QueueModule } from '../../infra/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
