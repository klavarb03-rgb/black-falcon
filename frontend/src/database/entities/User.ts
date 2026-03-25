import { EntitySchema } from 'typeorm'

export type UserRole = 'superadmin' | 'admin' | 'manager'

export interface User {
  id: string
  username: string
  passwordHash: string
  role: UserRole
  fullName: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const UserEntity = new EntitySchema<User>({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: 'varchar', primary: true, generated: 'uuid' },
    username: { type: 'varchar', unique: true, nullable: false },
    passwordHash: { type: 'varchar', name: 'password_hash', nullable: false },
    role: { type: 'varchar', nullable: false },
    fullName: { type: 'varchar', name: 'full_name', nullable: false },
    createdAt: { type: 'datetime', name: 'created_at', createDate: true },
    updatedAt: { type: 'datetime', name: 'updated_at', updateDate: true },
    deletedAt: { type: 'datetime', name: 'deleted_at', nullable: true, deleteDate: true }
  },
  indices: [{ columns: ['role'] }]
})
