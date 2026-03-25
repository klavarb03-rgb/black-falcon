import React, { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { cn } from '@lib/utils'
import { useAuthStore } from '@renderer/store/authStore'
import { itemService, type Item } from '@renderer/services/itemService'
import { writeoffService, type WriteoffType } from '@renderer/services/writeoffService'

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType = 'success' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

// ── Component ─────────────────────────────────────────────────────────────────

interface WriteOffScreenProps {
  onBack: () => void
}

export function WriteOffScreen({ onBack }: WriteOffScreenProps): React.JSX.Element {
  const { user, token } = useAuthStore()

  // Items for selector
  const [items, setItems] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)

  // Form state
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [type, setType] = useState<WriteoffType>('used')
  const [reason, setReason] = useState('')
  const [donorId, setDonorId] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)

  useEffect(() => {
    if (!token) return
    setItemsLoading(true)
    itemService
      .getItems(token)
      .then((res) => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setItemsLoading(false))
  }, [token])

  const selectedItem = items.find((i) => i.id === itemId)

  const resetForm = () => {
    setItemId('')
    setQuantity('')
    setType('used')
    setReason('')
    setDonorId('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNotification(null)

    if (!user || !token) {
      setNotification({ type: 'error', message: 'Сесія закінчилась. Будь ласка, увійдіть знову.' })
      return
    }

    if (!itemId) {
      setNotification({ type: 'error', message: 'Оберіть позицію інвентарю.' })
      return
    }

    const qty = parseInt(quantity, 10)
    if (!quantity || !Number.isInteger(qty) || qty < 1) {
      setNotification({ type: 'error', message: 'Кількість має бути цілим позитивним числом.' })
      return
    }

    if (selectedItem && qty > selectedItem.quantity) {
      setNotification({
        type: 'error',
        message: `Недостатньо залишку. Доступно: ${selectedItem.quantity} ${selectedItem.unit ?? 'шт'}.`
      })
      return
    }

    if (type === 'lost' && !reason.trim()) {
      setNotification({ type: 'error', message: 'Для типу "Втрачено" причина є обовʼязковою.' })
      return
    }

    setIsSubmitting(true)

    try {
      await writeoffService.createWriteoff(token, {
        itemId,
        quantity: qty,
        type,
        reason: reason.trim() || undefined,
        donorId: donorId.trim() || undefined
      })

      setNotification({
        type: 'success',
        message: `Списання "${selectedItem?.name ?? ''}" (${qty} ${selectedItem?.unit ?? 'шт'}) успішно виконано.`
      })
      resetForm()
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Не вдалося виконати списання. Спробуйте ще раз.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Назад">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Списання МЦ</h1>
          <p className="text-sm text-muted-foreground">Списати матеріальні цінності з інвентарю</p>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
            notification.type === 'error' &&
              'border-destructive/30 bg-destructive/10 text-destructive',
            notification.type === 'success' &&
              'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
          )}
        >
          {notification.type === 'error' && (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {notification.type === 'success' && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Form card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Форма списання</CardTitle>
          <CardDescription>
            Поля, позначені <span className="text-destructive">*</span>, є обовʼязковими
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Item selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="itemId">
                Позиція інвентарю <span className="text-destructive">*</span>
              </label>
              {itemsLoading ? (
                <p className="text-sm text-muted-foreground">Завантаження позицій…</p>
              ) : (
                <select
                  id="itemId"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  <option value="">— Оберіть позицію —</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.quantity !== undefined
                        ? ` (залишок: ${item.quantity} ${item.unit ?? 'шт'})`
                        : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="quantity">
                Кількість <span className="text-destructive">*</span>
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={selectedItem?.quantity ?? undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Доступно: {selectedItem.quantity} {selectedItem.unit ?? 'шт'}
                </p>
              )}
            </div>

            {/* Type radio */}
            <div className="space-y-2">
              <span className="text-sm font-medium">
                Тип списання <span className="text-destructive">*</span>
              </span>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="type"
                    value="used"
                    checked={type === 'used'}
                    onChange={() => setType('used')}
                    disabled={isSubmitting}
                    className="accent-primary"
                  />
                  Використано
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="type"
                    value="lost"
                    checked={type === 'lost'}
                    onChange={() => setType('lost')}
                    disabled={isSubmitting}
                    className="accent-primary"
                  />
                  Втрачено
                </label>
              </div>
            </div>

            {/* Reason — required when type=lost */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="reason">
                Причина{' '}
                {type === 'lost' && <span className="text-destructive">*</span>}
                {type === 'used' && (
                  <span className="text-muted-foreground font-normal">(необовʼязково)</span>
                )}
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  type === 'lost'
                    ? 'Опишіть причину втрати…'
                    : 'Додаткові коментарі (необовʼязково)…'
                }
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Donor dropdown — optional, populated from items' donorId field as placeholder */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="donorId">
                Донор <span className="text-muted-foreground font-normal">(необовʼязково)</span>
              </label>
              <select
                id="donorId"
                value={donorId}
                onChange={(e) => setDonorId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              >
                <option value="">— Не вказано —</option>
                {Array.from(
                  new Map(
                    items
                      .filter((i) => i.donorId)
                      .map((i) => [i.donorId, i.donorId])
                  ).values()
                ).map((id) => (
                  <option key={id} value={id!}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Збереження…' : 'Списати'}
              </Button>
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                Скасувати
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
