import { Injectable } from '@nestjs/common';
import type {
  SessionsPaginationRequest,
  SessionsPaginationResponse,
} from '../../types/sessions.pagination';
import { SessionTypeOrmRepository } from '../../repositories/session.repository';

@Injectable()
export class LoadSessionsService {
  constructor(
    private readonly sessionRepository: SessionTypeOrmRepository,
  ) {}

  async loadSessions(
    request: SessionsPaginationRequest,
  ): Promise<SessionsPaginationResponse> {
    return await this.sessionRepository.loadAll(request);
  }
}
