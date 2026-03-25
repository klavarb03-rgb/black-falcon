import React, { useState } from 'react'
import { ArrowLeft, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react'

import { Button } from '@components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card'
import { cn } from '@lib/utils'
import { ItemForm, type ItemFormOutput } from '@renderer/components/ItemForm'
import { itemsApi } from '@renderer/utils/itemsApi'
import { useAuthStore } from '@renderer/store/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType = 'success-synced' | 'success-offline' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AddItemScreenProps {
  onBack: () => void
}

export function AddItemScreen({ onBack }: AddItemScreenProps): React.JSX.Element {
  const { user, token } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [formKey, setFormKey] = useState(0) // reset form after success

  const handleSubmit = async (values: ItemFormOutput): Promise<void> => {
    if (!user || !token) {
      setNotification({
        type: 'error',
        message: 'Сесія закінчилась. Будь ласка, увійдіть знову.'
      })
      return
    }

    setIsSubmitting(true)
    setNotification(null)

    // Build metadata JSON for optional fields
    const metadataFields: Record<string, unknown> = {}
    if (values.serialNumber) metadataFields.serialNumber = values.serialNumber
    if (values.price !== undefined) metadataFields.price = values.price
    const metadata = Object.keys(metadataFields).length > 0
      ? JSON.stringify(metadataFields)
      : undefined

    try {
      const result = await itemsApi.createItem({
        name: values.name,
        status: values.status,
        quantity: values.quantity,
        unit: values.unit,
        description: values.notes || undefined,
        metadata,
        ownerId: user.id,
        token
      })

      setNotification({
        type: result.synced ? 'success-synced' : 'success-offline',
        message: result.synced
          ? `Позицію "${result.item.name}" збережено та синхронізовано з сервером.`
          : `Позицію "${result.item.name}" збережено локально. Синхронізація відбудеться автоматично.`
      })

      // Reset the form for the next entry
      setFormKey((k) => k + 1)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Не вдалося зберегти позицію. Спробуйте ще раз.'
      setNotification({ type: 'error', message })
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
          <h1 className="text-2xl font-semibold tracking-tight">Додати позицію</h1>
          <p className="text-sm text-muted-foreground">Заповніть форму для додавання нової одиниці інвентарю</p>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
            notification.type === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
            notification.type === 'success-synced' && 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400',
            notification.type === 'success-offline' && 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
          )}
        >
          {notification.type === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {notification.type === 'success-synced' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {notification.type === 'success-offline' && <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Form card */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Нова позиція інвентарю</CardTitle>
          <CardDescription>
            Поля, позначені <span className="text-destructive">*</span>, є обовʼязковими
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemForm
            key={formKey}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
