import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as path from 'path';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: Number(configService.get<string>('DB_PORT', '5432')),
  username: configService.get<string>('DB_USER', 'app'),
  password: configService.get<string>('DB_PASSWORD', 'app'),
  database: configService.get<string>('DB_NAME', 'cinema'),
  entities: [
    path.join(__dirname, '../../modules/**/entities/*.entity{.ts,.js}'),
  ],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
});

export default AppDataSource;
