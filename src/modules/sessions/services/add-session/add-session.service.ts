import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSessionDto } from '../../dtos/create-session.dto';
import { SessionRepository } from '../../repositories/contracts/session.repository';

@Injectable()
export class AddSessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async addSession(dto: CreateSessionDto) {
    const labels = this.resolveSeatLabels(dto);
    return await this.sessionRepository.add(dto, labels);
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
