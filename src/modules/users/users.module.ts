import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { User } from './entities/user.entity';
import { UserTypeOrmRepository } from './repositories/user.repository';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), PaymentsModule],
  controllers: [UsersController],
  providers: [UsersService, UserTypeOrmRepository],
})
export class UsersModule {}
