import { Injectable } from '@nestjs/common';
import type {
  SessionsPaginationRequest,
  SessionsPaginationResponse,
} from '../../types/sessions.pagination';
import { SessionRepository } from '../../repositories/contracts/session.repository';

@Injectable()
export class LoadSessionsService {
  constructor(
    private readonly sessionRepository: SessionRepository,
  ) {}

  async loadSessions(
    request: SessionsPaginationRequest,
  ): Promise<SessionsPaginationResponse> {
    return await this.sessionRepository.loadAll(request);
  }
}
