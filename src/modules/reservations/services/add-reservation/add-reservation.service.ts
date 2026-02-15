import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Seat } from '../../../seats/entities/seat.entity';
import { ReservationSeat } from '../../entities/reservation-seat.entity';
import { Reservation, ReservationStatus } from '../../entities/reservation.entity';
import { SaleSeat } from '../../../payments/entities/sale-seat.entity';
import { CreateReservationDto } from '../../dtos/create-reservation.dto';
import { EventsService } from '../../../../shared/events/usecases/events.service';

@Injectable()
export class AddReservationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventsService: EventsService,
  ) {}

  async addReservation(dto: CreateReservationDto) {
    const seatIds = [...new Set(dto.seatIds)].sort();
    if (seatIds.length !== dto.seatIds.length) {
      throw new BadRequestException('Duplicated seats in request.');
    }

    const expiresAt = new Date(Date.now() + 30_000);

    const reservation = await this.dataSource.transaction(async (manager) => {
      const seatRepo = manager.getRepository(Seat);
      const reservationRepo = manager.getRepository(Reservation);
      const reservationSeatRepo = manager.getRepository(ReservationSeat);
      const saleSeatRepo = manager.getRepository(SaleSeat);

      const seats = await seatRepo
        .createQueryBuilder('seat')
        .setLock('pessimistic_write')
        .where('seat.id IN (:...seatIds)', { seatIds })
        .andWhere('seat.sessionId = :sessionId', { sessionId: dto.sessionId })
        .orderBy('seat.id', 'ASC')
        .getMany();

      if (seats.length !== seatIds.length) {
        throw new BadRequestException(
          'Some seats were not found for this session.',
        );
      }

      const soldCount = await saleSeatRepo
        .createQueryBuilder('saleSeat')
        .innerJoin('saleSeat.sale', 'sale')
        .where('saleSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('sale.sessionId = :sessionId', { sessionId: dto.sessionId })
        .getCount();

      if (soldCount > 0) {
        throw new ConflictException('Some seats are already sold.');
      }

      const activeReservations = await reservationSeatRepo
        .createQueryBuilder('reservationSeat')
        .innerJoin('reservationSeat.reservation', 'reservation')
        .where('reservationSeat.seatId IN (:...seatIds)', { seatIds })
        .andWhere('reservation.sessionId = :sessionId', {
          sessionId: dto.sessionId,
        })
        .andWhere('reservation.status = :status', {
          status: ReservationStatus.RESERVED,
        })
        .andWhere('reservation.expiresAt > NOW()')
        .getCount();

      if (activeReservations > 0) {
        throw new ConflictException('Some seats are already reserved.');
      }

      const reservation = reservationRepo.create({
        sessionId: dto.sessionId,
        userId: dto.userId,
        status: ReservationStatus.RESERVED,
        expiresAt,
      });

      await reservationRepo.save(reservation);

      const reservationSeats = seatIds.map((seatId) =>
        reservationSeatRepo.create({
          reservationId: reservation.id,
          seatId,
        }),
      );

      await reservationSeatRepo.save(reservationSeats);

      return reservation;
    });

    await this.eventsService.publish('reservation.created', {
      reservationId: reservation.id,
      sessionId: dto.sessionId,
      userId: dto.userId,
      seatIds,
      expiresAt: expiresAt.toISOString(),
    });

    return reservation;
  }
}
