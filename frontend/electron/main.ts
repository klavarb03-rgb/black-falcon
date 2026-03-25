import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase } from '../src/database'

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

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Show window when ready to avoid visual flash
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // In dev, load Vite dev server; in prod, load built HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  registerAuthHandlers()
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
