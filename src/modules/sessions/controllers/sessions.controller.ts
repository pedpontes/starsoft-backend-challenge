import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { UpdateSessionDto } from '../dtos/update-session.dto';
import { SessionsPaginationRequestDto } from '../dtos/sessions-pagination-request.dto';
import { AddSessionService } from '../services/add-session/add-session.service';
import { UpdateSessionService } from '../services/update-session/update-session.service';
import { RemoveSessionService } from '../services/remove-session/remove-session.service';
import { LoadSessionsService } from '../services/load-sessions/load-sessions.service';
import { LoadSessionService } from '../services/load-session/load-session.service';
import { LoadAvailabilityService } from '../services/load-availability/load-availability.service';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly addSessionService: AddSessionService,
    private readonly loadSessionsService: LoadSessionsService,
    private readonly loadSessionService: LoadSessionService,
    private readonly loadAvailabilityService: LoadAvailabilityService,
    private readonly updateSessionService: UpdateSessionService,
    private readonly removeSessionService: RemoveSessionService,
  ) {}

  @Post()
  async add(@Body() dto: CreateSessionDto) {
    return this.addSessionService.addSession(dto);
  }

  @Get()
  async loadAll(@Query() pagination: SessionsPaginationRequestDto) {
    return this.loadSessionsService.loadSessions(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loadSessionService.loadSession(id);
  }

  @Get(':id/availability')
  async availability(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loadAvailabilityService.loadAvailability(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.updateSessionService.updateSession(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.removeSessionService.removeSession(id);
    return { id };
  }
}
