import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';
import { AbstractConsumer } from '../../../infra/queue/abstract-consumer';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventName } from '../../../shared/events/types/event-names';
import { ReservationExpirationPayload } from '../types/reservation-expiration.payload';
import { ExpireReservationService } from '../services/expire-reservation/expire-reservation.service';

@Injectable()
export class ReservationExpirationConsumer extends AbstractConsumer<ReservationExpirationPayload> {
  private readonly eventsExchange: string;
  private readonly expiredQueue: string;

  constructor(
    queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly expireReservationService: ExpireReservationService,
  ) {
    super(queueService);
    this.eventsExchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
    this.expiredQueue = this.configService.get<string>(
      'RESERVATION_EXPIRED_QUEUE',
      'reservation.expired',
    );
  }

  protected exchangeName(): string {
    return this.eventsExchange;
  }

  protected queueName(): string {
    return this.expiredQueue;
  }

  protected routingKeys(): string[] {
    return [EventName.ReservationExpired];
  }

  protected async parsePayload(
    payload: unknown,
    _message: ConsumeMessage,
  ): Promise<ReservationExpirationPayload | null> {
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

  protected async handle(
    payload: ReservationExpirationPayload,
    _message: ConsumeMessage,
  ): Promise<void> {
    await this.expireReservationService.expireReservation(payload);
  }
}
