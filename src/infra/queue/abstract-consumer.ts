import { Logger, OnModuleInit } from '@nestjs/common';
import { ConsumeMessage, Options } from 'amqplib';
import { ConsumeOptions, QueueService } from './rabbitmq.service';

export abstract class AbstractConsumer<T> implements OnModuleInit {
  protected readonly logger: Logger;
  private topologyReady = false;

  protected constructor(
    protected readonly queueService: QueueService,
    loggerContext?: string,
  ) {
    this.logger = new Logger(loggerContext ?? this.constructor.name);
  }

  protected abstract exchangeName(): string;
  protected abstract queueName(): string;
  protected abstract routingKeys(): string[];

  protected exchangeType(): 'direct' | 'topic' | 'fanout' {
    return 'topic';
  }

  protected exchangeOptions(): Options.AssertExchange {
    return { durable: true };
  }

  protected queueOptions(): Options.AssertQueue {
    return { durable: true };
  }

  protected consumeOptions(): ConsumeOptions {
    return { requeueOnError: true, prefetch: 10 };
  }

  async onModuleInit() {
    await this.ensureTopology();
    await this.queueService.consume(
      this.queueName(),
      async (payload, message) => {
        const parsedPayload = await this.parsePayload(payload, message);
        if (parsedPayload === null) {
          return;
        }
        await this.handle(parsedPayload, message);
      },
      this.consumeOptions(),
    );
  }

  protected async ensureTopology() {
    if (this.topologyReady) {
      return;
    }

    const exchange = this.exchangeName();
    const queue = this.queueName();
    await this.queueService.assertExchange(
      exchange,
      this.exchangeType(),
      this.exchangeOptions(),
    );
    await this.queueService.assertQueue(queue, this.queueOptions());
    for (const routingKey of this.routingKeys()) {
      await this.queueService.bindQueue(queue, exchange, routingKey);
    }

    await this.onTopologyReady();
    this.topologyReady = true;
  }

  protected async onTopologyReady(): Promise<void> {
    return;
  }

  protected abstract parsePayload(
    payload: unknown,
    message: ConsumeMessage,
  ): Promise<T | null> | T | null;

  protected abstract handle(
    payload: T,
    message: ConsumeMessage,
  ): Promise<void>;
}
