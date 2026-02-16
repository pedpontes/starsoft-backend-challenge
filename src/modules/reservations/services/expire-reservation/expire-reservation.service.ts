import { Injectable, Logger } from '@nestjs/common';
import { EventsService } from 'src/shared/events/usecases/events.service';
import { EventName } from 'src/shared/events/types/event-names';
import { SeatAvailabilityCacheService } from '../../../sessions/services/seat-availability-cache/seat-availability-cache.service';
import { SeatStatus } from '../../../sessions/types/seat-status';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';
import { ReservationExpirationPayload } from '../../types/reservation-expiration.payload';

@Injectable()
export class ExpireReservationService {
  #CACHE_TTL_S = 30;
  private readonly logger = new Logger(ExpireReservationService.name);

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly eventsService: EventsService,
    private readonly seatAvailabilityCacheService: SeatAvailabilityCacheService,
  ) {}

  async expireReservation(payload: ReservationExpirationPayload) {
    const expired = await this.reservationRepository.expireIfNeeded(
      payload.reservationId,
      new Date(),
    );

    if (!expired) {
      return false;
    }

    await Promise.all([
      this.safeUpdateCache(payload),
      this.safePublishSeatReleased(payload),
    ]);

    return true;
  }

  private async safeUpdateCache(payload: ReservationExpirationPayload) {
    try {
      await this.seatAvailabilityCacheService.setSeatStatuses(
        payload.sessionId,
        payload.seatIds,
        SeatStatus.AVAILABLE,
        this.#CACHE_TTL_S,
      );
    } catch (error) {
      this.logger.warn(
        '(ExpireReservationService) Failed to update cache',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async safePublishSeatReleased(payload: ReservationExpirationPayload) {
    try {
      await this.eventsService.publish(EventName.SeatReleased, {
        reservationId: payload.reservationId,
        sessionId: payload.sessionId,
        seatIds: payload.seatIds,
      });
    } catch (error) {
      this.logger.error(
        '(ExpireReservationService) Failed to publish seat released event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
