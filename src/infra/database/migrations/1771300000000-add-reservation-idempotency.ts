import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationIdempotency1771300000000
  implements MigrationInterface
{
  name = 'AddReservationIdempotency1771300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE reservations ADD COLUMN idempotency_key varchar(120) NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX uniq_reservations_user_idempotency_key ON reservations(user_id, idempotency_key)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS uniq_reservations_user_idempotency_key',
    );
    await queryRunner.query(
      'ALTER TABLE reservations DROP COLUMN IF EXISTS idempotency_key',
    );
  }
}
