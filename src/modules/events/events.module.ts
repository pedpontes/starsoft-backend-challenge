import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../../infra/queue/queue.module';
import { EventsAuditConsumer } from './consumers/events-audit.consumer';
import { EventLog } from './entities/event-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EventLog]), QueueModule],
  providers: [EventsAuditConsumer],
})
export class EventsAuditModule {}
