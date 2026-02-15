import { Seat } from '../../entities/seat.entity';
import { AddSeatDto } from '../../dtos/add-seat.dto';
import {
  SeatsPaginationRequest,
  SeatsPaginationResponse,
} from '../../types/seats.pagination';

export abstract class SeatRepository {
  abstract add(addSeat: AddSeatDto): Promise<Seat | null>;
  abstract loadById(id: Seat['id']): Promise<Seat | null>;
  abstract loadAll(
    request: SeatsPaginationRequest,
  ): Promise<SeatsPaginationResponse>;
  abstract update(
    id: Seat['id'],
    updates: Partial<AddSeatDto>,
  ): Promise<Seat | null>;
  abstract remove(id: Seat['id']): Promise<boolean>;
}
