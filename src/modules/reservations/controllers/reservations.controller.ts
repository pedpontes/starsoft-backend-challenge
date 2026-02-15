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
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { ReservationsPaginationRequestDto } from '../dtos/reservations-pagination-request.dto';
import { ReservationsService } from '../services/reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  async add(@Body() dto: CreateReservationDto) {
    const reservation = await this.reservationsService.addReservation(dto);
    return {
      id: reservation.id,
      expiresAt: reservation.expiresAt,
      status: reservation.status,
    };
  }

  @Get()
  async loadAll(@Query() pagination: ReservationsPaginationRequestDto) {
    return this.reservationsService.loadReservations(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reservationsService.loadReservation(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.updateReservation(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.reservationsService.removeReservation(id);
    return { id };
  }
}
