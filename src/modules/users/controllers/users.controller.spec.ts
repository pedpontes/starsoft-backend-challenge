import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { AddUserService } from '../services/add-user/add-user.service';
import { LoadUsersService } from '../services/load-users/load-users.service';
import { LoadUserService } from '../services/load-user/load-user.service';
import { UpdateUserService } from '../services/update-user/update-user.service';
import { RemoveUserService } from '../services/remove-user/remove-user.service';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AddUserService, useValue: {} },
        { provide: LoadUsersService, useValue: {} },
        { provide: LoadUserService, useValue: {} },
        { provide: UpdateUserService, useValue: {} },
        { provide: RemoveUserService, useValue: {} },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
