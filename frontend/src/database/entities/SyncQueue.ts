import { EntitySchema } from 'typeorm'

export type SyncOperation = 'create' | 'update' | 'delete'

export interface SyncQueue {
  id: string
  entityType: string
  entityId: string
  operation: SyncOperation
  payload: string
  synced: boolean
  createdAt: Date
  syncedAt: Date | null
}

export const SyncQueueEntity = new EntitySchema<SyncQueue>({
  name: 'SyncQueue',
  tableName: 'sync_queue',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    entityType: { type: 'varchar', name: 'entity_type', nullable: false },
    entityId: { type: 'varchar', name: 'entity_id', nullable: false },
    operation: { type: 'varchar', nullable: false },
    payload: { type: 'text', nullable: false },
    synced: { type: 'boolean', nullable: false, default: false },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    syncedAt: { type: 'datetime', name: 'synced_at', nullable: true }
  },
  indices: [
    { columns: ['synced'] },
    { columns: ['entityType', 'entityId'] }
  ]
})
