import { Seat } from '../../../seats/entities/seat.entity';
import { Session } from '../../entities/session.entity';
import { AddSessionDto } from '../dtos/add-session.dto';
import { UpdateSessionDto } from '../dtos/update-session.dto';
import {
  SessionsPaginationRequest,
  SessionsPaginationResponse,
} from '../../types/sessions.pagination';

export abstract class SessionRepository {
  abstract add(
    addSession: AddSessionDto,
    seatLabels: string[],
  ): Promise<{ sessionId: string; seatsCount: number }>;
  abstract loadAll(
    request: SessionsPaginationRequest,
  ): Promise<SessionsPaginationResponse>;
  abstract loadById(id: Session['id']): Promise<Session | null>;
  abstract loadSeatsBySessionId(sessionId: Session['id']): Promise<Seat[]>;
  abstract loadReservedSeatIds(
    sessionId: Session['id'],
    seatIds: Seat['id'][],
  ): Promise<Seat['id'][]>;
  abstract loadSoldSeatIds(
    sessionId: Session['id'],
    seatIds: Seat['id'][],
  ): Promise<Seat['id'][]>;
  abstract update(
    id: Session['id'],
    updates: UpdateSessionDto,
  ): Promise<Session | null>;
  abstract remove(id: Session['id']): Promise<boolean>;
}

export { AddSessionDto, UpdateSessionDto };
