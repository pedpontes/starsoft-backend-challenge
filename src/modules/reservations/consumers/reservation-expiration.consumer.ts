import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventName } from '../../../shared/events/types/event-names';
import { ReservationExpirationPayload } from '../types/reservation-expiration.payload';
import { ExpireReservationService } from '../services/expire-reservation/expire-reservation.service';

@Injectable()
export class ReservationExpirationConsumer implements OnModuleInit {
  private readonly logger = new Logger(ReservationExpirationConsumer.name);
  private readonly eventsExchange: string;
  private readonly expiredQueue: string;
  private topologyReady = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly expireReservationService: ExpireReservationService,
  ) {
    this.eventsExchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
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

  private async ensureTopology() {
    if (this.topologyReady) {
      return;
    }

    await this.queueService.assertExchange(this.eventsExchange, 'topic', {
      durable: true,
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

    await this.expireReservationService.expireReservation(message);
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
