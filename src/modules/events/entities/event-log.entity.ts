import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('event_logs')
@Index(['eventName'])
@Index(['correlationId'])
@Index(['createdAt'])
export class EventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_name', type: 'varchar', length: 120 })
  eventName: string;

  @Column({ type: 'jsonb' })
  payload: unknown;

  @Column({ type: 'varchar', length: 120, nullable: true })
  source?: string | null;

  @Column({ name: 'correlation_id', type: 'varchar', length: 120, nullable: true })
  correlationId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
