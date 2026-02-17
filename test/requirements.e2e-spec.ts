import request, { Test as SupertestTest } from 'supertest';
import amqplib, {
  Channel,
  ChannelModel,
  ConsumeMessage,
  GetMessage,
} from 'amqplib';
import { Client } from 'pg';
import { SeatStatus } from '../src/modules/sessions/types/seat-status';
import { ReservationStatus } from '../src/modules/reservations/entities/reservation.entity';

jest.setTimeout(120000);

type CreatedSession = {
  sessionId: string;
  seats: Array<{ id: string; label: string; status: SeatStatus }>;
};

describe('Backend Challenge Requirements (e2e)', () => {
  let rabbitConnection: ChannelModel;
  let rabbitChannel: Channel;
  let eventQueue: string | null = null;
  let receivedEvents: Array<{ routingKey: string; payload: unknown }> = [];
  let dbClient: Client;

  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

  beforeAll(async () => {
    process.env.RABBITMQ_URL =
      process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
    process.env.EVENTS_EXCHANGE =
      process.env.EVENTS_EXCHANGE ?? 'cinema.events';
    process.env.EVENTS_AUDIT_QUEUE =
      process.env.EVENTS_AUDIT_QUEUE ?? 'cinema.audit';
    process.env.RESERVATION_EXPIRATION_DELAY_QUEUE =
      process.env.RESERVATION_EXPIRATION_DELAY_QUEUE ??
      'reservation.expiration.delay';
    process.env.RESERVATION_EXPIRED_QUEUE =
      process.env.RESERVATION_EXPIRED_QUEUE ?? 'reservation.expired';

    rabbitConnection = await amqplib.connect(
      process.env.RABBITMQ_URL as string,
    );
    rabbitChannel = await rabbitConnection.createChannel();

    dbClient = new Client({
      host: process.env.E2E_DB_HOST ?? 'localhost',
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      user: process.env.E2E_DB_USER ?? 'app',
      password: process.env.E2E_DB_PASSWORD ?? 'app',
      database: process.env.E2E_DB_NAME ?? 'cinema',
    });
    await dbClient.connect();
  });

  afterAll(async () => {
    if (rabbitChannel) {
      await rabbitChannel.close();
    }
    if (rabbitConnection) {
      await rabbitConnection.close();
    }
    if (dbClient) {
      await dbClient.end();
    }
  });

  beforeEach(async () => {
    receivedEvents = [];
    eventQueue = await setupEventQueue();
  });

  afterEach(async () => {
    if (eventQueue) {
      try {
        await rabbitChannel.deleteQueue(eventQueue);
      } catch {}
      eventQueue = null;
    }
  });

  const parseMessage = (message: ConsumeMessage | GetMessage): unknown => {
    const content = message.content.toString('utf8');
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  };

  const setupEventQueue = async () => {
    const exchange = process.env.EVENTS_EXCHANGE ?? 'cinema.events';
    await rabbitChannel.assertExchange(exchange, 'topic', { durable: true });
    const { queue } = await rabbitChannel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
    });
    await rabbitChannel.bindQueue(queue, exchange, '#');
    return queue;
  };

  const createUser = async (name?: string) => {
    const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const payload = {
      name: name ?? `User ${Date.now()}`,
      email: `user.${unique}@example.com`,
    };
    const res = await request(baseUrl)
      .post('/api/users')
      .send(payload)
      .expect(201);

    return res.body as { id: string; name: string; email: string };
  };

  const createSession = async (options?: {
    seatsCount?: number;
    seatLabels?: string[];
  }): Promise<CreatedSession> => {
    const payload: Record<string, unknown> = {
      movieTitle: 'Movie X',
      startsAt: new Date(Date.now() + 3600_000).toISOString(),
      room: 'Room A',
      price: 25.0,
    };

    if (options?.seatLabels) {
      payload.seatLabels = options.seatLabels;
    } else {
      payload.seatsCount = options?.seatsCount ?? 16;
    }

    const res = await request(baseUrl)
      .post('/api/sessions')
      .send(payload)
      .expect(201);

    const availability = await request(baseUrl)
      .get(`/api/sessions/${res.body.sessionId}/availability`)
      .expect(200);

    return {
      sessionId: res.body.sessionId,
      seats: availability.body.seats,
    };
  };

  const createReservation = (payload: {
    sessionId: string;
    userId: string;
    seatIds: string[];
    idempotencyKey?: string;
  }): SupertestTest => {
    const req = request(baseUrl).post('/api/reservations').send({
      sessionId: payload.sessionId,
      userId: payload.userId,
      seatIds: payload.seatIds,
    });
    if (payload.idempotencyKey) {
      req.set('Idempotency-Key', payload.idempotencyKey);
    }
    return req;
  };

  const loadAvailability = async (sessionId: string) => {
    const res = await request(baseUrl)
      .get(`/api/sessions/${sessionId}/availability`)
      .expect(200);
    return res.body as {
      sessionId: string;
      seats: Array<{ id: string; label: string; status: SeatStatus }>;
    };
  };

  const waitForReservationStatus = async (
    reservationId: string,
    status: ReservationStatus,
    timeoutMs = 15000,
  ) => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const res = await request(baseUrl)
        .get(`/api/reservations/${reservationId}`)
        .expect(200);
      if (res.body.status === status) {
        return res.body;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    throw new Error(`Reservation did not reach status ${status}`);
  };

  const waitForEvent = async (
    eventName: string,
    predicate: (payload: unknown) => boolean,
    timeoutMs = 5000,
  ) => {
    const start = Date.now();
    if (!eventQueue) {
      throw new Error('Event queue not initialized');
    }

    while (Date.now() - start < timeoutMs) {
      const bufferedIndex = receivedEvents.findIndex(
        (event) => event.routingKey === eventName && predicate(event.payload),
      );
      if (bufferedIndex >= 0) {
        const [match] = receivedEvents.splice(bufferedIndex, 1);
        return match;
      }

      const message = await rabbitChannel.get(eventQueue, { noAck: true });
      if (message) {
        const payload = parseMessage(message);
        receivedEvents.push({
          routingKey: message.fields.routingKey,
          payload,
        });
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(`Event not received: ${eventName}`);
  };

  const waitForEventLog = async (
    eventName: string,
    predicate: (payload: unknown) => boolean,
    timeoutMs = 5000,
  ) => {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const res = await dbClient.query(
        'SELECT payload FROM event_logs WHERE event_name = $1 ORDER BY created_at DESC LIMIT 10',
        [eventName],
      );
      const match = res.rows.find((row) => predicate(row.payload));
      if (match) {
        return match.payload as unknown;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(`Event log not found: ${eventName}`);
  };

  const loadQueueInfo = async (queue: string) => {
    const baseUrl = process.env.RABBITMQ_MANAGEMENT_URL ?? 'http://localhost:15672';
    const user = process.env.RABBITMQ_MANAGEMENT_USER ?? 'guest';
    const password = process.env.RABBITMQ_MANAGEMENT_PASSWORD ?? 'guest';
    const url = `${baseUrl}/api/queues/%2F/${encodeURIComponent(queue)}`;
    const auth = Buffer.from(`${user}:${password}`).toString('base64');

    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to load queue info: ${response.status}`);
    }
    return (await response.json()) as { arguments?: Record<string, unknown> };
  };

  describe('Sessions', () => {
    it('creates session with at least 16 seats', async () => {
      const { sessionId, seats } = await createSession({
        seatLabels: Array.from({ length: 16 }, (_, i) => `S${i + 1}`),
      });

      expect(sessionId).toBeDefined();
      expect(seats).toHaveLength(16);
      expect(seats.every((seat) => seat.status === SeatStatus.AVAILABLE)).toBe(
        true,
      );
    });

    it('rejects sessions with less than 16 seats', async () => {
      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          room: 'Room A',
          price: 25.0,
          seatsCount: 10,
        })
        .expect(400);
    });

    it('rejects sessions with duplicated seat labels', async () => {
      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          room: 'Room A',
          price: 25.0,
          seatLabels: [
            'A1',
            'A1',
            'A2',
            'A3',
            'A4',
            'A5',
            'A6',
            'A7',
            'A8',
            'A9',
            'A10',
            'A11',
            'A12',
            'A13',
            'A14',
            'A15',
          ],
        })
        .expect(400);
    });

    it('rejects sessions with missing required fields', async () => {
      const startsAt = new Date(Date.now() + 3600_000).toISOString();

      await request(baseUrl)
        .post('/api/sessions')
        .send({
          startsAt,
          room: 'Room A',
          price: 25.0,
          seatsCount: 16,
        })
        .expect(400);

      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          room: 'Room A',
          price: 25.0,
          seatsCount: 16,
        })
        .expect(400);

      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          startsAt,
          price: 25.0,
          seatsCount: 16,
        })
        .expect(400);
    });

    it('rejects sessions with invalid startsAt and price', async () => {
      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          startsAt: 'invalid-date',
          room: 'Room A',
          price: 25.0,
          seatsCount: 16,
        })
        .expect(400);

      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          room: 'Room A',
          price: 0,
          seatsCount: 16,
        })
        .expect(400);

      await request(baseUrl)
        .post('/api/sessions')
        .send({
          movieTitle: 'Movie X',
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          room: 'Room A',
          price: -10,
          seatsCount: 16,
        })
        .expect(400);
    });
  });

  describe('Reservations', () => {
    it('creates reservation and publishes reservation.created event', async () => {
      const user = await createUser('Reservation User');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const res = await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seatId],
      }).expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(ReservationStatus.RESERVED);

      const expiresAt = new Date(res.body.expiresAt).getTime();
      const diffMs = expiresAt - Date.now();
      expect(diffMs).toBeGreaterThan(20_000);
      expect(diffMs).toBeLessThan(35_000);

      const availability = await loadAvailability(sessionId);
      const seat = availability.seats.find((s) => s.id === seatId);
      expect(seat?.status).toBe(SeatStatus.RESERVED);

      await waitForEvent(
        'reservation.created',
        (payload) => (payload as { id?: string }).id === res.body.id,
      );
    });

    it('returns the same reservation for repeated idempotent requests', async () => {
      const user = await createUser('Idempotency User');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;
      const idempotencyKey = `idem-${Date.now()}`;

      const first = await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seatId],
        idempotencyKey,
      }).expect(201);

      const second = await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seatId],
        idempotencyKey,
      }).expect(201);

      expect(second.body.id).toBe(first.body.id);
      expect(new Date(second.body.expiresAt).getTime()).toBe(
        new Date(first.body.expiresAt).getTime(),
      );
      expect(second.body.status).toBe(first.body.status);
    });

    it('rejects duplicated seatIds in reservation request', async () => {
      const user = await createUser('Dup Seat User');
      const { sessionId, seats } = await createSession();

      await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seats[0].id, seats[0].id],
      }).expect(400);
    });

    it('rejects seats that do not exist in session', async () => {
      const user = await createUser('Invalid Seat User');
      const { sessionId } = await createSession();

      await createReservation({
        sessionId,
        userId: user.id,
        seatIds: ['00000000-0000-0000-0000-000000000000'],
      }).expect(400);
    });

    it('rejects reservation when seat already reserved', async () => {
      const userA = await createUser('User A');
      const userB = await createUser('User B');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      await createReservation({
        sessionId,
        userId: userA.id,
        seatIds: [seatId],
      }).expect(201);

      await createReservation({
        sessionId,
        userId: userB.id,
        seatIds: [seatId],
      }).expect(409);
    });
  });

  describe('Concurrency', () => {
    it('allows only one user to reserve the same seat concurrently', async () => {
      const userA = await createUser('Race A');
      const userB = await createUser('Race B');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const [a, b] = await Promise.allSettled([
        createReservation({
          sessionId,
          userId: userA.id,
          seatIds: [seatId],
          idempotencyKey: 'race-a',
        }),
        createReservation({
          sessionId,
          userId: userB.id,
          seatIds: [seatId],
          idempotencyKey: 'race-b',
        }),
      ]);

      const statuses = [a, b].map((result) =>
        result.status === 'fulfilled' ? result.value.status : 0,
      );

      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    });

    it('avoids deadlock when two users reserve seats in opposite order', async () => {
      const userA = await createUser('Deadlock A');
      const userB = await createUser('Deadlock B');
      const { sessionId, seats } = await createSession();
      const seatA = seats[0].id;
      const seatB = seats[1].id;

      const [a, b] = await Promise.allSettled([
        createReservation({
          sessionId,
          userId: userA.id,
          seatIds: [seatA, seatB],
          idempotencyKey: 'deadlock-a',
        }),
        createReservation({
          sessionId,
          userId: userB.id,
          seatIds: [seatB, seatA],
          idempotencyKey: 'deadlock-b',
        }),
      ]);

      const statuses = [a, b].map((result) =>
        result.status === 'fulfilled' ? result.value.status : 0,
      );

      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    });

    it('handles 10 concurrent users competing for the same seat', async () => {
      const users = await Promise.all(
        Array.from({ length: 10 }, (_, i) => createUser(`Race User ${i + 1}`)),
      );
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const results = await Promise.allSettled(
        users.map((user, index) =>
          createReservation({
            sessionId,
            userId: user.id,
            seatIds: [seatId],
            idempotencyKey: `race-10-${index}`,
          }),
        ),
      );

      const statuses = results.map((result) =>
        result.status === 'fulfilled' ? result.value.status : 0,
      );

      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(9);
    });
  });

  describe('Payments and Sales', () => {
    it('confirms payment, marks seats as sold, and publishes payment.confirmed event', async () => {
      const user = await createUser('Payment User');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const reservation = await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seatId],
      }).expect(201);

      const payment = await request(baseUrl)
        .post('/api/payments/confirm')
        .send({ reservationId: reservation.body.id })
        .expect(201);

      expect(payment.body.id).toBeDefined();
      expect(payment.body.reservationId).toBe(reservation.body.id);

      const reservationDetails = await request(baseUrl)
        .get(`/api/reservations/${reservation.body.id}`)
        .expect(200);
      expect(reservationDetails.body.status).toBe(ReservationStatus.CONFIRMED);

      const availability = await loadAvailability(sessionId);
      const seat = availability.seats.find((s) => s.id === seatId);
      expect(seat?.status).toBe(SeatStatus.SOLD);

      const purchaseHistory = await request(baseUrl)
        .get(`/api/payments/users/${user.id}/sales`)
        .query({ page: 1, limit: 10 })
        .expect(200);
      expect(purchaseHistory.body.userId).toBe(user.id);
      expect(purchaseHistory.body.sales.data.length).toBeGreaterThanOrEqual(1);

      await waitForEvent(
        'payment.confirmed',
        (payload) =>
          (payload as { reservationId?: string }).reservationId ===
          reservation.body.id,
      );
    });

    it('rejects reservation when seat is already sold', async () => {
      const userA = await createUser('Sold A');
      const userB = await createUser('Sold B');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const reservation = await createReservation({
        sessionId,
        userId: userA.id,
        seatIds: [seatId],
      }).expect(201);

      await request(baseUrl)
        .post('/api/payments/confirm')
        .send({ reservationId: reservation.body.id })
        .expect(201);

      await createReservation({
        sessionId,
        userId: userB.id,
        seatIds: [seatId],
      }).expect(409);
    });

    it('calculates totalAmount as price * seat count', async () => {
      const user = await createUser('Price User');
      const { sessionId, seats } = await createSession();
      const seatIds = [seats[0].id, seats[1].id];
      const expectedTotal = (25.0 * seatIds.length).toFixed(2);

      const reservation = await createReservation({
        sessionId,
        userId: user.id,
        seatIds,
      }).expect(201);

      const payment = await request(baseUrl)
        .post('/api/payments/confirm')
        .send({ reservationId: reservation.body.id })
        .expect(201);

      expect(payment.body.totalAmount).toBe(expectedTotal);
    });
  });

  describe('Expiration', () => {
    it('expires reservations after 30s, releases seats, and publishes events', async () => {
      const user = await createUser('Expire User');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const reservation = await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seatId],
      }).expect(201);

      await new Promise((resolve) => setTimeout(resolve, 31_000));

      await waitForReservationStatus(
        reservation.body.id,
        ReservationStatus.EXPIRED,
      );

      const availability = await loadAvailability(sessionId);
      const seat = availability.seats.find((s) => s.id === seatId);
      expect(seat?.status).toBe(SeatStatus.AVAILABLE);

      await waitForEvent(
        'reservation.expired',
        (payload) =>
          (payload as { reservationId?: string }).reservationId ===
          reservation.body.id,
        15000,
      );

      await waitForEvent(
        'seat.released',
        (payload) =>
          (payload as { reservationId?: string }).reservationId ===
          reservation.body.id,
        15000,
      );

      await request(baseUrl)
        .post('/api/payments/confirm')
        .send({ reservationId: reservation.body.id })
        .expect(409);
    });
  });

  describe('Messaging reliability', () => {
    it('persists published events into audit log', async () => {
      const user = await createUser('Audit User');
      const { sessionId, seats } = await createSession();
      const seatId = seats[0].id;

      const reservation = await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seatId],
      }).expect(201);

      await waitForEventLog(
        'reservation.created',
        (payload) => (payload as { id?: string }).id === reservation.body.id,
        10000,
      );
    });

    it('configures expiration delay queue with dead-letter routing', async () => {
      const user = await createUser('DLQ User');
      const { sessionId, seats } = await createSession();

      await createReservation({
        sessionId,
        userId: user.id,
        seatIds: [seats[0].id],
      }).expect(201);

      const delayQueue =
        process.env.RESERVATION_EXPIRATION_DELAY_QUEUE ??
        'reservation.expiration.delay';
      const exchange = process.env.EVENTS_EXCHANGE ?? 'cinema.events';
      const expiredQueue =
        process.env.RESERVATION_EXPIRED_QUEUE ?? 'reservation.expired';

      const info = await loadQueueInfo(delayQueue);
      const args = info.arguments ?? {};

      expect(args['x-dead-letter-exchange']).toBe(exchange);
      expect(args['x-dead-letter-routing-key']).toBe(expiredQueue);
    });
  });
});
