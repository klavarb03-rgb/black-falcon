import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Item } from './Item';

export type OperationType = 'transfer' | 'write_off' | 'receive' | 'adjustment';

@Entity('operations')
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['transfer', 'write_off', 'receive', 'adjustment'] })
  type!: OperationType;

  @Column({ type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => Item, (item) => item.operations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'itemId' })
  item!: Item;

  @Column({ type: 'int' })
  quantityDelta!: number; // positive = in, negative = out

  @Column({ type: 'uuid', nullable: true })
  fromUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromUserId' })
  fromUser!: User | null;

  @Column({ type: 'uuid', nullable: true })
  toUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toUserId' })
  toUser!: User | null;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User, (user) => user.operations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
