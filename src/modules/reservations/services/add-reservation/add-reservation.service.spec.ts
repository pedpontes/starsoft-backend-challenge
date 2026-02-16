import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AddReservationService } from './add-reservation.service';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';
import { SessionRepository } from '../../../sessions/repositories/contracts/session.repository';
import { EventsService } from 'src/shared/events/usecases/events.service';
import { SeatAvailabilityCacheService } from '../../../sessions/services/seat-availability-cache/seat-availability-cache.service';
import { ReservationExpirationScheduler } from '../../schedulers/reservation-expiration.scheduler';
import { SeatStatus } from '../../../sessions/types/seat-status';
import { SeatAlreadyLockedError } from '../../errors/seat-already-locked.error';
import { EventName } from 'src/shared/events/types/event-names';
import { Reservation } from '../../entities/reservation.entity';

const makeReservation = (overrides: Partial<Reservation> = {}): Reservation =>
  ({
    id: 'res-1',
    sessionId: 'sess-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 30_000),
    ...overrides,
  }) as Reservation;

const makeService = (overrides?: {
  reservationRepository?: Partial<ReservationRepository>;
  sessionRepository?: Partial<SessionRepository>;
  eventsService?: Partial<EventsService>;
  seatAvailabilityCacheService?: Partial<SeatAvailabilityCacheService>;
  reservationExpirationScheduler?: Partial<ReservationExpirationScheduler>;
}) => {
  const reservationRepository = {
    add: jest.fn().mockResolvedValue(makeReservation()),
    ...overrides?.reservationRepository,
  } as unknown as ReservationRepository;

  const sessionRepository = {
    loadSeatsBySessionId: jest.fn().mockResolvedValue([
      { id: 'seat-1', label: 'A1' },
      { id: 'seat-2', label: 'A2' },
    ]),
    loadSoldSeatIds: jest.fn().mockResolvedValue([]),
    loadReservedSeatIds: jest.fn().mockResolvedValue([]),
    ...overrides?.sessionRepository,
  } as unknown as SessionRepository;

  const eventsService = {
    publish: jest.fn().mockResolvedValue(undefined),
    ...overrides?.eventsService,
  } as unknown as EventsService;

  const seatAvailabilityCacheService = {
    setSeatStatuses: jest.fn().mockResolvedValue(undefined),
    ...overrides?.seatAvailabilityCacheService,
  } as unknown as SeatAvailabilityCacheService;

  const reservationExpirationScheduler = {
    schedule: jest.fn().mockResolvedValue(undefined),
    ...overrides?.reservationExpirationScheduler,
  } as unknown as ReservationExpirationScheduler;

  const service = new AddReservationService(
    reservationRepository,
    sessionRepository,
    eventsService,
    seatAvailabilityCacheService,
    reservationExpirationScheduler,
  );

  return {
    service,
    reservationRepository,
    sessionRepository,
    eventsService,
    seatAvailabilityCacheService,
    reservationExpirationScheduler,
  };
};

describe('AddReservationService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws BadRequestException when seatIds are duplicated', async () => {
    const { service, sessionRepository } = makeService();

    await expect(
      service.addReservation({
        sessionId: 'sess-1',
        userId: 'user-1',
        seatIds: ['seat-1', 'seat-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(sessionRepository.loadSeatsBySessionId).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when seats do not exist in session', async () => {
    const { service } = makeService({
      sessionRepository: {
        loadSeatsBySessionId: jest.fn().mockResolvedValue([{ id: 'seat-1' }]),
      },
    });

    await expect(
      service.addReservation({
        sessionId: 'sess-1',
        userId: 'user-1',
        seatIds: ['seat-1', 'seat-2'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when some seats are already sold', async () => {
    const { service } = makeService({
      sessionRepository: {
        loadSoldSeatIds: jest.fn().mockResolvedValue(['seat-1']),
        loadReservedSeatIds: jest.fn().mockResolvedValue([]),
      },
    });

    await expect(
      service.addReservation({
        sessionId: 'sess-1',
        userId: 'user-1',
        seatIds: ['seat-1'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when some seats are already reserved', async () => {
    const { service } = makeService({
      sessionRepository: {
        loadSoldSeatIds: jest.fn().mockResolvedValue([]),
        loadReservedSeatIds: jest.fn().mockResolvedValue(['seat-1']),
      },
    });

    await expect(
      service.addReservation({
        sessionId: 'sess-1',
        userId: 'user-1',
        seatIds: ['seat-1'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when seat lock unique constraint is hit', async () => {
    const { service } = makeService({
      reservationRepository: {
        add: jest.fn().mockRejectedValue(new SeatAlreadyLockedError()),
      },
    });

    await expect(
      service.addReservation({
        sessionId: 'sess-1',
        userId: 'user-1',
        seatIds: ['seat-1'],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates reservation, updates cache, schedules expiration, and publishes event', async () => {
    const reservation = makeReservation({
      expiresAt: new Date('2025-01-01T00:00:30Z'),
    });
    const { service, reservationRepository, seatAvailabilityCacheService, reservationExpirationScheduler, eventsService } =
      makeService({
        reservationRepository: {
          add: jest.fn().mockResolvedValue(reservation),
        },
      });

    const result = await service.addReservation({
      sessionId: 'sess-1',
      userId: 'user-1',
      seatIds: ['seat-1', 'seat-2'],
    });

    expect(result).toBe(reservation);
    expect(reservationRepository.add).toHaveBeenCalledTimes(1);
    expect(seatAvailabilityCacheService.setSeatStatuses).toHaveBeenCalledWith(
      'sess-1',
      ['seat-1', 'seat-2'],
      SeatStatus.RESERVED,
      30,
    );
    expect(reservationExpirationScheduler.schedule).toHaveBeenCalledWith(
      reservation,
      ['seat-1', 'seat-2'],
    );
    expect(eventsService.publish).toHaveBeenCalledWith(
      EventName.ReservationCreated,
      reservation,
    );
  });

  it('continues when cache update fails', async () => {
    const { service, seatAvailabilityCacheService, eventsService } = makeService({
      seatAvailabilityCacheService: {
        setSeatStatuses: jest.fn().mockRejectedValue(new Error('cache down')),
      },
    });

    const result = await service.addReservation({
      sessionId: 'sess-1',
      userId: 'user-1',
      seatIds: ['seat-1'],
    });

    expect(result).toBeDefined();
    expect(seatAvailabilityCacheService.setSeatStatuses).toHaveBeenCalled();
    expect(eventsService.publish).toHaveBeenCalled();
  });
});
