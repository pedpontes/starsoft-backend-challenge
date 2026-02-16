import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqplib, {
  Channel,
  ChannelModel,
  ConsumeMessage,
  Options,
} from 'amqplib';

export type QueueConsumeHandler = (
  payload: unknown,
  message: ConsumeMessage,
) => Promise<void>;

export type ConsumeOptions = Options.Consume & {
  requeueOnError?: boolean;
};

export abstract class QueueService {
  abstract assertExchange(
    exchange: string,
    type?: 'direct' | 'topic' | 'fanout',
    options?: Options.AssertExchange,
  ): Promise<void>;
  abstract assertQueue(
    queue: string,
    options?: Options.AssertQueue,
  ): Promise<void>;
  abstract bindQueue(
    queue: string,
    exchange: string,
    routingKey: string,
  ): Promise<void>;
  abstract publish(
    exchange: string,
    routingKey: string,
    message: unknown,
    options?: Options.Publish,
  ): Promise<void>;
  abstract consume(
    queue: string,
    handler: QueueConsumeHandler,
    options?: ConsumeOptions,
  ): Promise<void>;
}

@Injectable()
export class RabbitMQService extends QueueService implements OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    const url = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost:5672',
    );
    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();
    return this.channel;
  }

  async assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' = 'topic',
    options: Options.AssertExchange = { durable: true },
  ) {
    const channel = await this.getChannel();
    await channel.assertExchange(exchange, type, options);
  }

  async assertQueue(queue: string, options: Options.AssertQueue = {}) {
    const channel = await this.getChannel();
    await channel.assertQueue(queue, { durable: true, ...options });
  }

  async bindQueue(queue: string, exchange: string, routingKey: string) {
    const channel = await this.getChannel();
    await channel.bindQueue(queue, exchange, routingKey);
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: unknown,
    options: Options.Publish = {},
  ) {
    const channel = await this.getChannel();
    const payload = Buffer.from(JSON.stringify(message));
    channel.publish(exchange, routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
      ...options,
    });
  }

  async consume(
    queue: string,
    handler: QueueConsumeHandler,
    options: ConsumeOptions = {},
  ) {
    const channel = await this.getChannel();
    const { requeueOnError = false, ...consumeOptions } = options;

    await channel.consume(
      queue,
      async (message) => {
        if (!message) {
          return;
        }

        try {
          const payload = this.parseMessage(message);
          await handler(payload, message);
          channel.ack(message);
        } catch {
          channel.nack(message, false, requeueOnError);
        }
      },
      { noAck: false, ...consumeOptions },
    );
  }

  private parseMessage(message: ConsumeMessage): unknown {
    const content = message.content.toString('utf8');
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
