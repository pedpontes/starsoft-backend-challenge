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
import { SeatsService } from '../services/seats.service';
import { AddSeatDto } from '../dtos/add-seat.dto';
import { UpdateSeatDto } from '../dtos/update-seat.dto';
import { SeatsPaginationRequestDto } from '../dtos/seats-pagination-request.dto';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Post()
  async add(@Body() dto: AddSeatDto) {
    return this.seatsService.addSeat(dto);
  }

  @Get()
  async loadAll(@Query() pagination: SeatsPaginationRequestDto) {
    return this.seatsService.loadSeats(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.seatsService.loadSeat(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSeatDto,
  ) {
    return this.seatsService.updateSeat(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.seatsService.removeSeat(id);
    return { id };
  }
}
