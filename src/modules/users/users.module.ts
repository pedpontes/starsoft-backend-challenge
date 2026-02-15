import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { AddUserService } from './services/add-user/add-user.service';
import { LoadUsersService } from './services/load-users/load-users.service';
import { LoadUserService } from './services/load-user/load-user.service';
import { UpdateUserService } from './services/update-user/update-user.service';
import { RemoveUserService } from './services/remove-user/remove-user.service';
import { User } from './entities/user.entity';
import { UserTypeOrmRepository } from './repositories/user.repository';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), PaymentsModule],
  controllers: [UsersController],
  providers: [
    AddUserService,
    LoadUsersService,
    LoadUserService,
    UpdateUserService,
    RemoveUserService,
    UserTypeOrmRepository,
  ],
})
export class UsersModule {}
