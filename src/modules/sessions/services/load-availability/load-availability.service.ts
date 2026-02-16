import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../../repositories/contracts/session.repository';
import { SeatAvailabilityCacheService } from '../seat-availability-cache/seat-availability-cache.service';
import { SeatStatus } from '../../types/seat-status';

@Injectable()
export class LoadAvailabilityService {
  #TTL_S = 30;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly seatAvailabilityCacheService: SeatAvailabilityCacheService,
  ) {}

  async loadAvailability(sessionId: string) {
    const session = await this.sessionRepository.loadById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    const seats = await this.sessionRepository.loadSeatsBySessionId(sessionId);
    if (seats.length === 0) {
      return { sessionId, seats: [] };
    }

    const seatIds = seats.map((seat) => seat.id);
    const cached = await this.safeGetCachedStatuses(sessionId);
    const hasCacheForAllSeats =
      cached && Object.keys(cached).length === seatIds.length;

    let reservedSet: Set<string>;
    let soldSet: Set<string>;

    if (hasCacheForAllSeats && cached) {
      const cachedSeats = Object.entries(cached);
      reservedSet = new Set(
        cachedSeats
          .filter(([, status]) => status === SeatStatus.RESERVED)
          .map(([seatId]) => seatId),
      );
      soldSet = new Set(
        cachedSeats
          .filter(([, status]) => status === SeatStatus.SOLD)
          .map(([seatId]) => seatId),
      );
    } else {
      const [reservedIds, soldIds] = await Promise.all([
        this.sessionRepository.loadReservedSeatIds(sessionId, seatIds),
        this.sessionRepository.loadSoldSeatIds(sessionId, seatIds),
      ]);

      reservedSet = new Set(reservedIds);
      soldSet = new Set(soldIds);

      await this.safeSetCachedStatuses(
        sessionId,
        seatIds,
        reservedSet,
        soldSet,
      );
    }

    const availability = seats.map((seat) => ({
      id: seat.id,
      label: seat.label,
      status: this.getSeatStatus(seat.id, reservedSet, soldSet),
    }));

    return {
      sessionId,
      seats: availability,
    };
  }

  private getSeatStatus(
    seatId: string,
    reservedSet: Set<string>,
    soldSet: Set<string>,
  ): SeatStatus {
    if (soldSet.has(seatId)) return SeatStatus.SOLD;
    if (reservedSet.has(seatId)) return SeatStatus.RESERVED;
    return SeatStatus.AVAILABLE;
  }

  private async safeGetCachedStatuses(sessionId: string) {
    try {
      const cached =
        await this.seatAvailabilityCacheService.getSeatStatuses(sessionId);
      return Object.keys(cached).length > 0 ? cached : null;
    } catch {
      return null;
    }
  }

  private async safeSetCachedStatuses(
    sessionId: string,
    seatIds: string[],
    reservedSet: Set<string>,
    soldSet: Set<string>,
  ) {
    const reservedIds = seatIds.filter((seatId) => reservedSet.has(seatId));
    const soldIds = seatIds.filter((seatId) => soldSet.has(seatId));
    const availableIds = seatIds.filter(
      (seatId) => !reservedSet.has(seatId) && !soldSet.has(seatId),
    );

    await Promise.allSettled([
      this.seatAvailabilityCacheService.setSeatStatuses(
        sessionId,
        reservedIds,
        SeatStatus.RESERVED,
        this.#TTL_S,
      ),
      this.seatAvailabilityCacheService.setSeatStatuses(
        sessionId,
        soldIds,
        SeatStatus.SOLD,
        this.#TTL_S,
      ),
      this.seatAvailabilityCacheService.setSeatStatuses(
        sessionId,
        availableIds,
        SeatStatus.AVAILABLE,
        this.#TTL_S,
      ),
    ]);
  }
}
