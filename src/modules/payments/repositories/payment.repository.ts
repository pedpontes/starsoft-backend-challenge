import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  PaymentRepository,
  PaymentTransactionRepository,
  CreateSaleInput,
} from './contracts/payment.repository';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ReservationSeat } from '../../reservations/entities/reservation-seat.entity';
import { Session } from '../../sessions/entities/session.entity';
import { Sale } from '../entities/sale.entity';
import { SaleSeat } from '../entities/sale-seat.entity';

class PaymentTransactionTypeOrmRepository implements PaymentTransactionRepository {
  #sale: Repository<Sale>;
  #reservation: Repository<Reservation>;
  #reservationSeat: Repository<ReservationSeat>;
  #saleSeat: Repository<SaleSeat>;
  #session: Repository<Session>;

  constructor(private readonly manager: EntityManager) {
    this.#sale = this.manager.getRepository(Sale);
    this.#reservation = this.manager.getRepository(Reservation);
    this.#reservationSeat = this.manager.getRepository(ReservationSeat);
    this.#saleSeat = this.manager.getRepository(SaleSeat);
    this.#session = this.manager.getRepository(Session);
  }

  async loadReservationForUpdate(reservationId: Reservation['id']) {
    return this.#reservation
      .createQueryBuilder('reservation')
      .setLock('pessimistic_write')
      .where('reservation.id = :id', { id: reservationId })
      .getOne();
  }

  async loadSaleByReservationId(reservationId: Reservation['id']) {
    return this.#sale.findOne({
      where: { reservationId },
    });
  }

  async loadReservationSeats(reservationId: Reservation['id']) {
    return this.#reservationSeat.find({
      where: { reservationId },
    });
  }

  async countSoldSeats(sessionId: Session['id'], seatIds: string[]) {
    if (!seatIds || seatIds.length === 0) {
      return 0;
    }

    return this.#saleSeat
      .createQueryBuilder('saleSeat')
      .innerJoin('saleSeat.sale', 'sale')
      .where('saleSeat.seatId IN (:...seatIds)', { seatIds })
      .andWhere('sale.sessionId = :sessionId', { sessionId })
      .getCount();
  }

  async loadSessionById(sessionId: Session['id']) {
    return this.#session.findOne({
      where: { id: sessionId },
    });
  }

  async saveSale(input: CreateSaleInput) {
    const repo = this.#sale;
    const sale = repo.create(input);
    return repo.save(sale);
  }

  async saveSaleSeats(saleId: Sale['id'], seatIds: string[]) {
    if (!seatIds || seatIds.length === 0) {
      return;
    }

    const repo = this.#saleSeat;
    const saleSeats = seatIds.map((seatId) =>
      repo.create({
        saleId,
        seatId,
      }),
    );
    await repo.save(saleSeats);
  }

  async saveReservation(reservation: Reservation) {
    return this.#reservation.save(reservation);
  }
}

@Injectable()
export class PaymentTypeOrmRepository extends PaymentRepository {
  #logger: Logger;

  constructor(private readonly dataSource: DataSource) {
    super();
    this.#logger = new Logger(PaymentTypeOrmRepository.name);
  }

  async withTransaction<T>(
    handler: (repo: PaymentTransactionRepository) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repo = new PaymentTransactionTypeOrmRepository(manager);
        return handler(repo);
      });
    } catch (e) {
      this.#logger.error(
        '(PaymentRepository.withTransaction) Error confirm payment',
        e instanceof Error ? e.stack : String(e),
      );
      throw e;
    }
  }
}
