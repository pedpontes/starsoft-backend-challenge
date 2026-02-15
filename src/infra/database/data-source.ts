import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASSWORD ?? 'app',
  database: process.env.DB_NAME ?? 'cinema',
  entities: [
    path.join(__dirname, '../../modules/**/entities/*.entity{.ts,.js}'),
  ],
  migrations: [path.join(__dirname, './migrations/*{.ts,.js}')],
});

export default AppDataSource;
