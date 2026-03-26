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

export type SyncOperation = 'insert' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity('sync_queue')
export class SyncQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', length: 100, name: 'entity_type' })
  entityType!: string;

  @Column({ type: 'uuid', name: 'entity_id' })
  entityId!: string;

  @Column({
    type: 'enum',
    enum: ['insert', 'update', 'delete'],
  })
  operation!: SyncOperation;

  @Column({ type: 'jsonb', default: '{}' })
  payload!: Record<string, unknown>;

  @Column({ type: 'int', default: 1 })
  clientVersion!: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status!: SyncStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'smallint', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
