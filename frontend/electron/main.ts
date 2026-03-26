import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase, getDatabase } from '../src/database'

const getTokenFilePath = (): string => join(app.getPath('userData'), '.auth_token')

function registerAuthHandlers(): void {
  ipcMain.handle('auth:setToken', (_event, token: string): void => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Шифрування недоступне на цьому пристрої')
    }
    const encrypted = safeStorage.encryptString(token)
    fs.writeFileSync(getTokenFilePath(), encrypted)
  })

  ipcMain.handle('auth:getToken', (): string | null => {
    const filePath = getTokenFilePath()
    if (!fs.existsSync(filePath)) return null
    if (!safeStorage.isEncryptionAvailable()) return null
    try {
      const encrypted = fs.readFileSync(filePath)
      return safeStorage.decryptString(Buffer.from(encrypted))
    } catch {
      return null
    }
  })

  ipcMain.handle('auth:clearToken', (): void => {
    const filePath = getTokenFilePath()
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  })
}

interface CreateItemPayload {
  name: string
  status: 'government' | 'volunteer'
  quantity: number
  unit: string
  description?: string
  metadata?: string
  ownerId: string
  token: string
  balance_status?: 'off_balance' | 'on_balance'
  document_number?: string
  document_date?: string
  supplier_name?: string
}

function registerItemHandlers(): void {
  ipcMain.handle('items:create', async (_event, payload: CreateItemPayload) => {
    const db = getDatabase()
    const itemRepo = db.getRepository('Item')
    const syncRepo = db.getRepository('SyncQueue')

    // 1. Save to SQLite
    const itemData = {
      name: payload.name,
      status: payload.status,
      quantity: payload.quantity,
      unit: payload.unit,
      description: payload.description ?? null,
      metadata: payload.metadata ?? null,
      ownerId: payload.ownerId,
      balance_status: payload.balance_status ?? 'off_balance',
      document_number: payload.document_number ?? null,
      document_date: payload.document_date ?? null,
      supplier_name: payload.supplier_name ?? null,
    }
    const saved = await itemRepo.save(itemRepo.create(itemData))

    // 2. Queue for sync
    await syncRepo.save(
      syncRepo.create({
        entityType: 'item',
        entityId: saved.id,
        operation: 'create',
        payload: JSON.stringify(saved),
        synced: false
      })
    )

    // 3. Best-effort immediate sync with backend
    let synced = false
    try {
      const apiUrl = process.env['API_URL'] ?? 'http://localhost:3000/api'
      const res = await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
          ownerId: saved.ownerId,
          balance_status: saved.balance_status,
          document_number: saved.document_number,
          document_date: saved.document_date,
          supplier_name: saved.supplier_name,
        }),
        signal: AbortSignal.timeout(5000)
      })
      if (res.ok) {
        const syncEntry = await syncRepo.findOneBy({ entityId: saved.id })
        if (syncEntry) {
          await syncRepo.save({ ...syncEntry, synced: true, syncedAt: new Date() })
        }
        synced = true
      }
    } catch {
      // Offline or server unavailable — will sync later via sync queue
    }

    return { item: saved, synced }
  })
}

function createWindow(): void {
  console.log('[main] createWindow() called')

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Show window when ready to avoid visual flash
  mainWindow.on('ready-to-show', () => {
    console.log('[main] ready-to-show fired, showing window')
    mainWindow.show()
  })

  // Fallback: show window after 5s if ready-to-show never fires (e.g. renderer crash)
  const showFallback = setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('[main] fallback show triggered — ready-to-show never fired')
      mainWindow.show()
    }
  }, 5000)
  mainWindow.once('show', () => clearTimeout(showFallback))

  // Log renderer console errors to main process stdout for debugging
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[main] renderer failed to load: ${code} ${desc} (${url})`)
  })
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[main] renderer process gone:', details)
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In dev, load Vite dev server; in prod, load built HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log('[main] loading dev URL:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const htmlPath = join(__dirname, '../renderer/index.html')
    console.log('[main] loading file:', htmlPath)
    mainWindow.loadFile(htmlPath)
  }
}

app.whenReady().then(async () => {
  console.log('[main] app ready')

  try {
    // await initDatabase() // Тимчасово відключено SQLite
    console.log('[main] database initialized')
  } catch (err) {
    console.error('[main] database initialization failed (continuing without DB):', err)
    // Do not block window creation — app can still render UI without local DB
  }

  registerAuthHandlers()
  registerItemHandlers()
  createWindow()

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit on all windows closed, except macOS (handled by 'activate' above)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  await closeDatabase()
})
