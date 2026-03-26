import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncConflict {
  id: string
  itemId: string
  itemName: string
  field: string
  localValue: unknown
  serverValue: unknown
}

interface SyncState {
  status: SyncStatus
  isOnline: boolean
  lastSyncAt: Date | null
  pendingItemIds: string[]
  syncError: string | null
  conflicts: SyncConflict[]
}

interface SyncActions {
  // Internal — called by syncService only
  _setOnline: (online: boolean) => void
  _setSyncing: () => void
  _setSyncSuccess: () => void
  _setSyncError: (error: string) => void
  _addPendingItem: (id: string) => void
  _removePendingItem: (id: string) => void
  _setConflicts: (conflicts: SyncConflict[]) => void
  // Public — called from components
  resolveConflict: (conflictId: string) => void
  clearError: () => void
}

export const useSyncStore = create<SyncState & SyncActions>((set) => ({
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncAt: null,
  pendingItemIds: [],
  syncError: null,
  conflicts: [],

  _setOnline: (online) =>
    set((s) => ({
      isOnline: online,
      status: online
        ? s.status === 'offline' ? 'idle' : s.status
        : 'offline',
    })),

  _setSyncing: () => set({ status: 'syncing', syncError: null }),

  _setSyncSuccess: () =>
    set({ status: 'idle', lastSyncAt: new Date(), syncError: null }),

  _setSyncError: (error) => set({ status: 'error', syncError: error }),

  _addPendingItem: (id) =>
    set((s) => ({
      pendingItemIds: s.pendingItemIds.includes(id)
        ? s.pendingItemIds
        : [...s.pendingItemIds, id],
    })),

  _removePendingItem: (id) =>
    set((s) => ({ pendingItemIds: s.pendingItemIds.filter((x) => x !== id) })),

  _setConflicts: (conflicts) => set({ conflicts }),

  resolveConflict: (conflictId) =>
    set((s) => ({ conflicts: s.conflicts.filter((c) => c.id !== conflictId) })),

  clearError: () =>
    set((s) => ({ syncError: null, status: s.isOnline ? 'idle' : 'offline' })),
}))
