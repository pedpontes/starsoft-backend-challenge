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
import { AddSeatService } from '../services/add-seat/add-seat.service';
import { LoadSeatService } from '../services/load-seat/load-seat.service';
import { LoadSeatsService } from '../services/load-seats/load-seats.service';
import { UpdateSeatService } from '../services/update-seat/update-seat.service';
import { RemoveSeatService } from '../services/remove-seat/remove-seat.service';
import { AddSeatDto } from '../dtos/add-seat.dto';
import { UpdateSeatDto } from '../dtos/update-seat.dto';
import { SeatsPaginationRequestDto } from '../dtos/seats-pagination-request.dto';

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
