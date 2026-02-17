import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ConsumeMessage } from 'amqplib';
import { Repository } from 'typeorm';
import { AbstractConsumer } from '../../../infra/queue/abstract-consumer';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventLog } from '../entities/event-log.entity';

@Injectable()
export class EventsAuditConsumer extends AbstractConsumer<unknown> {
  private readonly exchange: string;
  private readonly queue: string;

  constructor(
    queueService: QueueService,
    private readonly configService: ConfigService,
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
  ) {
    super(queueService);
    this.exchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
    this.queue = this.configService.get<string>(
      'EVENTS_AUDIT_QUEUE',
      'cinema.audit',
    );
  }

  protected exchangeName(): string {
    return this.exchange;
  }

  protected queueName(): string {
    return this.queue;
  }

  protected routingKeys(): string[] {
    return ['#'];
  }

  protected async onTopologyReady(): Promise<void> {
    this.logger.log(
      `Audit consumer ready. queue=${this.queue} exchange=${this.exchange}`,
    );
  }

  protected parsePayload(payload: unknown, _message: ConsumeMessage): unknown {
    return payload;
  }

  protected async handle(
    payload: unknown,
    message: ConsumeMessage,
  ): Promise<void> {
    const eventName = message.fields.routingKey || 'unknown';

    await this.eventLogRepository.save({
      eventName,
      payload,
      source: null,
      correlationId: null,
    });
  }
}
