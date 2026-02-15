import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { EventsService } from '../../../shared/events/usecases/events.service';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { ReservationSeat } from '../entities/reservation-seat.entity';

@Injectable()
export class ReservationExpirationService
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventsService: EventsService,
  ) {}

  onModuleInit() {
    const intervalMs = Number(
      process.env.RESERVATION_EXPIRATION_INTERVAL_MS ?? 5000,
    );
    this.timer = setInterval(() => {
      void this.expireReservations();
    }, intervalMs);

    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async expireReservations() {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Reservation)
      .set({ status: ReservationStatus.EXPIRED })
      .where('status = :status', { status: ReservationStatus.RESERVED })
      .andWhere('expiresAt <= NOW()')
      .returning(['id', 'sessionId', 'userId'])
      .execute();

    const expired = result.raw as Array<{
      id: string;
      sessionId: string;
      userId: string;
    }>;

    if (!expired || expired.length === 0) {
      return;
    }

    const reservationIds = expired.map((row) => row.id);
    const reservationSeatRepo = this.dataSource.getRepository(ReservationSeat);
    const reservationSeats = await reservationSeatRepo.find({
      where: { reservationId: In(reservationIds) },
    });

    const seatMap = new Map<string, string[]>();
    for (const seat of reservationSeats) {
      const list = seatMap.get(seat.reservationId) ?? [];
      list.push(seat.seatId);
      seatMap.set(seat.reservationId, list);
    }

    for (const reservation of expired) {
      const seatIds = seatMap.get(reservation.id) ?? [];
      await this.eventsService.publish('reservation.expired', {
        reservationId: reservation.id,
        sessionId: reservation.sessionId,
        userId: reservation.userId,
        seatIds,
      });

      if (seatIds.length > 0) {
        await this.eventsService.publish('seat.released', {
          reservationId: reservation.id,
          sessionId: reservation.sessionId,
          seatIds,
        });
      }
    }
  }
}
