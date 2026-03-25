import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface AuthAPI {
  setToken: (token: string) => Promise<void>
  getToken: () => Promise<string | null>
  clearToken: () => Promise<void>
}

export interface CreateItemInput {
  name: string
  status: 'government' | 'volunteer'
  quantity: number
  unit: string
  description?: string
  metadata?: string
  ownerId: string
  token: string
}

export interface ItemsAPI {
  createItem: (input: CreateItemInput) => Promise<{ item: unknown; synced: boolean }>
}

// Expose a safe, typed API to the renderer via context isolation
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', {
      // Add IPC methods here as the app grows
      send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
      invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
      on: (channel: string, listener: (...args: unknown[]) => void) => {
        ipcRenderer.on(channel, (_event, ...args) => listener(...args))
      }
    })
    contextBridge.exposeInMainWorld('authAPI', {
      setToken: (token: string) => ipcRenderer.invoke('auth:setToken', token),
      getToken: () => ipcRenderer.invoke('auth:getToken'),
      clearToken: () => ipcRenderer.invoke('auth:clearToken')
    } satisfies AuthAPI)
    contextBridge.exposeInMainWorld('itemsAPI', {
      createItem: (input: CreateItemInput) => ipcRenderer.invoke('items:create', input)
    } satisfies ItemsAPI)
  } catch (error) {
    console.error(error)
  }
}
