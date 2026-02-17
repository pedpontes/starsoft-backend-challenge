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
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { UpdateSessionDto } from '../dtos/update-session.dto';
import { SessionsPaginationRequestDto } from '../dtos/sessions-pagination-request.dto';
import { AddSessionService } from '../services/add-session/add-session.service';
import { UpdateSessionService } from '../services/update-session/update-session.service';
import { RemoveSessionService } from '../services/remove-session/remove-session.service';
import { LoadSessionsService } from '../services/load-sessions/load-sessions.service';
import { LoadSessionService } from '../services/load-session/load-session.service';
import { LoadAvailabilityService } from '../services/load-availability/load-availability.service';
import { SessionsPaginationOrderBy } from '../types/sessions.pagination';

@ApiTags('sessions')
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
  @ApiOperation({ summary: 'Listar sessões (paginado)' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: true,
    example: 1,
    description: 'Número da página (1-based).',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: true,
    example: 10,
    description: 'Quantidade de itens por página.',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: SessionsPaginationOrderBy,
    example: SessionsPaginationOrderBy.StartsAtAsc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'Filtros. Envie como deep object: filters[movieTitle]=...&filters[from]=...',
    style: 'deepObject',
    explode: true,
    schema: {
      type: 'object',
      properties: {
        movieTitle: { type: 'string', example: 'Movie X' },
        room: { type: 'string', example: 'Room A' },
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Lista paginada de sessões.',
    schema: {
      example: {
        data: [
          {
            id: '6d2f2cb2-5c24-4ee8-9b0a-8d85d0fcb1a5',
            movieTitle: 'Movie X',
            startsAt: '2026-02-20T19:00:00.000Z',
            room: 'Room A',
            price: '25.00',
            createdAt: '2026-02-10T10:00:00.000Z',
            updatedAt: '2026-02-10T10:00:00.000Z',
          },
        ],
        page: 1,
        limit: 10,
        count: { total: 32 },
      },
    },
  })
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
