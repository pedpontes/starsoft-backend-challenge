import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfirmPaymentService } from './confirm-payment.service';
import { Reservation, ReservationStatus } from '../../../reservations/entities/reservation.entity';
import { ReservationSeat } from '../../../reservations/entities/reservation-seat.entity';
import { Session } from '../../../sessions/entities/session.entity';
import { Sale } from '../../entities/sale.entity';
import {
  PaymentRepository,
  PaymentTransactionRepository,
} from '../../repositories/contracts/payment.repository';
import { EventsService } from 'src/shared/events/usecases/events.service';
import { SeatAvailabilityCacheService } from '../../../sessions/services/seat-availability-cache/seat-availability-cache.service';
import { EventName } from 'src/shared/events/types/event-names';
import { SeatStatus } from '../../../sessions/types/seat-status';

const makeReservation = (overrides: Partial<Reservation> = {}): Reservation =>
  ({
    id: 'res-1',
    sessionId: 'sess-1',
    userId: 'user-1',
    status: ReservationStatus.RESERVED,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  }) as Reservation;

const makeReservationSeats = (seatIds: string[]): ReservationSeat[] =>
  seatIds.map(
    (seatId) =>
      ({
        seatId,
        reservationId: 'res-1',
      }) as ReservationSeat,
  );

const makeSession = (overrides: Partial<Session> = {}): Session =>
  ({
    id: 'sess-1',
    price: '25.00',
    ...overrides,
  }) as Session;

const makeSale = (overrides: Partial<Sale> = {}): Sale =>
  ({
    id: 'sale-1',
    sessionId: 'sess-1',
    userId: 'user-1',
    reservationId: 'res-1',
    totalAmount: '50.00',
    ...overrides,
  }) as Sale;

const makeRepo = (
  overrides: Partial<PaymentTransactionRepository> = {},
): PaymentTransactionRepository => {
  const reservation = makeReservation();
  const session = makeSession();
  const sale = makeSale();

  return {
    loadReservationForUpdate: jest.fn().mockResolvedValue(reservation),
    loadSaleByReservationId: jest.fn().mockResolvedValue(null),
    loadReservationSeats: jest
      .fn()
      .mockResolvedValue(makeReservationSeats(['seat-1', 'seat-2'])),
    countSoldSeats: jest.fn().mockResolvedValue(0),
    loadSessionById: jest.fn().mockResolvedValue(session),
    saveSale: jest.fn().mockResolvedValue(sale),
    saveSaleSeats: jest.fn().mockResolvedValue(undefined),
    saveReservation: jest.fn().mockResolvedValue(reservation),
    ...overrides,
  };
};

describe('ConfirmPaymentService', () => {
  const makeService = (repo: PaymentTransactionRepository) => {
    const paymentRepository = {
      withTransaction: jest.fn((handler) => handler(repo)),
    } as unknown as PaymentRepository;

    const eventsService = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as EventsService;

    const seatAvailabilityCacheService = {
      setSeatStatuses: jest.fn().mockResolvedValue(undefined),
    } as unknown as SeatAvailabilityCacheService;

    const service = new ConfirmPaymentService(
      paymentRepository,
      eventsService,
      seatAvailabilityCacheService,
    );

    return { service, paymentRepository, eventsService, seatAvailabilityCacheService };
  };

  it('throws NotFoundException when reservation does not exist', async () => {
    const repo = makeRepo({ loadReservationForUpdate: jest.fn().mockResolvedValue(null) });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    await expect(
      service.confirmPayment({ reservationId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
  });

  it('returns existing sale when reservation already confirmed', async () => {
    const existingSale = makeSale({ id: 'sale-existing' });
    const repo = makeRepo({
      loadReservationForUpdate: jest
        .fn()
        .mockResolvedValue(makeReservation({ status: ReservationStatus.CONFIRMED })),
      loadSaleByReservationId: jest.fn().mockResolvedValue(existingSale),
    });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    const result = await service.confirmPayment({ reservationId: 'res-1' });

    expect(result).toBe(existingSale);
    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).toHaveBeenCalledWith(
      existingSale.sessionId,
      [],
      SeatStatus.SOLD,
      30,
    );
  });

  it('marks reservation expired and throws ConflictException when expiresAt is past', async () => {
    const repo = makeRepo({
      loadReservationForUpdate: jest
        .fn()
        .mockResolvedValue(
          makeReservation({ expiresAt: new Date(Date.now() - 1) }),
        ),
    });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    await expect(
      service.confirmPayment({ reservationId: 'res-1' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.saveReservation).toHaveBeenCalledTimes(1);
    const savedReservation = (repo.saveReservation as jest.Mock).mock.calls[0][0] as Reservation;
    expect(savedReservation.status).toBe(ReservationStatus.EXPIRED);
    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
  });

  it('throws ConflictException when reservation is already expired', async () => {
    const repo = makeRepo({
      loadReservationForUpdate: jest
        .fn()
        .mockResolvedValue(
          makeReservation({ status: ReservationStatus.EXPIRED }),
        ),
    });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    await expect(
      service.confirmPayment({ reservationId: 'res-1' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repo.saveReservation).not.toHaveBeenCalled();
    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when reservation has no seats', async () => {
    const repo = makeRepo({
      loadReservationSeats: jest.fn().mockResolvedValue([]),
    });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    await expect(
      service.confirmPayment({ reservationId: 'res-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
  });

  it('throws ConflictException when some seats are already sold', async () => {
    const repo = makeRepo({
      countSoldSeats: jest.fn().mockResolvedValue(1),
    });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    await expect(
      service.confirmPayment({ reservationId: 'res-1' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when session does not exist', async () => {
    const repo = makeRepo({
      loadSessionById: jest.fn().mockResolvedValue(null),
    });
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    await expect(
      service.confirmPayment({ reservationId: 'res-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(eventsService.publish).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
  });

  it('creates sale, updates reservation, updates cache and publishes event on success', async () => {
    const repo = makeRepo();
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);

    const result = await service.confirmPayment({ reservationId: 'res-1' });

    expect(result).toEqual(makeSale());
    expect(repo.saveSale).toHaveBeenCalledTimes(1);
    expect(repo.saveSaleSeats).toHaveBeenCalledTimes(1);
    expect(repo.saveReservation).toHaveBeenCalledTimes(1);
    const updatedReservation = (repo.saveReservation as jest.Mock).mock.calls[0][0] as Reservation;
    expect(updatedReservation.status).toBe(ReservationStatus.CONFIRMED);
    expect(seatAvailabilityCacheService.setSeatStatuses).toHaveBeenCalledWith(
      'sess-1',
      ['seat-1', 'seat-2'],
      SeatStatus.SOLD,
      30,
    );
    expect(eventsService.publish).toHaveBeenCalledWith(EventName.PaymentConfirmed, {
      saleId: 'sale-1',
      reservationId: 'res-1',
      sessionId: 'sess-1',
      userId: 'user-1',
      seatIds: ['seat-1', 'seat-2'],
      totalAmount: '50.00',
    });
  });

  it('creates sale even if reservation is already confirmed but has no existing sale', async () => {
    const repo = makeRepo({
      loadReservationForUpdate: jest
        .fn()
        .mockResolvedValue(
          makeReservation({ status: ReservationStatus.CONFIRMED }),
        ),
      loadSaleByReservationId: jest.fn().mockResolvedValue(null),
    });
    const { service, eventsService } = makeService(repo);

    const result = await service.confirmPayment({ reservationId: 'res-1' });

    expect(result).toEqual(makeSale());
    expect(eventsService.publish).toHaveBeenCalledTimes(1);
  });

  it('continues when cache update fails (best-effort)', async () => {
    const repo = makeRepo();
    const { service, eventsService, seatAvailabilityCacheService } = makeService(repo);
    (seatAvailabilityCacheService.setSeatStatuses as jest.Mock).mockRejectedValueOnce(
      new Error('cache down'),
    );

    const result = await service.confirmPayment({ reservationId: 'res-1' });

    expect(result).toEqual(makeSale());
    expect(eventsService.publish).toHaveBeenCalledTimes(1);
  });
});
