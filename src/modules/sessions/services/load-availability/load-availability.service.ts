import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionTypeOrmRepository } from '../../repositories/session.repository';

@Injectable()
export class LoadAvailabilityService {
  private soldSet: Set<string>;
  private reservedSet: Set<string>;

  constructor(private readonly sessionRepository: SessionTypeOrmRepository) {}

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
    const reservedIds = await this.sessionRepository.loadReservedSeatIds(
      sessionId,
      seatIds,
    );
    const soldIds = await this.sessionRepository.loadSoldSeatIds(
      sessionId,
      seatIds,
    );

    this.reservedSet = new Set(reservedIds);
    this.soldSet = new Set(soldIds);

    const availability = seats.map((seat) => ({
      id: seat.id,
      label: seat.label,
      status: this.getSeatStatus(seat.id),
    }));

    return {
      sessionId,
      seats: availability,
    };
  }

  private getSeatStatus(seatId: string) {
    if (this.soldSet.has(seatId)) return 'SOLD';
    if (this.reservedSet.has(seatId)) return 'RESERVED';
    return 'AVAILABLE';
  }
}
