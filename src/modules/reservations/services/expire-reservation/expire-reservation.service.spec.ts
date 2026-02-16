import { Logger } from '@nestjs/common';
import { ExpireReservationService } from './expire-reservation.service';
import { ReservationRepository } from '../../repositories/contracts/reservation.repository';
import { EventsService } from 'src/shared/events/usecases/events.service';
import { SeatAvailabilityCacheService } from '../../../sessions/services/seat-availability-cache/seat-availability-cache.service';
import { ReservationExpirationPayload } from '../../types/reservation-expiration.payload';
import { EventName } from 'src/shared/events/types/event-names';
import { SeatStatus } from '../../../sessions/types/seat-status';

const makePayload = (overrides: Partial<ReservationExpirationPayload> = {}): ReservationExpirationPayload => ({
  reservationId: 'res-1',
  sessionId: 'sess-1',
  seatIds: ['seat-1', 'seat-2'],
  ...overrides,
});

const makeService = (overrides?: {
  reservationRepository?: Partial<ReservationRepository>;
  eventsService?: Partial<EventsService>;
  seatAvailabilityCacheService?: Partial<SeatAvailabilityCacheService>;
}) => {
  const reservationRepository = {
    expireIfNeeded: jest.fn().mockResolvedValue(true),
    releaseSeatLocks: jest.fn().mockResolvedValue(undefined),
    ...overrides?.reservationRepository,
  } as unknown as ReservationRepository;

  const eventsService = {
    publish: jest.fn().mockResolvedValue(undefined),
    ...overrides?.eventsService,
  } as unknown as EventsService;

  const seatAvailabilityCacheService = {
    setSeatStatuses: jest.fn().mockResolvedValue(undefined),
    ...overrides?.seatAvailabilityCacheService,
  } as unknown as SeatAvailabilityCacheService;

  const service = new ExpireReservationService(
    reservationRepository,
    eventsService,
    seatAvailabilityCacheService,
  );

  return { service, reservationRepository, eventsService, seatAvailabilityCacheService };
};

describe('ExpireReservationService', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('returns false and does nothing when reservation is not expired', async () => {
    const payload = makePayload();
    const { service, reservationRepository, eventsService, seatAvailabilityCacheService } = makeService({
      reservationRepository: {
        expireIfNeeded: jest.fn().mockResolvedValue(false),
      },
    });

    const result = await service.expireReservation(payload);

    expect(result).toBe(false);
    expect(reservationRepository.releaseSeatLocks).not.toHaveBeenCalled();
    expect(seatAvailabilityCacheService.setSeatStatuses).not.toHaveBeenCalled();
    expect(eventsService.publish).not.toHaveBeenCalled();
  });

  it('releases seat locks and publishes seat released when expired', async () => {
    const payload = makePayload();
    const { service, reservationRepository, eventsService, seatAvailabilityCacheService } = makeService();

    const result = await service.expireReservation(payload);

    expect(result).toBe(true);
    expect(reservationRepository.releaseSeatLocks).toHaveBeenCalledWith(
      payload.reservationId,
      expect.any(Date),
    );
    expect(seatAvailabilityCacheService.setSeatStatuses).toHaveBeenCalledWith(
      payload.sessionId,
      payload.seatIds,
      SeatStatus.AVAILABLE,
      30,
    );
    expect(eventsService.publish).toHaveBeenCalledWith(EventName.SeatReleased, {
      reservationId: payload.reservationId,
      sessionId: payload.sessionId,
      seatIds: payload.seatIds,
    });
  });

  it('continues when cache update fails', async () => {
    const payload = makePayload();
    const { service, eventsService, seatAvailabilityCacheService } = makeService({
      seatAvailabilityCacheService: {
        setSeatStatuses: jest.fn().mockRejectedValue(new Error('cache down')),
      },
    });

    const result = await service.expireReservation(payload);

    expect(result).toBe(true);
    expect(seatAvailabilityCacheService.setSeatStatuses).toHaveBeenCalled();
    expect(eventsService.publish).toHaveBeenCalled();
  });

  it('continues when event publish fails', async () => {
    const payload = makePayload();
    const { service, eventsService } = makeService({
      eventsService: {
        publish: jest.fn().mockRejectedValue(new Error('publish failed')),
      },
    });

    const result = await service.expireReservation(payload);

    expect(result).toBe(true);
    expect(eventsService.publish).toHaveBeenCalled();
  });

  it('propagates error when releasing seat locks fails', async () => {
    const payload = makePayload();
    const { service } = makeService({
      reservationRepository: {
        releaseSeatLocks: jest.fn().mockRejectedValue(new Error('db error')),
      },
    });

    await expect(service.expireReservation(payload)).rejects.toThrow('db error');
  });
});
