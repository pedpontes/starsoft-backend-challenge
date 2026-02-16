import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../../infra/queue/rabbitmq.service';

@Injectable()
export class EventsService {
  private readonly exchange: string;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.exchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
  }

  async publish(eventName: string, payload: unknown) {
    await this.queueService.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
    await this.queueService.publish(this.exchange, eventName, payload, {
      persistent: true,
    });
  }
}
