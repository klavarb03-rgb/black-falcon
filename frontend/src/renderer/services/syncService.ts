import { useSyncStore } from '@renderer/store/syncStore'
import type { SyncConflict } from '@renderer/store/syncStore'

const SYNC_INTERVAL_MS = 60_000 // 1 minute
const PING_TIMEOUT_MS = 5_000
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

type TokenGetter = () => string | null

class SyncService {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private tokenGetter: TokenGetter | null = null
  private initialized = false

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  init(getToken: TokenGetter): void {
    if (this.initialized) return
    this.tokenGetter = getToken
    this.initialized = true

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Reflect initial state
    const store = useSyncStore.getState()
    store._setOnline(navigator.onLine)

    this.startInterval()

    // Initial sync if online
    if (navigator.onLine) {
      // Small delay so the app fully loads first
      setTimeout(() => this.sync(), 2_000)
    }
  }

  destroy(): void {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    this.stopInterval()
    this.initialized = false
    this.tokenGetter = null
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Manually trigger a sync cycle. */
  async forceSync(): Promise<void> {
    await this.sync()
  }

  /**
   * Mark an item as pending sync (e.g. created/edited while offline).
   * Call this from other services when they perform write operations.
   */
  addPendingItem(id: string): void {
    useSyncStore.getState()._addPendingItem(id)
  }

  removePendingItem(id: string): void {
    useSyncStore.getState()._removePendingItem(id)
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private handleOnline = (): void => {
    const store = useSyncStore.getState()
    store._setOnline(true)
    // Sync immediately after coming back online
    this.sync()
  }

  private handleOffline = (): void => {
    useSyncStore.getState()._setOnline(false)
  }

  private startInterval(): void {
    this.stopInterval()
    this.intervalId = setInterval(() => {
      if (navigator.onLine) this.sync()
    }, SYNC_INTERVAL_MS)
  }

  private stopInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async sync(): Promise<void> {
    const token = this.tokenGetter?.()
    if (!token) return

    const store = useSyncStore.getState()
    if (store.status === 'syncing') return

    store._setSyncing()

    try {
      const reachable = await this.ping()
      if (!reachable) {
        store._setOnline(false)
        return
      }

      // Verify server health + optionally detect conflicts
      const conflicts = await this.detectConflicts(token)
      if (conflicts.length > 0) {
        store._setConflicts(conflicts)
      }

      store._setSyncSuccess()
      store._setOnline(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Помилка синхронізації'
      store._setSyncError(message)
    }
  }

  /**
   * Lightweight connectivity check.
   * Tries /health, falls back to /auth/me (HEAD) if not available.
   */
  private async ping(): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)

    try {
      // First try a HEAD on /health (cheap)
      const res = await fetch(`${BASE_URL}/health`, {
        method: 'HEAD',
        signal: controller.signal,
      })
      clearTimeout(timer)
      // Any non-5xx response means the server is up
      return res.status < 500
    } catch (headErr) {
      clearTimeout(timer)
      // AbortError = timed out = treat as offline
      if ((headErr as Error).name === 'AbortError') return false

      // /health may not exist — try a GET on items with limit=1
      const fallbackController = new AbortController()
      const fallbackTimer = setTimeout(() => fallbackController.abort(), PING_TIMEOUT_MS)
      try {
        const token = this.tokenGetter?.()
        if (!token) return false
        const r = await fetch(`${BASE_URL}/items/?page=1&limit=1`, {
          method: 'HEAD',
          headers: { Authorization: `Bearer ${token}` },
          signal: fallbackController.signal,
        })
        clearTimeout(fallbackTimer)
        return r.status < 500
      } catch {
        clearTimeout(fallbackTimer)
        return false
      }
    }
  }

  /**
   * Check for conflicts between pending local items and the server.
   * Returns an array of detected conflicts.
   *
   * In the current architecture there is no offline write queue, so this
   * always returns []. It is a hook for future offline-first support.
   */
  private async detectConflicts(_token: string): Promise<SyncConflict[]> {
    // TODO: When an offline write queue is implemented, compare queued
    // operations against the server response here and surface conflicts.
    return []
  }
}

export const syncService = new SyncService()
