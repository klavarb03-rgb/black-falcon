"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const utils = require("@electron-toolkit/utils");
const typeorm = require("typeorm");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const UserEntity = new typeorm.EntitySchema({
  name: "User",
  tableName: "users",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    username: { type: "varchar", unique: true, nullable: false },
    passwordHash: { type: "varchar", name: "password_hash", nullable: false },
    role: { type: "varchar", nullable: false },
    fullName: { type: "varchar", name: "full_name", nullable: false },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    updatedAt: { type: "datetime", name: "updated_at", updateDate: true },
    deletedAt: { type: "datetime", name: "deleted_at", nullable: true, deleteDate: true }
  },
  indices: [{ columns: ["role"] }]
});
const DonorEntity = new typeorm.EntitySchema({
  name: "Donor",
  tableName: "donors",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    name: { type: "varchar", nullable: false },
    contact: { type: "varchar", nullable: true },
    notes: { type: "text", nullable: true },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    updatedAt: { type: "datetime", name: "updated_at", updateDate: true }
  }
});
const ItemGroupEntity = new typeorm.EntitySchema({
  name: "ItemGroup",
  tableName: "item_groups",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    name: { type: "varchar", nullable: false },
    parentId: { type: "varchar", name: "parent_id", nullable: true },
    level: { type: "integer", nullable: false },
    userId: { type: "varchar", name: "user_id", nullable: false },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    updatedAt: { type: "datetime", name: "updated_at", updateDate: true }
  },
  relations: {
    parent: {
      target: "ItemGroup",
      type: "many-to-one",
      nullable: true,
      joinColumn: { name: "parent_id" }
    },
    children: {
      target: "ItemGroup",
      type: "one-to-many",
      inverseSide: "parent"
    },
    user: {
      target: "User",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "user_id" }
    }
  },
  indices: [
    { columns: ["userId"] },
    { columns: ["parentId"] }
  ]
});
const ItemEntity = new typeorm.EntitySchema({
  name: "Item",
  tableName: "items",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    name: { type: "varchar", nullable: false },
    description: { type: "text", nullable: true },
    quantity: { type: "integer", nullable: false, default: 0 },
    unit: { type: "varchar", nullable: false, default: "шт" },
    status: { type: "varchar", nullable: false },
    groupId: { type: "varchar", name: "group_id", nullable: true },
    ownerId: { type: "varchar", name: "owner_id", nullable: false },
    donorId: { type: "varchar", name: "donor_id", nullable: true },
    metadata: { type: "text", nullable: true },
    version: { type: "integer", nullable: false, default: 1 },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    updatedAt: { type: "datetime", name: "updated_at", updateDate: true },
    deletedAt: { type: "datetime", name: "deleted_at", nullable: true, deleteDate: true }
  },
  relations: {
    group: {
      target: "ItemGroup",
      type: "many-to-one",
      nullable: true,
      joinColumn: { name: "group_id" }
    },
    owner: {
      target: "User",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "owner_id" }
    },
    donor: {
      target: "Donor",
      type: "many-to-one",
      nullable: true,
      joinColumn: { name: "donor_id" }
    }
  },
  indices: [
    { columns: ["ownerId"] },
    { columns: ["groupId"] },
    { columns: ["status"] },
    { columns: ["version"] }
  ]
});
const OperationEntity = new typeorm.EntitySchema({
  name: "Operation",
  tableName: "operations",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    type: { type: "varchar", nullable: false },
    itemId: { type: "varchar", name: "item_id", nullable: false },
    fromUserId: { type: "varchar", name: "from_user_id", nullable: true },
    toUserId: { type: "varchar", name: "to_user_id", nullable: true },
    quantity: { type: "integer", nullable: false },
    notes: { type: "text", nullable: true },
    performedById: { type: "varchar", name: "performed_by", nullable: false },
    performedAt: { type: "datetime", name: "performed_at", nullable: false },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    updatedAt: { type: "datetime", name: "updated_at", updateDate: true }
  },
  relations: {
    item: {
      target: "Item",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "item_id" }
    },
    fromUser: {
      target: "User",
      type: "many-to-one",
      nullable: true,
      joinColumn: { name: "from_user_id" }
    },
    toUser: {
      target: "User",
      type: "many-to-one",
      nullable: true,
      joinColumn: { name: "to_user_id" }
    },
    performedBy: {
      target: "User",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "performed_by" }
    }
  },
  indices: [
    { columns: ["itemId"] },
    { columns: ["performedById"] },
    { columns: ["performedAt"] },
    { columns: ["type"] }
  ]
});
const KitTemplateEntity = new typeorm.EntitySchema({
  name: "KitTemplate",
  tableName: "kit_templates",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    name: { type: "varchar", nullable: false },
    description: { type: "text", nullable: true },
    createdById: { type: "varchar", name: "created_by", nullable: false },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    updatedAt: { type: "datetime", name: "updated_at", updateDate: true }
  },
  relations: {
    createdBy: {
      target: "User",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "created_by" }
    },
    kits: {
      target: "Kit",
      type: "one-to-many",
      inverseSide: "template"
    }
  }
});
const KitEntity = new typeorm.EntitySchema({
  name: "Kit",
  tableName: "kits",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    templateId: { type: "varchar", name: "template_id", nullable: false },
    itemId: { type: "varchar", name: "item_id", nullable: false },
    quantity: { type: "integer", nullable: false },
    notes: { type: "text", nullable: true }
  },
  relations: {
    template: {
      target: "KitTemplate",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "template_id" },
      onDelete: "CASCADE"
    },
    item: {
      target: "Item",
      type: "many-to-one",
      nullable: false,
      joinColumn: { name: "item_id" }
    }
  },
  indices: [
    { columns: ["templateId"] },
    { columns: ["itemId"] }
  ]
});
const SyncQueueEntity = new typeorm.EntitySchema({
  name: "SyncQueue",
  tableName: "sync_queue",
  columns: {
    id: { type: "varchar", primary: true, generated: "uuid" },
    entityType: { type: "varchar", name: "entity_type", nullable: false },
    entityId: { type: "varchar", name: "entity_id", nullable: false },
    operation: { type: "varchar", nullable: false },
    payload: { type: "text", nullable: false },
    synced: { type: "boolean", nullable: false, default: false },
    createdAt: { type: "datetime", name: "created_at", createDate: true },
    syncedAt: { type: "datetime", name: "synced_at", nullable: true }
  },
  indices: [
    { columns: ["synced"] },
    { columns: ["entityType", "entityId"] }
  ]
});
class InitialSchema1742860800000 {
  async up(queryRunner) {
    await queryRunner.query(`PRAGMA foreign_keys = ON`);
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
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS donors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
    `);
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
    `);
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
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kit_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kits (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES kit_templates(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL,
        notes TEXT
      )
    `);
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
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_item_groups_user ON item_groups(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_item_groups_parent ON item_groups(parent_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_group ON items(group_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_items_version ON items(version)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_item ON operations(item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_performed_by ON operations(performed_by)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_performed_at ON operations(performed_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kits_template ON kits(template_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_kits_item ON kits(item_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)`);
  }
  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS sync_queue`);
    await queryRunner.query(`DROP TABLE IF EXISTS kits`);
    await queryRunner.query(`DROP TABLE IF EXISTS kit_templates`);
    await queryRunner.query(`DROP TABLE IF EXISTS operations`);
    await queryRunner.query(`DROP TABLE IF EXISTS items`);
    await queryRunner.query(`DROP TABLE IF EXISTS item_groups`);
    await queryRunner.query(`DROP TABLE IF EXISTS donors`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
let dataSource = null;
async function initDatabase() {
  const dbPath = path.join(electron.app.getPath("userData"), "black-falcon.db");
  dataSource = new typeorm.DataSource({
    type: "better-sqlite3",
    database: dbPath,
    entities: [
      UserEntity,
      DonorEntity,
      ItemGroupEntity,
      ItemEntity,
      OperationEntity,
      KitTemplateEntity,
      KitEntity,
      SyncQueueEntity
    ],
    migrations: [InitialSchema1742860800000],
    migrationsRun: true,
    synchronize: false,
    logging: process.env["NODE_ENV"] === "development"
  });
  await dataSource.initialize();
  return dataSource;
}
async function closeDatabase() {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
  }
}
const getTokenFilePath = () => path.join(electron.app.getPath("userData"), ".auth_token");
function registerAuthHandlers() {
  electron.ipcMain.handle("auth:setToken", (_event, token) => {
    if (!electron.safeStorage.isEncryptionAvailable()) {
      throw new Error("Шифрування недоступне на цьому пристрої");
    }
    const encrypted = electron.safeStorage.encryptString(token);
    fs__namespace.writeFileSync(getTokenFilePath(), encrypted);
  });
  electron.ipcMain.handle("auth:getToken", () => {
    const filePath = getTokenFilePath();
    if (!fs__namespace.existsSync(filePath)) return null;
    if (!electron.safeStorage.isEncryptionAvailable()) return null;
    try {
      const encrypted = fs__namespace.readFileSync(filePath);
      return electron.safeStorage.decryptString(Buffer.from(encrypted));
    } catch {
      return null;
    }
  });
  electron.ipcMain.handle("auth:clearToken", () => {
    const filePath = getTokenFilePath();
    if (fs__namespace.existsSync(filePath)) {
      fs__namespace.unlinkSync(filePath);
    }
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(async () => {
  await initDatabase();
  registerAuthHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", async () => {
  await closeDatabase();
});
