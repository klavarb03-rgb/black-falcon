import { app } from 'electron'
import { join } from 'path'
import { DataSource } from 'typeorm'
import {
  UserEntity,
  DonorEntity,
  ItemGroupEntity,
  ItemEntity,
  OperationEntity,
  KitTemplateEntity,
  KitEntity,
  SyncQueueEntity
} from './entities'
import { InitialSchema1742860800000 } from './migrations/1742860800000-InitialSchema'

let dataSource: DataSource | null = null

export async function initDatabase(): Promise<DataSource> {
  const dbPath = join(app.getPath('userData'), 'black-falcon.db')

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: dbPath,
    entities: [
      UserEntity,
      DonorEntity,
      ItemGroupEntity,
      ItemEntity,
      OperationEntity,
      KitTemplateEntity,
      KitEntity,
      SyncQueueEntity
    ],
    migrations: [InitialSchema1742860800000],
    migrationsRun: true,
    synchronize: false,
    logging: process.env['NODE_ENV'] === 'development'
  })

  await dataSource.initialize()
  return dataSource
}

export function getDatabase(): DataSource {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dataSource
}

export async function closeDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy()
    dataSource = null
  }
}

export * from './entities'
