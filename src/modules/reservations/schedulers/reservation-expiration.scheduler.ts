import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventName } from '../../../shared/events/types/event-names';
import { Reservation } from '../entities/reservation.entity';
import { ReservationExpirationPayload } from '../types/reservation-expiration.payload';

@Injectable()
export class ReservationExpirationScheduler {
  private readonly eventsExchange: string;
  private readonly delayQueue: string;
  private readonly delayRoutingKey: string;
  private topologyReady = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.eventsExchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
    this.delayQueue = this.configService.get<string>(
      'RESERVATION_EXPIRATION_DELAY_QUEUE',
      'reservation.expiration.delay',
    );
    this.delayRoutingKey = this.delayQueue;
  }

  async schedule(reservation: Reservation, seatIds: string[]) {
    await this.ensureTopology();

    const delayMs = Math.max(0, reservation.expiresAt.getTime() - Date.now());

    const payload: ReservationExpirationPayload = {
      reservationId: reservation.id,
      sessionId: reservation.sessionId,
      seatIds,
    };

    await this.queueService.publish(
      this.eventsExchange,
      this.delayRoutingKey,
      payload,
      {
        expiration: String(delayMs),
      },
    );
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
    await this.queueService.bindQueue(
      this.delayQueue,
      this.eventsExchange,
      this.delayRoutingKey,
    );

    this.topologyReady = true;
  }
}
