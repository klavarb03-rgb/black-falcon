import { EntitySchema } from 'typeorm'
import type { User } from './User'
import type { Kit } from './Kit'

export interface KitTemplate {
  id: string
  name: string
  description: string | null
  createdById: string
  createdBy: User
  kits: Kit[]
  createdAt: Date
  updatedAt: Date
}

export const KitTemplateEntity = new EntitySchema<KitTemplate>({
  name: 'KitTemplate',
  tableName: 'kit_templates',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    name: { type: 'varchar', nullable: false },
    description: { type: 'text', nullable: true },
    createdById: { type: 'varchar', name: 'created_by', nullable: false },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    updatedAt: { type: 'datetime', name: 'updated_at', updateDate: true }
  },
  relations: {
    createdBy: {
      target: 'User',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'created_by' }
    },
    kits: {
      target: 'Kit',
      type: 'one-to-many',
      inverseSide: 'template'
    }
  }
})
