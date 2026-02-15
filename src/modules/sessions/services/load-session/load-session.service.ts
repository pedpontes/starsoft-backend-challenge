import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../../repositories/contracts/session.repository';

@Injectable()
export class LoadSessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async loadSession(sessionId: string) {
    const session = await this.sessionRepository.loadById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    return session;
  }
}
