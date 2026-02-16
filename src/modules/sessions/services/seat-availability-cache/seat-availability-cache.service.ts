import { Injectable } from '@nestjs/common';
import { CacheService } from '../../../../infra/cache/redis.service';
import { SeatStatus } from '../../types/seat-status';

@Injectable()
export class SeatAvailabilityCacheService {
  constructor(private readonly cacheService: CacheService) {}

  async setSeatStatuses(
    sessionId: string,
    seatIds: string[],
    status: SeatStatus,
    ttlSeconds?: number,
  ) {
    if (!seatIds || seatIds.length === 0) {
      return;
    }

    const key = this.getSessionSeatsKey(sessionId);
    await Promise.all(
      seatIds.map((seatId) => this.cacheService.hset(key, seatId, status)),
    );

    if (ttlSeconds) {
      await this.cacheService.expire(key, ttlSeconds);
    }
  }

  async getSeatStatuses(
    sessionId: string,
  ): Promise<Record<string, SeatStatus>> {
    const key = this.getSessionSeatsKey(sessionId);
    const raw = await this.cacheService.hgetall(key);
    const result: Record<string, SeatStatus> = {};

    for (const [seatId, value] of Object.entries(raw)) {
      const status = this.normalizeStatus(value);
      if (status) {
        result[seatId] = status;
      }
    }

    return result;
  }

  async getSeatStatus(
    sessionId: string,
    seatId: string,
  ): Promise<SeatStatus | null> {
    const statuses = await this.getSeatStatuses(sessionId);
    return statuses[seatId] ?? null;
  }

  private getSessionSeatsKey(sessionId: string) {
    return `session:${sessionId}:seats`;
  }

  private normalizeStatus(value?: string): SeatStatus | null {
    if (!value) {
      return null;
    }
    return (Object.values(SeatStatus) as string[]).includes(value)
      ? (value as SeatStatus)
      : null;
  }
}
