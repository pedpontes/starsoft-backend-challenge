import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionTypeOrmRepository } from '../../repositories/session.repository';

@Injectable()
export class RemoveSessionService {
  constructor(
    private readonly sessionRepository: SessionTypeOrmRepository,
  ) {}

  async removeSession(sessionId: string) {
    const removed = await this.sessionRepository.remove(sessionId);
    if (!removed) {
      throw new NotFoundException('Session not found.');
    }
  }
}
