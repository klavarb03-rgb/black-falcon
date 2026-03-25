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
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName!: string | null;

  @Column({ type: 'enum', enum: ['admin', 'leader', 'manager'], default: 'manager' })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Item, (item) => item.owner)
  items!: Item[];

  @OneToMany(() => Operation, (op) => op.createdBy)
  operations!: Operation[];

  @OneToMany(() => Group, (group) => group.owner)
  groups!: Group[];
}
