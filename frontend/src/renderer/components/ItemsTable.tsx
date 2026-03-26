import React from 'react'
import { Package, FileText, AlertTriangle } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@components/ui/table'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import type { Item, ItemStatus } from '@renderer/services/itemService'

const STATUS_LABELS: Record<ItemStatus, string> = {
  government: 'Державне',
  volunteer: 'Волонтерське',
}

const STATUS_CLASSES: Record<ItemStatus, string> = {
  government:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  volunteer:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

interface ItemsTableProps {
  items: Item[]
  isLoading: boolean
  /** If provided, shows "Оформити документи" button for off-balance items */
  canRegisterDocuments?: boolean
  onRegisterDocuments?: (item: Item) => void
}

export function ItemsTable({
  items,
  isLoading,
  canRegisterDocuments = false,
  onRegisterDocuments,
}: ItemsTableProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p className="text-sm">Завантаження…</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Package className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm font-medium">Позицій не знайдено</p>
        <p className="mt-1 text-xs">Спробуйте змінити пошуковий запит або фільтр</p>
      </div>
    )
  }

  const showActionsColumn = canRegisterDocuments

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Назва</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Баланс</TableHead>
          <TableHead className="text-right">Кількість</TableHead>
          <TableHead>Одиниця</TableHead>
          {showActionsColumn && <TableHead className="text-right">Дії</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const isOffBalance = !item.balance_status || item.balance_status === 'off_balance'
          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[item.status]}`}
                >
                  {STATUS_LABELS[item.status]}
                </span>
              </TableCell>
              <TableCell>
                {isOffBalance ? (
                  <Badge variant="warning">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Позабаланс
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <FileText className="w-3 h-3 mr-1" />
                    З документами
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
              <TableCell className="text-muted-foreground">{item.unit ?? '—'}</TableCell>
              {showActionsColumn && (
                <TableCell className="text-right">
                  {isOffBalance && onRegisterDocuments && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
                      onClick={() => onRegisterDocuments(item)}
                    >
                      Оформити документи
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
