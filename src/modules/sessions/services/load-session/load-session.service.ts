import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionTypeOrmRepository } from '../../repositories/session.repository';

@Injectable()
export class LoadSessionService {
  constructor(
    private readonly sessionRepository: SessionTypeOrmRepository,
  ) {}

  async loadSession(sessionId: string) {
    const session = await this.sessionRepository.loadById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    return session;
  }
}
