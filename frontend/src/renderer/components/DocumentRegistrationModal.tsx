import React, { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { itemService, type Item } from '@renderer/services/itemService'
import { useAuthStore } from '@renderer/store/authStore'

interface DocumentRegistrationModalProps {
  item: Item
  onClose: () => void
  onSuccess: () => void
}

export function DocumentRegistrationModal({
  item,
  onClose,
  onSuccess,
}: DocumentRegistrationModalProps): React.JSX.Element {
  const { token } = useAuthStore()
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const firstInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate required fields
    const trimmedNumber = documentNumber.trim()
    const trimmedSupplier = supplierName.trim()

    if (!trimmedNumber) {
      setError("Номер накладної обов'язковий")
      return
    }
    if (!documentDate) {
      setError("Дата накладної обов'язкова")
      return
    }
    if (!trimmedSupplier) {
      setError("Постачальник обов'язковий")
      return
    }

    if (!token) {
      setError('Сесія закінчилась. Будь ласка, увійдіть знову.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await itemService.transferToBalance(token, item.id, {
        document_number: trimmedNumber,
        document_date: documentDate,
        supplier_name: trimmedSupplier,
      })
      setSuccess(true)
      // Give user a moment to see the success state, then close and refresh
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка сервера. Спробуйте ще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оформлення документів</DialogTitle>
        </DialogHeader>

        {/* Item name for context */}
        <p className="text-sm text-muted-foreground -mt-1">
          МЦ: <span className="font-medium text-foreground">{item.name}</span>
        </p>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              МЦ успішно переведено на баланс
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Номер накладної */}
            <div className="space-y-1.5">
              <label htmlFor="doc-number" className="text-sm font-medium leading-none">
                Номер накладної <span className="text-destructive">*</span>
              </label>
              <Input
                id="doc-number"
                ref={firstInputRef}
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Наприклад: НК-2024-001"
                maxLength={50}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Дата накладної */}
            <div className="space-y-1.5">
              <label htmlFor="doc-date" className="text-sm font-medium leading-none">
                Дата накладної <span className="text-destructive">*</span>
              </label>
              <Input
                id="doc-date"
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Постачальник */}
            <div className="space-y-1.5">
              <label htmlFor="supplier" className="text-sm font-medium leading-none">
                Постачальник <span className="text-destructive">*</span>
              </label>
              <Input
                id="supplier"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Наприклад: ТОВ «Постачальник»"
                maxLength={255}
                disabled={isSubmitting}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Скасувати
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !documentNumber.trim() || !documentDate || !supplierName.trim()}
              >
                {isSubmitting ? 'Збереження…' : 'Перевести на баланс'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
