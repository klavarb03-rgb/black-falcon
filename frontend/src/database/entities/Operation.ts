import { EntitySchema } from 'typeorm'
import type { Item } from './Item'
import type { User } from './User'

export type OperationType = 'transfer' | 'writeoff' | 'receive'

export interface Operation {
  id: string
  type: OperationType
  itemId: string
  item: Item
  fromUserId: string | null
  fromUser: User | null
  toUserId: string | null
  toUser: User | null
  quantity: number
  notes: string | null
  performedById: string
  performedBy: User
  performedAt: Date
  createdAt: Date
  updatedAt: Date
}

export const OperationEntity = new EntitySchema<Operation>({
  name: 'Operation',
  tableName: 'operations',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    type: { type: 'varchar', nullable: false },
    itemId: { type: 'varchar', name: 'item_id', nullable: false },
    fromUserId: { type: 'varchar', name: 'from_user_id', nullable: true },
    toUserId: { type: 'varchar', name: 'to_user_id', nullable: true },
    quantity: { type: 'integer', nullable: false },
    notes: { type: 'text', nullable: true },
    performedById: { type: 'varchar', name: 'performed_by', nullable: false },
    performedAt: { type: 'datetime', name: 'performed_at', nullable: false },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    updatedAt: { type: 'datetime', name: 'updated_at', updateDate: true }
  },
  relations: {
    item: {
      target: 'Item',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'item_id' }
    },
    fromUser: {
      target: 'User',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'from_user_id' }
    },
    toUser: {
      target: 'User',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'to_user_id' }
    },
    performedBy: {
      target: 'User',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'performed_by' }
    }
  },
  indices: [
    { columns: ['itemId'] },
    { columns: ['performedById'] },
    { columns: ['performedAt'] },
    { columns: ['type'] }
  ]
})
