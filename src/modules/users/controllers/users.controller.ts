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
import { AddUserDto } from '../dtos/add-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UsersPaginationRequestDto } from '../dtos/users-pagination-request.dto';
import { UsersService } from '../services/users.service';
import { SalesService } from '../../payments/services/sales.service';
import { SalePaginationRequestDto } from '../../payments/dtos/sale-pagination-request.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly salesService: SalesService,
  ) {}

  @Post()
  async add(@Body() dto: AddUserDto) {
    const user = await this.usersService.addUser(dto);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  @Get()
  async loadAll(@Query() pagination: UsersPaginationRequestDto) {
    return this.usersService.loadAll(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.loadById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.usersService.removeUser(id);
    return { id };
  }

  @Get(':id/sales')
  async sales(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() pagination: SalePaginationRequestDto,
  ) {
    const sales = await this.salesService.loadPurchaseHistory(id, pagination);
    return { userId: id, sales };
  }
}
