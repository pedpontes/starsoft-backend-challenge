import { Session } from '../../entities/session.entity';

export class UpdateSessionDto {
  movieTitle?: Session['movieTitle'];
  startsAt?: Session['startsAt'];
  room?: Session['room'];
  price?: Session['price'];
}
