import React, { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, ArrowRightLeft } from 'lucide-react'

import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { cn } from '@lib/utils'
import { useAuthStore } from '@renderer/store/authStore'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Item {
  id: string
  name: string
  quantity: number
  unit: string | null
}

interface User {
  id: string
  fullName: string
  email: string
  role: string
}

type NotificationType = 'success' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

// ── API helpers ────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

async function fetchMyItems(token: string): Promise<Item[]> {
  const res = await fetch(`${BASE_URL}/items?page=1&limit=500`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data: Item[] }
  return json.data ?? []
}

async function fetchManagers(token: string): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users?role=manager,admin`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data: User[] }
  return json.data ?? []
}

async function transferItem(
  token: string,
  itemId: string,
  toUserId: string,
  quantity: number,
  notes?: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/items/${itemId}/transfer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ toUserId, quantity, notes })
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Невідома помилка' }))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

interface TransferScreenProps {
  onBack: () => void
}

export function TransferScreen({ onBack }: TransferScreenProps): React.JSX.Element {
  const { token, user } = useAuthStore()

  const [items, setItems] = useState<Item[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)

  // Load items + managers
  useEffect(() => {
    if (!token) return
    Promise.all([fetchMyItems(token), fetchManagers(token)])
      .then(([itemsRes, managersRes]) => {
        setItems(itemsRes)
        setManagers(managersRes.filter((m) => m.id !== user?.id)) // exclude self
      })
      .catch((err) => {
        setNotification({
          type: 'error',
          message: err instanceof Error ? err.message : 'Помилка завантаження даних'
        })
      })
      .finally(() => setLoading(false))
  }, [token, user])

  const selectedItem = items.find((i) => i.id === selectedItemId)
  const maxQuantity = selectedItem?.quantity ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedItemId || !selectedUserId || quantity < 1) return

    setSubmitting(true)
    setNotification(null)

    try {
      await transferItem(token, selectedItemId, selectedUserId, quantity, notes || undefined)
      setNotification({
        type: 'success',
        message: `Передано ${quantity} ${selectedItem?.unit ?? 'шт'} "${selectedItem?.name}" успішно!`
      })
      // Reset form
      setSelectedItemId('')
      setSelectedUserId('')
      setQuantity(1)
      setNotes('')
      // Reload items to reflect updated quantities
      fetchMyItems(token).then(setItems).catch(() => {})
    } catch (err) {
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Не вдалося передати МЦ'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = selectedItemId && selectedUserId && quantity >= 1 && quantity <= maxQuantity

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Назад">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Передати МЦ</h1>
          <p className="text-sm text-muted-foreground">
            Передача матеріальних цінностей іншому менеджеру
          </p>
        </div>
      </div>

      {/* Notification */}
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
          {notification.type === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notification.type === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Форма передачі
          </CardTitle>
          <CardDescription>
            Поля, позначені <span className="text-destructive">*</span>, є обовʼязковими
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Item selector */}
            <div className="space-y-2">
              <Label htmlFor="item">
                Матеріальна цінність <span className="text-destructive">*</span>
              </Label>
              <select
                id="item"
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value)
                  setQuantity(1) // reset quantity on item change
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Оберіть позицію зі свого складу...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {item.quantity} {item.unit ?? 'шт'}
                  </option>
                ))}
              </select>
              {selectedItem && (
                <p className="text-xs text-muted-foreground">
                  Доступно: {selectedItem.quantity} {selectedItem.unit ?? 'шт'}
                </p>
              )}
            </div>

            {/* Manager selector */}
            <div className="space-y-2">
              <Label htmlFor="manager">
                Менеджер-отримувач <span className="text-destructive">*</span>
              </Label>
              <select
                id="manager"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Оберіть менеджера...</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Кількість <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
              {selectedItem && quantity > maxQuantity && (
                <p className="text-xs text-destructive">
                  Перевищує доступну кількість ({maxQuantity})
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Примітки (опціонально)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Додаткова інформація про передачу..."
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={!isValid || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Передати
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Скасувати
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
