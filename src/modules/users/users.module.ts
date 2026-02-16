import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { AddUserService } from './services/add-user/add-user.service';
import { LoadUsersService } from './services/load-users/load-users.service';
import { LoadUserService } from './services/load-user/load-user.service';
import { UpdateUserService } from './services/update-user/update-user.service';
import { RemoveUserService } from './services/remove-user/remove-user.service';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/contracts/user.repository';
import { UserTypeOrmRepository } from './repositories/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    AddUserService,
    LoadUsersService,
    LoadUserService,
    UpdateUserService,
    RemoveUserService,
    {
      provide: UserRepository,
      useClass: UserTypeOrmRepository,
    },
  ],
})
export class UsersModule {}
