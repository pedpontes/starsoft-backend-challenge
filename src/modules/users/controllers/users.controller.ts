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
import { AddUserDto } from '../dtos/add-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UsersPaginationRequestDto } from '../dtos/users-pagination-request.dto';
import { AddUserService } from '../services/add-user/add-user.service';
import { LoadUsersService } from '../services/load-users/load-users.service';
import { LoadUserService } from '../services/load-user/load-user.service';
import { UpdateUserService } from '../services/update-user/update-user.service';
import { RemoveUserService } from '../services/remove-user/remove-user.service';
import { UsersPaginationOrderBy } from '../types/users.pagination';

@ApiTags('users')
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
  @ApiOperation({ summary: 'Listar usuários (paginado)' })
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
    enum: UsersPaginationOrderBy,
    example: UsersPaginationOrderBy.CreatedAtDesc,
    description: 'Ordenação. Use "-" para desc.',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'Filtros. Envie como deep object: filters[name]=...&filters[email]=...',
    style: 'deepObject',
    explode: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Ana' },
        email: { type: 'string', example: 'ana@example.com' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Lista paginada de usuários.',
    schema: {
      example: {
        data: [
          {
            id: '3e0c6c21-64fb-4cf9-8fdb-60edc3f35c70',
            name: 'Ana Silva',
            email: 'ana@example.com',
            createdAt: '2026-02-10T10:00:00.000Z',
            updatedAt: '2026-02-10T10:00:00.000Z',
          },
        ],
        page: 1,
        limit: 10,
        count: { total: 50 },
      },
    },
  })
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
