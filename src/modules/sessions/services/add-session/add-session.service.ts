import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSessionDto } from '../../dtos/create-session.dto';
import {
  AddSessionDto as AddSessionRepositoryDto,
  SessionRepository,
} from '../../repositories/contracts/session.repository';

@Injectable()
export class AddSessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async addSession(dto: CreateSessionDto) {
    const labels = this.resolveSeatLabels(dto);
    const addSession: AddSessionRepositoryDto = {
      movieTitle: dto.movieTitle,
      startsAt: new Date(dto.startsAt),
      room: dto.room,
      price: dto.price.toFixed(2),
    };

    return await this.sessionRepository.add(addSession, labels);
  }

  private resolveSeatLabels(dto: CreateSessionDto) {
    const labels =
      dto.seatLabels && dto.seatLabels.length > 0
        ? dto.seatLabels
        : this.generateSeatLabels(dto.seatsCount);

    if (!labels || labels.length < 16) {
      throw new BadRequestException('At least 16 seats are required.');
    }

    const unique = new Set(labels);
    if (unique.size !== labels.length) {
      throw new BadRequestException('Duplicated seat labels.');
    }

    return labels;
  }

  private generateSeatLabels(seatsCount?: number) {
    if (!seatsCount) {
      return null;
    }

    return Array.from({ length: seatsCount }, (_, index) => `S${index + 1}`);
  }
}
