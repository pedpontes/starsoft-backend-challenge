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

@Controller('users')
export class UsersController {
  constructor(
    private readonly addUserService: AddUserService,
    private readonly loadUsersService: LoadUsersService,
    private readonly loadUserService: LoadUserService,
    private readonly updateUserService: UpdateUserService,
    private readonly removeUserService: RemoveUserService,
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
}
