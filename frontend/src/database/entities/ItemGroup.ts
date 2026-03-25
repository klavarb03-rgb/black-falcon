import { EntitySchema } from 'typeorm'
import type { User } from './User'

export interface ItemGroup {
  id: string
  name: string
  parentId: string | null
  parent: ItemGroup | null
  children: ItemGroup[]
  level: number
  userId: string
  user: User
  createdAt: Date
  updatedAt: Date
}

export const ItemGroupEntity = new EntitySchema<ItemGroup>({
  name: 'ItemGroup',
  tableName: 'item_groups',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    name: { type: 'varchar', nullable: false },
    parentId: { type: 'varchar', name: 'parent_id', nullable: true },
    level: { type: 'integer', nullable: false },
    userId: { type: 'varchar', name: 'user_id', nullable: false },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    updatedAt: { type: 'datetime', name: 'updated_at', updateDate: true }
  },
  relations: {
    parent: {
      target: 'ItemGroup',
      type: 'many-to-one',
      nullable: true,
      joinColumn: { name: 'parent_id' }
    },
    children: {
      target: 'ItemGroup',
      type: 'one-to-many',
      inverseSide: 'parent'
    },
    user: {
      target: 'User',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'user_id' }
    }
  },
  indices: [
    { columns: ['userId'] },
    { columns: ['parentId'] }
  ]
})
