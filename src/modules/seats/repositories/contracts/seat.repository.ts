import { Seat } from '../../entities/seat.entity';
import {
  SeatsPaginationRequest,
  SeatsPaginationResponse,
} from '../../types/seats.pagination';

export type AddSeatInput = Pick<Seat, 'sessionId' | 'label'>;
export type UpdateSeatInput = Partial<Pick<Seat, 'label'>>;

export abstract class SeatRepository {
  abstract add(addSeat: AddSeatInput): Promise<Seat | null>;
  abstract loadById(id: Seat['id']): Promise<Seat | null>;
  abstract loadAll(
    request: SeatsPaginationRequest,
  ): Promise<SeatsPaginationResponse>;
  abstract update(
    id: Seat['id'],
    updates: UpdateSeatInput,
  ): Promise<Seat | null>;
  abstract remove(id: Seat['id']): Promise<boolean>;
}
