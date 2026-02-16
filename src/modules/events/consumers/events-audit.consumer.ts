import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventLog } from '../entities/event-log.entity';

@Injectable()
export class EventsAuditConsumer implements OnModuleInit {
  private readonly logger = new Logger(EventsAuditConsumer.name);
  private readonly exchange: string;
  private readonly queue: string;
  private ready = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
  ) {
    this.exchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
    this.queue = this.configService.get<string>(
      'EVENTS_AUDIT_QUEUE',
      'cinema.audit',
    );
  }

  async onModuleInit() {
    await this.ensureTopology();
    await this.queueService.consume(
      this.queue,
      async (payload, message) => {
        const eventName = message.fields.routingKey || 'unknown';
        const source =
          message.properties.appId ??
          (message.properties.headers?.['source'] as string | undefined) ??
          null;
        const correlationId =
          message.properties.correlationId ??
          (message.properties.headers?.['correlationId'] as string | undefined) ??
          null;

        await this.eventLogRepository.save({
          eventName,
          payload,
          source,
          correlationId,
        });
      },
      { requeueOnError: true },
    );
  }

  private async ensureTopology() {
    if (this.ready) {
      return;
    }

    await this.queueService.assertExchange(this.exchange, 'topic', {
      durable: true,
    });
    await this.queueService.assertQueue(this.queue, { durable: true });
    await this.queueService.bindQueue(this.queue, this.exchange, '#');
    this.ready = true;

    this.logger.log(
      `Audit consumer ready. queue=${this.queue} exchange=${this.exchange}`,
    );
  }
}
