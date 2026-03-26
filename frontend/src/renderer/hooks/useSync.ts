import { useEffect, useCallback } from 'react'
import { useSyncStore } from '@renderer/store/syncStore'
import { syncService } from '@renderer/services/syncService'
import { useAuthStore } from '@renderer/store/authStore'

export type { SyncStatus, SyncConflict } from '@renderer/store/syncStore'

/** Human-readable relative time, e.g. "щойно", "2 хв тому", "1 год тому". */
function formatLastSync(date: Date | null): string {
  if (!date) return 'Ніколи'
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1_000)
  if (diffSec < 10) return 'Щойно'
  if (diffSec < 60) return `${diffSec} с тому`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} хв тому`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} год тому`
  return date.toLocaleDateString('uk-UA')
}

export interface UseSyncReturn {
  isOnline: boolean
  isSyncing: boolean
  isError: boolean
  isOffline: boolean
  lastSyncAt: Date | null
  lastSyncLabel: string
  pendingCount: number
  syncError: string | null
  conflicts: import('@renderer/store/syncStore').SyncConflict[]
  hasPendingItem: (id: string) => boolean
  forceSync: () => void
  resolveConflict: (conflictId: string) => void
  clearError: () => void
}

export function useSync(): UseSyncReturn {
  const { token } = useAuthStore()
  const store = useSyncStore()

  // Initialise the service once the user is authenticated
  useEffect(() => {
    if (!token) return
    syncService.init(() => useAuthStore.getState().token)
    return () => {
      // Do not destroy on every re-render — the service lives for the whole session.
      // Destruction happens on logout (handled in authStore).
    }
  }, [token])

  const forceSync = useCallback(() => {
    syncService.forceSync()
  }, [])

  const hasPendingItem = useCallback(
    (id: string) => store.pendingItemIds.includes(id),
    [store.pendingItemIds],
  )

  return {
    isOnline: store.isOnline,
    isSyncing: store.status === 'syncing',
    isError: store.status === 'error',
    isOffline: store.status === 'offline' || !store.isOnline,
    lastSyncAt: store.lastSyncAt,
    lastSyncLabel: formatLastSync(store.lastSyncAt),
    pendingCount: store.pendingItemIds.length,
    syncError: store.syncError,
    conflicts: store.conflicts,
    hasPendingItem,
    forceSync,
    resolveConflict: store.resolveConflict,
    clearError: store.clearError,
  }
}
