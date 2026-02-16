import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Reservation,
  ReservationStatus,
} from '../../../reservations/entities/reservation.entity';
import { ConfirmPaymentDto } from '../../dtos/confirm-payment.dto';
import { EventName } from 'src/shared/events/types/event-names';
import { EventsService } from 'src/shared/events/usecases/events.service';
import {
  PaymentRepository,
  PaymentTransactionRepository,
} from '../../repositories/contracts/payment.repository';
import { SeatAvailabilityCacheService } from '../../../sessions/services/seat-availability-cache/seat-availability-cache.service';
import { SeatStatus } from '../../../sessions/types/seat-status';

@Injectable()
export class ConfirmPaymentService {
  #CACHE_TTL_S = 30;

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly eventsService: EventsService,
    private readonly seatAvailabilityCacheService: SeatAvailabilityCacheService,
  ) {}

  async confirmPayment(dto: ConfirmPaymentDto) {
    const result = await this.paymentRepository.withTransaction((repo) =>
      this.confirmPaymentTransaction(repo, dto.reservationId),
    );

    await this.safeUpdateCachedSeats(
      result.sale.sessionId,
      result.seatIds,
      SeatStatus.SOLD,
      this.#CACHE_TTL_S,
    );
    await this.publishPaymentConfirmedIfNeeded(result);

    return result.sale;
  }

  private async confirmPaymentTransaction(
    repo: PaymentTransactionRepository,
    reservationId: string,
  ) {
    const reservation = await this.loadReservationOrThrow(repo, reservationId);

    const existing = await this.getExistingSaleIfConfirmed(repo, reservation);
    if (existing) {
      return existing;
    }

    await this.ensureReservationNotExpired(repo, reservation);

    const seatIds = await this.loadSeatIdsOrThrow(repo, reservation.id);
    await this.ensureSeatsNotSold(repo, reservation.sessionId, seatIds);

    const session = await this.loadSessionOrThrow(repo, reservation.sessionId);
    const totalAmount = this.calculateTotalAmount(
      session.price,
      seatIds.length,
    );

    const sale = await repo.saveSale({
      sessionId: reservation.sessionId,
      userId: reservation.userId,
      reservationId: reservation.id,
      totalAmount,
    });
    await repo.saveSaleSeats(sale.id, seatIds);

    reservation.status = ReservationStatus.CONFIRMED;
    await repo.saveReservation(reservation);

    return { sale, seatIds, shouldPublish: true };
  }

  private async loadReservationOrThrow(
    repo: PaymentTransactionRepository,
    reservationId: string,
  ) {
    const reservation = await repo.loadReservationForUpdate(reservationId);
    if (!reservation) throw new NotFoundException('Reservation not found.');
    return reservation;
  }

  private async getExistingSaleIfConfirmed(
    repo: PaymentTransactionRepository,
    reservation: Reservation,
  ) {
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      return null;
    }

    const existingSale = await repo.loadSaleByReservationId(reservation.id);
    if (!existingSale) {
      return null;
    }

    return { sale: existingSale, seatIds: [], shouldPublish: false };
  }

  private async ensureReservationNotExpired(
    repo: PaymentTransactionRepository,
    reservation: Reservation,
  ) {
    const now = new Date();
    const isExpired =
      reservation.status === ReservationStatus.EXPIRED ||
      reservation.expiresAt <= now;

    if (!isExpired) {
      return;
    }

    if (reservation.status !== ReservationStatus.EXPIRED) {
      reservation.status = ReservationStatus.EXPIRED;
      await repo.saveReservation(reservation);
    }

    throw new ConflictException('Reservation expired.');
  }

  private async loadSeatIdsOrThrow(
    repo: PaymentTransactionRepository,
    reservationId: string,
  ) {
    const reservationSeats = await repo.loadReservationSeats(reservationId);
    if (reservationSeats.length === 0) {
      throw new BadRequestException('Reservation has no seats.');
    }

    return reservationSeats.map((seat) => seat.seatId);
  }

  private async ensureSeatsNotSold(
    repo: PaymentTransactionRepository,
    sessionId: string,
    seatIds: string[],
  ) {
    const soldCount = await repo.countSoldSeats(sessionId, seatIds);
    if (soldCount > 0) {
      throw new ConflictException('Some seats are already sold.');
    }
  }

  private async loadSessionOrThrow(
    repo: PaymentTransactionRepository,
    sessionId: string,
  ) {
    const session = await repo.loadSessionById(sessionId);
    if (!session) throw new NotFoundException('Session not found.');
    return session;
  }

  private calculateTotalAmount(price: string, seatsCount: number) {
    return (Number(price) * seatsCount).toFixed(2);
  }

  private async publishPaymentConfirmedIfNeeded(result: {
    sale: {
      id: string;
      reservationId?: string | null;
      sessionId: string;
      userId: string;
      totalAmount: string;
    };
    seatIds: string[];
    shouldPublish: boolean;
  }) {
    if (!result.shouldPublish) {
      return;
    }

    await this.eventsService.publish(EventName.PaymentConfirmed, {
      saleId: result.sale.id,
      reservationId: result.sale.reservationId,
      sessionId: result.sale.sessionId,
      userId: result.sale.userId,
      seatIds: result.seatIds,
      totalAmount: result.sale.totalAmount,
    });
  }

  private async safeUpdateCachedSeats(
    sessionId: string,
    seatIds: string[],
    status: SeatStatus,
    ttlSeconds: number,
  ) {
    try {
      await this.seatAvailabilityCacheService.setSeatStatuses(
        sessionId,
        seatIds,
        status,
        ttlSeconds,
      );
    } catch {}
  }
}
