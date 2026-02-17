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
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { ReservationsPaginationRequestDto } from '../dtos/reservations-pagination-request.dto';
import { AddReservationService } from '../services/add-reservation/add-reservation.service';
import { LoadReservationsService } from '../services/load-reservations/load-reservations.service';
import { LoadReservationService } from '../services/load-reservation/load-reservation.service';
import { UpdateReservationService } from '../services/update-reservation/update-reservation.service';
import { RemoveReservationService } from '../services/remove-reservation/remove-reservation.service';

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
