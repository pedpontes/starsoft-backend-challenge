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
import { SessionsService } from '../services/sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async add(@Body() dto: CreateSessionDto) {
    return this.sessionsService.addSession(dto);
  }

  @Get()
  async loadAll(@Query() pagination: SessionsPaginationRequestDto) {
    return this.sessionsService.loadSessions(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sessionsService.loadSession(id);
  }

  @Get(':id/availability')
  async availability(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.sessionsService.loadAvailability(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.updateSession(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.sessionsService.removeSession(id);
    return { id };
  }
}
