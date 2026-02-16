import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export abstract class CacheService {
  abstract get(key: string): Promise<string | null>;
  abstract set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void>;
  abstract del(key: string): Promise<void>;
  abstract hset(key: string, field: string, value: string): Promise<void>;
  abstract hgetall(key: string): Promise<Record<string, string>>;
  abstract expire(key: string, ttlSeconds: number): Promise<void>;
}

@Injectable()
export class RedisCacheService extends CacheService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    super();
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }
    await this.client.set(key, value);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async hset(key: string, field: string, value: string) {
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string) {
    return this.client.hgetall(key);
  }

  async expire(key: string, ttlSeconds: number) {
    await this.client.expire(key, ttlSeconds);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
