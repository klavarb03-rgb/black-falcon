import React, { useState } from 'react'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Plus, WifiOff, Wifi, AlertCircle, Clock, LoaderCircle } from 'lucide-react'
import { Input } from '@components/ui/input'
import { Button } from '@components/ui/button'
import { Card, CardContent, CardHeader } from '@components/ui/card'
import { ItemsTable } from '@renderer/components/ItemsTable'
import { DocumentRegistrationModal } from '@renderer/components/DocumentRegistrationModal'
import { useItems, type BalanceFilter } from '@renderer/hooks/useItems'
import { useSync } from '@renderer/hooks/useSync'
import { useAuthStore } from '@renderer/store/authStore'
import type { Item, ItemStatus } from '@renderer/services/itemService'
import { cn } from '@lib/utils'

const STATUS_OPTIONS: { value: ItemStatus | ''; label: string }[] = [
  { value: '', label: 'Всі' },
  { value: 'government', label: 'Державне' },
  { value: 'volunteer', label: 'Волонтерське' },
]

const BALANCE_OPTIONS: { value: BalanceFilter; label: string }[] = [
  { value: 'all', label: 'Всі' },
  { value: 'on_balance', label: 'На балансі 📄' },
  { value: 'off_balance', label: 'Позабаланс ⚠️' },
]

interface ItemsListScreenProps {
  onNavigate?: (page: string) => void
}

export function ItemsListScreen({ onNavigate }: ItemsListScreenProps = {}): React.JSX.Element {
  const { user } = useAuthStore()
  const [registerItem, setRegisterItem] = useState<Item | null>(null)

  const {
    filteredItems,
    paginatedItems,
    isLoading,
    error,
    search,
    statusFilter,
    balanceFilter,
    page,
    totalPages,
    setSearch,
    setStatusFilter,
    setBalanceFilter,
    setPage,
    refresh,
  } = useItems()

  const {
    isOnline,
    isSyncing,
    isOffline,
    isError: isSyncError,
    lastSyncLabel,
    pendingCount,
    syncError,
    conflicts,
    forceSync,
    resolveConflict,
    clearError,
  } = useSync()

  // Only admin/superadmin can register documents
  const canRegisterDocuments =
    user?.role === 'admin' || user?.role === 'superadmin'

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Пошук за назвою…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter toggle group */}
        <div className="flex rounded-md border border-input bg-background overflow-hidden">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as ItemStatus | '')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Balance filter toggle group */}
        <div className="flex rounded-md border border-input bg-background overflow-hidden">
          {BALANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBalanceFilter(opt.value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                balanceFilter === opt.value
                  ? opt.value === 'off_balance'
                    ? 'bg-amber-500 text-white'
                    : 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={refresh}
          disabled={isLoading}
          title="Оновити список"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>

        {/* Add item button */}
        {onNavigate && (
          <Button onClick={() => onNavigate('add-item')}>
            <Plus className="h-4 w-4" />
            Додати позицію
          </Button>
        )}
      </div>

      {/* Sync status bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isOffline && (
          <span className="flex items-center gap-1 text-amber-500 font-medium">
            <WifiOff className="h-3.5 w-3.5" />
            Офлайн
          </span>
        )}
        {!isOffline && isOnline && !isSyncing && (
          <span className="flex items-center gap-1 text-emerald-500">
            <Wifi className="h-3.5 w-3.5" />
            Онлайн
          </span>
        )}
        {isSyncing && (
          <span className="flex items-center gap-1 text-primary animate-pulse">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Синхронізація…
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {lastSyncLabel}
        </span>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertCircle className="h-3.5 w-3.5" />
            {pendingCount} очікують синхронізації
          </span>
        )}
        {conflicts.length > 0 && (
          <span className="flex items-center gap-1 text-destructive font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            {conflicts.length} конфлікт(ів)
          </span>
        )}
      </div>

      {/* Sync error banner */}
      {isSyncError && syncError && (
        <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Помилка синхронізації: {syncError}
          </span>
          <button
            onClick={clearError}
            className="text-xs underline opacity-70 hover:opacity-100 ml-4 shrink-0"
          >
            Закрити
          </button>
        </div>
      )}

      {/* Conflicts panel */}
      {conflicts.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Конфлікти синхронізації
          </p>
          {conflicts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between text-sm rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{c.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  Поле «{c.field}»: локально {String(c.localValue)}, сервер {String(c.serverValue)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resolveConflict(c.id)}
                className="ml-3 shrink-0 h-7 text-xs"
              >
                Вирішити
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table card */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-6">
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Завантаження…' : `${filteredItems.length} позицій`}
          </p>
        </CardHeader>
        <CardContent className="pt-3">
          <ItemsTable
            items={paginatedItems}
            isLoading={isLoading}
            canRegisterDocuments={canRegisterDocuments}
            onRegisterDocuments={setRegisterItem}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Сторінка {page} з {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              title="Попередня сторінка"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              title="Наступна сторінка"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Document Registration Modal */}
      {registerItem && (
        <DocumentRegistrationModal
          item={registerItem}
          onClose={() => setRegisterItem(null)}
          onSuccess={() => {
            setRegisterItem(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
