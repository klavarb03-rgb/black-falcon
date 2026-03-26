import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, Item, Operation, Group, Kit, KitTemplate, Donor, SyncQueue } from '../entities';

let dataSource: DataSource | null = null;

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'black_falcon',
    synchronize: false, // Відключаю, бо вже є міграції
    logging: process.env.NODE_ENV === 'development',
    entities: [User, Item, Operation, Group, Kit, KitTemplate, Donor, SyncQueue],
    migrations: ['dist/migrations/*.js'],
    subscribers: [],
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}

export async function getDataSource(): Promise<DataSource> {
  if (!dataSource) {
    dataSource = createDataSource();
  }

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  return dataSource;
}

export async function closeDataSource(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
  }
}
