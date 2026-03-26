import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Group } from './Group';
import { Donor } from './Donor';
import { Operation } from './Operation';

export type ItemStatus = 'government' | 'volunteer';
export type BalanceStatus = 'off_balance' | 'on_balance';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'enum', enum: ['government', 'volunteer'] })
  status!: ItemStatus;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unit!: string | null;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => Group, (group) => group.items, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group!: Group | null;

  @Column({ type: 'uuid', nullable: true })
  donorId!: string | null;

  @ManyToOne(() => Donor, (donor) => donor.items, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'donorId' })
  donor!: Donor | null;

  @Column({ type: 'varchar', length: 20, default: 'off_balance' })
  balance_status!: BalanceStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  document_number!: string | null;

  @Column({ type: 'date', nullable: true })
  document_date!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supplier_name!: string | null;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ type: 'int', default: 1 })
  version!: number; // for offline sync

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Operation, (op) => op.item)
  operations!: Operation[];
}
