import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { ReservationsPaginationRequestDto } from '../dtos/reservations-pagination-request.dto';
import { AddReservationService } from '../services/add-reservation/add-reservation.service';
import { LoadReservationsService } from '../services/load-reservations/load-reservations.service';
import { LoadReservationService } from '../services/load-reservation/load-reservation.service';
import { UpdateReservationService } from '../services/update-reservation/update-reservation.service';
import { RemoveReservationService } from '../services/remove-reservation/remove-reservation.service';
import { ReservationsPaginationOrderBy } from '../types/reservations.pagination';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly addReservationService: AddReservationService,
    private readonly loadReservationsService: LoadReservationsService,
    private readonly loadReservationService: LoadReservationService,
    private readonly updateReservationService: UpdateReservationService,
    private readonly removeReservationService: RemoveReservationService,
  ) {}

  @Post()
  async add(
    @Body() dto: CreateReservationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const reservation = await this.addReservationService.addReservation(
      dto,
      idempotencyKey,
    );
    return {
      id: reservation.id,
      expiresAt: reservation.expiresAt,
      status: reservation.status,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar reservas (paginado)' })
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
    enum: ReservationsPaginationOrderBy,
    example: ReservationsPaginationOrderBy.CreatedAtDesc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'Filtros. Envie como deep object: filters[userId]=...&filters[status]=...',
    style: 'deepObject',
    explode: true,
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid' },
        sessionId: { type: 'string', format: 'uuid' },
        status: { type: 'string', example: 'RESERVED' },
        from: { type: 'string', format: 'date-time' },
        to: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Lista paginada de reservas.',
    schema: {
      example: {
        data: [
          {
            id: '1c0dcbfd-1f6d-4fd6-8f18-1d2aa5d1d0b7',
            sessionId: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
            userId: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
            status: 'RESERVED',
            expiresAt: '2026-02-20T19:00:30.000Z',
            idempotencyKey: 'abc-123',
            createdAt: '2026-02-20T19:00:00.000Z',
            updatedAt: '2026-02-20T19:00:00.000Z',
          },
        ],
        page: 1,
        limit: 10,
        count: { total: 12 },
      },
    },
  })
  async loadAll(@Query() pagination: ReservationsPaginationRequestDto) {
    return this.loadReservationsService.loadReservations(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loadReservationService.loadReservation(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.updateReservationService.updateReservation(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.removeReservationService.removeReservation(id);
    return { id };
  }
}
