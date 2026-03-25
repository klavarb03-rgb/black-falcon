import { EntitySchema } from 'typeorm'

export interface Donor {
  id: string
  name: string
  contact: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export const DonorEntity = new EntitySchema<Donor>({
  name: 'Donor',
  tableName: 'donors',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    name: { type: 'varchar', nullable: false },
    contact: { type: 'varchar', nullable: true },
    notes: { type: 'text', nullable: true },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    updatedAt: { type: 'datetime', name: 'updated_at', updateDate: true }
  }
})
