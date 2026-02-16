import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSessionDto } from '../../dtos/update-session.dto';
import {
  SessionRepository,
  UpdateSessionInput,
} from '../../repositories/contracts/session.repository';

@Injectable()
export class UpdateSessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async updateSession(sessionId: string, dto: UpdateSessionDto) {
    const updates = this.buildUpdateInput(dto);
    const session = await this.sessionRepository.update(sessionId, updates);
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    return session;
  }

  private buildUpdateInput(
    dto: UpdateSessionDto,
  ): UpdateSessionInput {
    if (
      !dto.movieTitle &&
      !dto.startsAt &&
      !dto.room &&
      dto.price === undefined
    ) {
      throw new BadRequestException('No fields to update.');
    }

    const updates: UpdateSessionInput = {};
    if (dto.movieTitle) {
      updates.movieTitle = dto.movieTitle;
    }
    if (dto.startsAt) {
      updates.startsAt = new Date(dto.startsAt);
    }
    if (dto.room) {
      updates.room = dto.room;
    }
    if (dto.price !== undefined) {
      updates.price = dto.price.toFixed(2);
    }

    return updates;
  }
}
