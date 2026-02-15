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
import { AddUserService } from '../services/add-user/add-user.service';
import { LoadUsersService } from '../services/load-users/load-users.service';
import { LoadUserService } from '../services/load-user/load-user.service';
import { UpdateUserService } from '../services/update-user/update-user.service';
import { RemoveUserService } from '../services/remove-user/remove-user.service';
import { LoadPurchaseHistoryService } from '../../payments/services/load-purchase-history/load-purchase-history.service';
import { SalePaginationRequestDto } from '../../payments/dtos/sale-pagination-request.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly addUserService: AddUserService,
    private readonly loadUsersService: LoadUsersService,
    private readonly loadUserService: LoadUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly removeUserService: RemoveUserService,
    private readonly loadPurchaseHistoryService: LoadPurchaseHistoryService,
  ) {}

  @Post()
  async add(@Body() dto: AddUserDto) {
    const user = await this.addUserService.addUser(dto);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  @Get()
  async loadAll(@Query() pagination: UsersPaginationRequestDto) {
    return this.loadUsersService.loadAll(pagination);
  }

  @Get(':id')
  async loadById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.loadUserService.loadById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.updateUserService.updateUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.removeUserService.removeUser(id);
    return { id };
  }

  @Get(':id/sales')
  async sales(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() pagination: SalePaginationRequestDto,
  ) {
    const sales = await this.loadPurchaseHistoryService.loadPurchaseHistory(
      id,
      pagination,
    );
    return { userId: id, sales };
  }
}
