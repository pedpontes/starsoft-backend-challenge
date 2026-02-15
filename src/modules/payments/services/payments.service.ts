import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Session } from '../../sessions/entities/session.entity';
import {
  Reservation,
  ReservationStatus,
} from '../../reservations/entities/reservation.entity';
import { ReservationSeat } from '../../reservations/entities/reservation-seat.entity';
import { Sale } from '../entities/sale.entity';
import { SaleSeat } from '../entities/sale-seat.entity';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventsService: EventsService,
  ) {}

  async confirmPayment(dto: ConfirmPaymentDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const reservationRepo = manager.getRepository(Reservation);
      const reservationSeatRepo = manager.getRepository(ReservationSeat);
      const saleRepo = manager.getRepository(Sale);
      const saleSeatRepo = manager.getRepository(SaleSeat);
      const sessionRepo = manager.getRepository(Session);

      const reservation = await reservationRepo
        .createQueryBuilder('reservation')
        .setLock('pessimistic_write')
        .where('reservation.id = :id', { id: dto.reservationId })
        .getOne();

      if (!reservation) {
        throw new NotFoundException('Reservation not found.');
      }

      if (reservation.status === ReservationStatus.CONFIRMED) {
        const existingSale = await saleRepo.findOne({
          where: { reservationId: reservation.id },
        });
        if (existingSale) {
          return { sale: existingSale, seatIds: [], shouldPublish: false };
        }
      }

      if (
        reservation.status === ReservationStatus.EXPIRED ||
        reservation.expiresAt <= new Date()
      ) {
        if (reservation.status !== ReservationStatus.EXPIRED) {
          reservation.status = ReservationStatus.EXPIRED;
          await reservationRepo.save(reservation);
        }
        throw new ConflictException('Reservation expired.');
      }

      const reservationSeats = await reservationSeatRepo.find({
        where: { reservationId: reservation.id },
      });

      if (reservationSeats.length === 0) {
        throw new BadRequestException('Reservation has no seats.');
      }

      const seatIds = reservationSeats.map((seat) => seat.seatId);

      const soldCount = await saleSeatRepo
        .createQueryBuilder('saleSeat')
        .innerJoin('saleSeat.sale', 'sale')
        .where('saleSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('sale.sessionId = :sessionId', {
          sessionId: reservation.sessionId,
        })
        .getCount();

      if (soldCount > 0) {
        throw new ConflictException('Some seats are already sold.');
      }

      const session = await sessionRepo.findOne({
        where: { id: reservation.sessionId },
      });
      if (!session) {
        throw new NotFoundException('Session not found.');
      }

      const totalAmount = (Number(session.price) * seatIds.length).toFixed(2);

      const sale = saleRepo.create({
        sessionId: reservation.sessionId,
        userId: reservation.userId,
        reservationId: reservation.id,
        totalAmount,
      });

      await saleRepo.save(sale);

      const saleSeats = seatIds.map((seatId) =>
        saleSeatRepo.create({
          saleId: sale.id,
          seatId,
        }),
      );

      await saleSeatRepo.save(saleSeats);

      reservation.status = ReservationStatus.CONFIRMED;
      await reservationRepo.save(reservation);

      return { sale, seatIds, shouldPublish: true };
    });

    if (result.shouldPublish) {
      await this.eventsService.publish('payment.confirmed', {
        saleId: result.sale.id,
        reservationId: result.sale.reservationId,
        sessionId: result.sale.sessionId,
        userId: result.sale.userId,
        seatIds: result.seatIds,
        totalAmount: result.sale.totalAmount,
      });
    }

    return result.sale;
  }
}
