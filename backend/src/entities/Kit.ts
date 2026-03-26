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

@Entity('kit_templates')
export class KitTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  items!: KitItemEntry[]; // bill-of-materials for this template

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

  @OneToMany(() => Kit, (kit) => kit.template)
  kits!: Kit[];
}

@Entity('kits')
export class Kit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true, name: 'template_id' })
  templateId!: string | null;

  @ManyToOne(() => KitTemplate, (template) => template.kits, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template!: KitTemplate | null;

  @Column({ type: 'uuid', name: 'user_id' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  owner!: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null; // override name when not using template

  @Column({ type: 'jsonb', default: '[]' })
  items!: KitItemEntry[]; // JSONB bill-of-materials: [{itemId, quantity, notes}]

  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt!: Date | null;
  
  // Compatibility getter for soft delete
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}

export interface KitItemEntry {
  itemId: string;
  quantity: number;
  notes?: string;
}
