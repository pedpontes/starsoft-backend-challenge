import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventName } from '../../../shared/events/types/event-names';
import { EventsService } from '../../../shared/events/usecases/events.service';
import { Reservation } from '../entities/reservation.entity';
import { ReservationRepository } from '../repositories/contracts/reservation.repository';

type ReservationExpirationPayload = {
  reservationId: string;
  sessionId: string;
  seatIds: string[];
};

@Injectable()
export class ReservationExpirationService implements OnModuleInit {
  private readonly logger = new Logger(ReservationExpirationService.name);
  private readonly eventsExchange: string;
  private readonly delayQueue: string;
  private readonly expiredQueue: string;
  private topologyReady = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly reservationRepository: ReservationRepository,
    private readonly eventsService: EventsService,
  ) {
    this.eventsExchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
    this.delayQueue = this.configService.get<string>(
      'RESERVATION_EXPIRATION_DELAY_QUEUE',
      'reservation.expiration.delay',
    );
    this.expiredQueue = this.configService.get<string>(
      'RESERVATION_EXPIRED_QUEUE',
      'reservation.expired',
    );
  }

  async onModuleInit() {
    await this.ensureTopology();
    await this.queueService.consume(
      this.expiredQueue,
      async (payload) => {
        await this.handleExpiration(payload);
      },
      { requeueOnError: true },
    );
  }

  async schedule(reservation: Reservation, seatIds: string[]) {
    await this.ensureTopology();

    const delayMs = Math.max(
      0,
      reservation.expiresAt.getTime() - Date.now(),
    );
    const payload: ReservationExpirationPayload = {
      reservationId: reservation.id,
      sessionId: reservation.sessionId,
      seatIds,
    };

    await this.queueService.publish('', this.delayQueue, payload, {
      expiration: String(delayMs),
    });
  }

  private async ensureTopology() {
    if (this.topologyReady) {
      return;
    }

    await this.queueService.assertExchange(this.eventsExchange, 'topic', {
      durable: true,
    });
    await this.queueService.assertQueue(this.delayQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.eventsExchange,
        'x-dead-letter-routing-key': EventName.ReservationExpired,
      },
    });
    await this.queueService.assertQueue(this.expiredQueue, { durable: true });
    await this.queueService.bindQueue(
      this.expiredQueue,
      this.eventsExchange,
      EventName.ReservationExpired,
    );

    this.topologyReady = true;
  }

  private async handleExpiration(payload: unknown) {
    const message = this.parsePayload(payload);
    if (!message) {
      return;
    }

    const expired = await this.reservationRepository.expireIfNeeded(
      message.reservationId,
      new Date(),
    );

    if (!expired) {
      return;
    }

    try {
      await this.eventsService.publish(EventName.SeatReleased, {
        reservationId: message.reservationId,
        sessionId: message.sessionId,
        seatIds: message.seatIds,
      });
    } catch (error) {
      this.logger.error(
        '(ReservationExpirationService) Failed to publish seat released event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private parsePayload(payload: unknown): ReservationExpirationPayload | null {
    if (!payload || typeof payload !== 'object') {
      this.logger.warn('Invalid expiration payload type.');
      return null;
    }

    const { reservationId, sessionId, seatIds } =
      payload as ReservationExpirationPayload;

    if (!reservationId || !sessionId || !Array.isArray(seatIds)) {
      this.logger.warn('Invalid expiration payload shape.');
      return null;
    }

    return { reservationId, sessionId, seatIds };
  }
}
