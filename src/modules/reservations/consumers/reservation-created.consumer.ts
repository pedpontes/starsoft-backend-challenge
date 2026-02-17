import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConsumeMessage } from 'amqplib';
import { AbstractConsumer } from '../../../infra/queue/abstract-consumer';
import { QueueService } from '../../../infra/queue/rabbitmq.service';
import { EventName } from '../../../shared/events/types/event-names';
import { Reservation } from '../entities/reservation.entity';
import { ReservationRepository } from '../repositories/contracts/reservation.repository';
import { ReservationExpirationScheduler } from '../schedulers/reservation-expiration.scheduler';

@Injectable()
export class ReservationCreatedConsumer extends AbstractConsumer<
  Pick<Reservation, 'id'>
> {
  private readonly eventsExchange: string;
  private readonly createdQueue: string;

  constructor(
    queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly reservationRepository: ReservationRepository,
    private readonly reservationExpirationScheduler: ReservationExpirationScheduler,
  ) {
    super(queueService);
    this.eventsExchange = this.configService.get<string>(
      'EVENTS_EXCHANGE',
      'cinema.events',
    );
    this.createdQueue = this.configService.get<string>(
      'RESERVATION_CREATED_QUEUE',
      'reservation.created.scheduler',
    );
  }

  protected exchangeName(): string {
    return this.eventsExchange;
  }

  protected queueName(): string {
    return this.createdQueue;
  }

  protected routingKeys(): string[] {
    return [EventName.ReservationCreated];
  }

  protected async parsePayload(
    payload: unknown,
    _message: ConsumeMessage,
  ): Promise<Pick<Reservation, 'id'> | null> {
    if (!payload || typeof payload !== 'object') {
      this.logger.warn(
        '(ReservationCreatedConsumer) Invalid created payload type.',
      );
      return null;
    }

    const { id } = payload as Pick<Reservation, 'id'>;
    if (!id) {
      this.logger.warn(
        '(ReservationCreatedConsumer) Invalid created payload shape.',
      );
      return null;
    }

    return { id };
  }

  protected async handle(
    payload: Pick<Reservation, 'id'>,
    _message: ConsumeMessage,
  ): Promise<void> {
    const reservation = await this.reservationRepository.loadById(
      payload.id,
      true,
    );
    if (!reservation) {
      this.logger.warn(
        `(ReservationCreatedConsumer) Reservation not found. id=${payload.id}`,
      );
      return;
    }

    const seatIds = (reservation.seats ?? []).map((seat) => seat.seatId);
    if (seatIds.length === 0) {
      this.logger.warn(
        `(ReservationCreatedConsumer) Reservation has no seats. id=${payload.id}`,
      );
      return;
    }

    await this.reservationExpirationScheduler.schedule(reservation, seatIds);
  }
}
