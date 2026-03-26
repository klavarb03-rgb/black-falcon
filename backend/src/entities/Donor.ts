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

@Entity('donors')
export class Donor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contactInfo!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt!: Date | null;
  
  // Compatibility getter for soft delete
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Item, (item) => item.donor)
  items!: Item[];
}
