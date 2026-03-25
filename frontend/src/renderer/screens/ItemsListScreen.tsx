import React from 'react'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Input } from '@components/ui/input'
import { Button } from '@components/ui/button'
import { Card, CardContent, CardHeader } from '@components/ui/card'
import { ItemsTable } from '@renderer/components/ItemsTable'
import { useItems } from '@renderer/hooks/useItems'
import type { ItemStatus } from '@renderer/services/itemService'
import { cn } from '@lib/utils'

const STATUS_OPTIONS: { value: ItemStatus | ''; label: string }[] = [
  { value: '', label: 'Всі' },
  { value: 'government', label: 'Державне' },
  { value: 'volunteer', label: 'Волонтерське' },
]

interface ItemsListScreenProps {
  onNavigate?: (page: string) => void
}

export function ItemsListScreen({ onNavigate }: ItemsListScreenProps = {}): React.JSX.Element {
  const {
    filteredItems,
    paginatedItems,
    isLoading,
    error,
    search,
    statusFilter,
    page,
    totalPages,
    setSearch,
    setStatusFilter,
    setPage,
    refresh,
  } = useItems()

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
          <ItemsTable items={paginatedItems} isLoading={isLoading} />
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
    </div>
  )
}
