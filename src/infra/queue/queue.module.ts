import { Module } from '@nestjs/common';
import { QueueService, RabbitMQService } from './rabbitmq.service';

@Module({
  providers: [
    {
      provide: QueueService,
      useClass: RabbitMQService,
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}
