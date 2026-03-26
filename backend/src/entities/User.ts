import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Item } from './Item';
import { Operation } from './Operation';
import { Group } from './Group';

export type UserRole = 'admin' | 'leader' | 'manager';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;
  
  // Alias для сумісності
  get username(): string {
    return this.email;
  }

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'name' })
  fullName!: string | null;

  @Column({ type: 'enum', enum: ['admin', 'leader', 'manager'], default: 'manager' })
  role!: UserRole;
  
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;
  
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;
  
  @Column({ type: 'int', default: 1 })
  version!: number;
  
  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Item, (item) => item.owner)
  items!: Item[];

  @OneToMany(() => Operation, (operation) => operation.createdBy)
  performedOperations!: Operation[];

  @OneToMany(() => Group, (group) => group.owner)
  groups!: Group[];
}