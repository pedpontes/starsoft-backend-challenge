import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSeatLocks1771276793520 implements MigrationInterface {
  name = 'AddSeatLocks1771276793520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE seat_locks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        released_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX idx_seat_locks_reservation_id ON seat_locks(reservation_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_seat_locks_session_id ON seat_locks(session_id)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX uniq_seat_locks_active_seat ON seat_locks(seat_id) WHERE released_at IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS uniq_seat_locks_active_seat');
    await queryRunner.query('DROP INDEX IF EXISTS idx_seat_locks_session_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_seat_locks_reservation_id');
    await queryRunner.query('DROP TABLE IF EXISTS seat_locks');
  }
}
