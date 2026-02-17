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
import { AddSeatService } from '../services/add-seat/add-seat.service';
import { LoadSeatService } from '../services/load-seat/load-seat.service';
import { LoadSeatsService } from '../services/load-seats/load-seats.service';
import { UpdateSeatService } from '../services/update-seat/update-seat.service';
import { RemoveSeatService } from '../services/remove-seat/remove-seat.service';
import { AddSeatDto } from '../dtos/add-seat.dto';
import { UpdateSeatDto } from '../dtos/update-seat.dto';
import { SeatsPaginationRequestDto } from '../dtos/seats-pagination-request.dto';
import { SeatsPaginationOrderBy } from '../types/seats.pagination';

@ApiTags('seats')
@Controller('seats')
export class SeatsController {
  constructor(
    private readonly addSeatService: AddSeatService,
    private readonly loadSeatsService: LoadSeatsService,
    private readonly loadSeatService: LoadSeatService,
    private readonly updateSeatService: UpdateSeatService,
    private readonly removeSeatService: RemoveSeatService,
  ) {}

  @Post()
  async add(@Body() dto: AddSeatDto) {
    return this.addSeatService.addSeat(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar assentos (paginado)' })
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
    example: 16,
    description: 'Quantidade de itens por página.',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: SeatsPaginationOrderBy,
    example: SeatsPaginationOrderBy.LabelAsc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'Filtros. Envie como deep object: filters[sessionId]=...&filters[label]=...',
    style: 'deepObject',
    explode: true,
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', format: 'uuid' },
        label: { type: 'string', example: 'A1' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Lista paginada de assentos.',
    schema: {
      example: {
        data: [
          {
            id: 'bf2c2df8-61e6-4b31-86ad-82053aa9cfd7',
            sessionId: '7c2b0f0a-2e48-4f9d-b5f5-6b8f2a2e7a0f',
            label: 'A1',
            createdAt: '2026-02-10T10:00:00.000Z',
            updatedAt: '2026-02-10T10:00:00.000Z',
          },
        ],
        page: 1,
        limit: 16,
        count: { total: 64 },
      },
    },
  })
  async loadAll(@Query() pagination: SeatsPaginationRequestDto) {
    return this.loadSeatsService.loadSeats(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loadSeatService.loadSeat(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSeatDto,
  ) {
    return this.updateSeatService.updateSeat(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.removeSeatService.removeSeat(id);
    return { id };
  }
}
