import { EntitySchema } from 'typeorm'
import type { User } from './User'
import type { ItemGroup } from './ItemGroup'
import type { Donor } from './Donor'

export type ItemStatus = 'government' | 'volunteer'

export interface Item {
  id: string
  name: string
  description: string | null
  quantity: number
  unit: string
  status: ItemStatus
  groupId: string | null
  group: ItemGroup | null
  ownerId: string
  owner: User
  donorId: string | null
  donor: Donor | null
  metadata: string | null
  version: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const ItemEntity = new EntitySchema<Item>({
  name: 'Item',
  tableName: 'items',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    name: { type: 'varchar', nullable: false },
    description: { type: 'text', nullable: true },
    quantity: { type: 'integer', nullable: false, default: 0 },
    unit: { type: 'varchar', nullable: false, default: 'шт' },
    status: { type: 'varchar', nullable: false },
    groupId: { type: 'varchar', name: 'group_id', nullable: true },
    ownerId: { type: 'varchar', name: 'owner_id', nullable: false },
    donorId: { type: 'varchar', name: 'donor_id', nullable: true },
    metadata: { type: 'text', nullable: true },
    version: { type: 'integer', nullable: false, default: 1 },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    updatedAt: { type: 'datetime', name: 'updated_at', updateDate: true },
    deletedAt: { type: 'datetime', name: 'deleted_at', nullable: true, deleteDate: true }
  },
  relations: {
    group: {
      target: 'ItemGroup',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'group_id' }
    },
    owner: {
      target: 'User',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'owner_id' }
    },
    donor: {
      target: 'Donor',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'donor_id' }
    }
  },
  indices: [
    { columns: ['ownerId'] },
    { columns: ['groupId'] },
    { columns: ['status'] },
    { columns: ['version'] }
  ]
})
