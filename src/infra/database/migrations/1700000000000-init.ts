import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        email varchar(255) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        movie_title varchar(255) NOT NULL,
        starts_at timestamptz NOT NULL,
        room varchar(100) NOT NULL,
        price numeric(10,2) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE seats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        label varchar(10) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (session_id, label)
      )
    `);

    await queryRunner.query(`
      CREATE TYPE reservation_status AS ENUM ('RESERVED', 'EXPIRED', 'CONFIRMED')
    `);

    await queryRunner.query(`
      CREATE TABLE reservations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        status reservation_status NOT NULL DEFAULT 'RESERVED',
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE reservation_seats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (reservation_id, seat_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reservation_id uuid NULL,
        total_amount numeric(10,2) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE sale_seats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (sale_id, seat_id),
        UNIQUE (seat_id)
      )
    `);

    await queryRunner.query(
      'CREATE INDEX idx_reservations_session_id ON reservations(session_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_reservations_user_id ON reservations(user_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_reservations_expires_at ON reservations(expires_at)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_sales_session_id ON sales(session_id)',
    );
    await queryRunner.query('CREATE INDEX idx_sales_user_id ON sales(user_id)');
    await queryRunner.query(
      'CREATE INDEX idx_reservation_seats_seat_id ON reservation_seats(seat_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_sale_seats_seat_id ON sale_seats(seat_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_sale_seats_seat_id');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_reservation_seats_seat_id',
    );
    await queryRunner.query('DROP INDEX IF EXISTS idx_sales_user_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_sales_session_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_reservations_expires_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_reservations_user_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_reservations_session_id');

    await queryRunner.query('DROP TABLE IF EXISTS sale_seats');
    await queryRunner.query('DROP TABLE IF EXISTS sales');
    await queryRunner.query('DROP TABLE IF EXISTS reservation_seats');
    await queryRunner.query('DROP TABLE IF EXISTS reservations');
    await queryRunner.query('DROP TYPE IF EXISTS reservation_status');
    await queryRunner.query('DROP TABLE IF EXISTS seats');
    await queryRunner.query('DROP TABLE IF EXISTS sessions');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
