import { EntitySchema } from 'typeorm'
import type { KitTemplate } from './KitTemplate'
import type { Item } from './Item'

export interface Kit {
  id: string
  templateId: string
  template: KitTemplate
  itemId: string
  item: Item
  quantity: number
  notes: string | null
}

export const KitEntity = new EntitySchema<Kit>({
  name: 'Kit',
  tableName: 'kits',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    templateId: { type: 'varchar', name: 'template_id', nullable: false },
    itemId: { type: 'varchar', name: 'item_id', nullable: false },
    quantity: { type: 'integer', nullable: false },
    notes: { type: 'text', nullable: true }
  },
  relations: {
    template: {
      target: 'KitTemplate',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'template_id' },
      onDelete: 'CASCADE'
    },
    item: {
      target: 'Item',
      type: 'many-to-one',
      nullable: false,
      joinColumn: { name: 'item_id' }
    }
  },
  indices: [
    { columns: ['templateId'] },
    { columns: ['itemId'] }
  ]
})
