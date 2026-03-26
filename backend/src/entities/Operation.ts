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

export type OperationType = 'transfer' | 'write_off' | 'receive' | 'adjustment' | 'transfer_to_balance';

@Entity('operations')
export class Operation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ['transfer', 'write_off', 'receive', 'adjustment', 'transfer_to_balance'] })
  type!: OperationType;

  @Column({ type: 'uuid', name: 'item_id' })
  itemId!: string;

  @ManyToOne(() => Item, (item) => item.operations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @Column({ type: 'numeric', name: 'quantity' })
  quantity!: number;

  @Column({ type: 'uuid', nullable: true, name: 'from_user_id' })
  fromUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'to_user_id' })
  toUserId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_user_id' })
  toUser!: User | null;

  @Column({ type: 'uuid', name: 'performed_by' })
  createdById!: string;

  @ManyToOne(() => User, (user) => user.performedOperations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'performed_by' })
  createdBy!: User;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
