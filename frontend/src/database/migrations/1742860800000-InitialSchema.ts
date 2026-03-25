import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialSchema1742860800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable foreign key enforcement for SQLite
    await queryRunner.query(`PRAGMA foreign_keys = ON`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('superadmin', 'admin', 'manager')),
        full_name TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS item_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES item_groups(id) ON DELETE SET NULL,
        level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 4),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'шт',
        status TEXT NOT NULL CHECK(status IN ('government', 'volunteer')),
        group_id TEXT REFERENCES item_groups(id) ON DELETE SET NULL,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        donor_id TEXT REFERENCES donors(id) ON DELETE SET NULL,
        metadata TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('transfer', 'writeoff', 'receive')),
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
        from_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        notes TEXT,
        performed_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        performed_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kit_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kits (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES kit_templates(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL,
        notes TEXT
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        payload TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME
      )
    `)

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_item_groups_user ON item_groups(user_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_item_groups_parent ON item_groups(parent_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_group ON items(group_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_version ON items(version)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_item ON operations(item_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_performed_by ON operations(performed_by)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_performed_at ON operations(performed_at)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kits_template ON kits(template_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kits_item ON kits(item_id)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sync_queue`)
    await queryRunner.query(`DROP TABLE IF EXISTS kits`)
    await queryRunner.query(`DROP TABLE IF EXISTS kit_templates`)
    await queryRunner.query(`DROP TABLE IF EXISTS operations`)
    await queryRunner.query(`DROP TABLE IF EXISTS items`)
    await queryRunner.query(`DROP TABLE IF EXISTS item_groups`)
    await queryRunner.query(`DROP TABLE IF EXISTS donors`)
    await queryRunner.query(`DROP TABLE IF EXISTS users`)
  }
}
