import { Reservation } from '../../../reservations/entities/reservation.entity';
import { ReservationSeat } from '../../../reservations/entities/reservation-seat.entity';
import { Session } from '../../../sessions/entities/session.entity';
import { Sale } from '../../entities/sale.entity';

export type CreateSaleInput = {
  sessionId: Sale['sessionId'];
  userId: Sale['userId'];
  reservationId: Reservation['id'];
  totalAmount: Sale['totalAmount'];
};

export interface PaymentTransactionRepository {
  loadReservationForUpdate(
    reservationId: Reservation['id'],
  ): Promise<Reservation | null>;
  loadSaleByReservationId(
    reservationId: Reservation['id'],
  ): Promise<Sale | null>;
  loadReservationSeats(
    reservationId: Reservation['id'],
  ): Promise<ReservationSeat[]>;
  countSoldSeats(sessionId: Session['id'], seatIds: string[]): Promise<number>;
  loadSessionById(sessionId: Session['id']): Promise<Session | null>;
  saveSale(input: CreateSaleInput): Promise<Sale>;
  saveSaleSeats(saleId: Sale['id'], seatIds: string[]): Promise<void>;
  saveReservation(reservation: Reservation): Promise<Reservation>;
}

export abstract class PaymentRepository {
  abstract withTransaction<T>(
    handler: (repo: PaymentTransactionRepository) => Promise<T>,
  ): Promise<T>;
}
