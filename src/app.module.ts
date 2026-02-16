import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SeatsModule } from './modules/seats/seats.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UsersModule } from './modules/users/users.module';
import { EventsAuditModule } from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    SessionsModule,
    SeatsModule,
    ReservationsModule,
    PaymentsModule,
    UsersModule,
    EventsAuditModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
