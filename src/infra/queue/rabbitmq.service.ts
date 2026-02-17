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
  prefetch?: number;
  prefetchGlobal?: boolean;
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
  private publishChannel?: Channel;
  private readonly consumerChannels = new Set<Channel>();

  constructor(private readonly configService: ConfigService) {
    super();
  }

  private async getConnection(): Promise<ChannelModel> {
    if (this.connection) {
      return this.connection;
    }
    const url = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost:5672',
    );
    this.connection = await amqplib.connect(url);
    return this.connection;
  }

  private async getPublishChannel(): Promise<Channel> {
    if (this.publishChannel) {
      return this.publishChannel;
    }
    const connection = await this.getConnection();
    this.publishChannel = await connection.createChannel();
    return this.publishChannel;
  }

  private async createConsumerChannel(): Promise<Channel> {
    const connection = await this.getConnection();
    const channel = await connection.createChannel();
    this.consumerChannels.add(channel);
    channel.once('close', () => this.consumerChannels.delete(channel));
    channel.once('error', () => this.consumerChannels.delete(channel));
    return channel;
  }

  async assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' = 'topic',
    options: Options.AssertExchange = { durable: true },
  ) {
    const channel = await this.getPublishChannel();
    await channel.assertExchange(exchange, type, options);
  }

  async assertQueue(queue: string, options: Options.AssertQueue = {}) {
    const channel = await this.getPublishChannel();
    await channel.assertQueue(queue, { durable: true, ...options });
  }

  async bindQueue(queue: string, exchange: string, routingKey: string) {
    const channel = await this.getPublishChannel();
    await channel.bindQueue(queue, exchange, routingKey);
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: unknown,
    options: Options.Publish = {},
  ) {
    const channel = await this.getPublishChannel();
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
    const channel = await this.createConsumerChannel();
    const {
      requeueOnError = false,
      prefetch,
      prefetchGlobal,
      ...consumeOptions
    } = options;

    if (prefetch !== undefined) {
      await channel.prefetch(prefetch, prefetchGlobal ?? false);
    }

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
    const consumerChannels = Array.from(this.consumerChannels);
    this.consumerChannels.clear();
    await Promise.allSettled(
      consumerChannels.map(async (channel) => {
        try {
          await channel.close();
        } catch {
          return;
        }
      }),
    );
    if (this.publishChannel) {
      await this.publishChannel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
