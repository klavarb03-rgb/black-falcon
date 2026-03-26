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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
new typeorm.EntitySchema({
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
function getDatabase() {
  {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
}
async function closeDatabase() {
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
function registerItemHandlers() {
  electron.ipcMain.handle("items:create", async (_event, payload) => {
    const db = getDatabase();
    const itemRepo = db.getRepository("Item");
    const syncRepo = db.getRepository("SyncQueue");
    const itemData = {
      name: payload.name,
      status: payload.status,
      quantity: payload.quantity,
      unit: payload.unit,
      description: payload.description ?? null,
      metadata: payload.metadata ?? null,
      ownerId: payload.ownerId
    };
    const saved = await itemRepo.save(itemRepo.create(itemData));
    await syncRepo.save(
      syncRepo.create({
        entityType: "item",
        entityId: saved.id,
        operation: "create",
        payload: JSON.stringify(saved),
        synced: false
      })
    );
    let synced = false;
    try {
      const apiUrl = process.env["API_URL"] ?? "http://localhost:3000/api";
      const res = await fetch(`${apiUrl}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${payload.token}`
        },
        body: JSON.stringify({
          id: saved.id,
          name: saved.name,
          status: saved.status,
          quantity: saved.quantity,
          unit: saved.unit,
          description: saved.description,
          metadata: saved.metadata,
          ownerId: saved.ownerId
        }),
        signal: AbortSignal.timeout(5e3)
      });
      if (res.ok) {
        const syncEntry = await syncRepo.findOneBy({ entityId: saved.id });
        if (syncEntry) {
          await syncRepo.save({ ...syncEntry, synced: true, syncedAt: /* @__PURE__ */ new Date() });
        }
        synced = true;
      }
    } catch {
    }
    return { item: saved, synced };
  });
}
function createWindow() {
  console.log("[main] createWindow() called");
  const mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    console.log("[main] ready-to-show fired, showing window");
    mainWindow.show();
  });
  const showFallback = setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn("[main] fallback show triggered — ready-to-show never fired");
      mainWindow.show();
    }
  }, 5e3);
  mainWindow.once("show", () => clearTimeout(showFallback));
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[main] renderer failed to load: ${code} ${desc} (${url})`);
  });
  mainWindow.webContents.on("render-process-gone", (_e, details) => {
    console.error("[main] renderer process gone:", details);
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("[main] loading dev URL:", process.env["ELECTRON_RENDERER_URL"]);
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    const htmlPath = path.join(__dirname, "../renderer/index.html");
    console.log("[main] loading file:", htmlPath);
    mainWindow.loadFile(htmlPath);
  }
}
electron.app.whenReady().then(async () => {
  console.log("[main] app ready");
  try {
    console.log("[main] database initialized");
  } catch (err) {
    console.error("[main] database initialization failed (continuing without DB):", err);
  }
  registerAuthHandlers();
  registerItemHandlers();
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
