import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Seat } from '../../seats/entities/seat.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Sale } from '../../payments/entities/sale.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'movie_title', type: 'varchar', length: 255 })
  movieTitle: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'varchar', length: 100 })
  room: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Seat, (seat) => seat.session)
  seats: Seat[];

  @OneToMany(() => Reservation, (reservation) => reservation.session)
  reservations: Reservation[];

  @OneToMany(() => Sale, (sale) => sale.session)
  sales: Sale[];
}
