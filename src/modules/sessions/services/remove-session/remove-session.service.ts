import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../../repositories/contracts/session.repository';

@Injectable()
export class RemoveSessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async removeSession(sessionId: string) {
    const removed = await this.sessionRepository.remove(sessionId);
    if (!removed) {
      throw new NotFoundException('Session not found.');
    }
  }
}
