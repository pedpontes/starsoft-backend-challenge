import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventLogs1771275133901 implements MigrationInterface {
  name = 'AddEventLogs1771275133901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE event_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name varchar(120) NOT NULL,
        payload jsonb NOT NULL,
        source varchar(120) NULL,
        correlation_id varchar(120) NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      'CREATE INDEX idx_event_logs_event_name ON event_logs(event_name)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_event_logs_correlation_id ON event_logs(correlation_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_event_logs_created_at ON event_logs(created_at)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_event_logs_created_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_event_logs_correlation_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_event_logs_event_name');
    await queryRunner.query('DROP TABLE IF EXISTS event_logs');
  }
}
