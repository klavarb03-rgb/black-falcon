import React, { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { cn } from '@lib/utils'
import type { Donor, CreateDonorInput, UpdateDonorInput } from '@renderer/services/donorService'

const textareaClass = cn(
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2',
  'text-sm ring-offset-background placeholder:text-muted-foreground resize-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50'
)

interface DonorFormProps {
  /** Donor to edit. Null means create mode. */
  donor?: Donor | null
  onConfirm: (input: CreateDonorInput | UpdateDonorInput) => Promise<void>
  onClose: () => void
}

export function DonorForm({ donor, onConfirm, onClose }: DonorFormProps): React.JSX.Element {
  const isEdit = donor != null
  const [name, setName] = useState(donor?.name ?? '')
  const [contactInfo, setContactInfo] = useState(donor?.contactInfo ?? '')
  const [description, setDescription] = useState(donor?.description ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Назва обов'язкова")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await onConfirm({
        name: trimmedName,
        contactInfo: contactInfo.trim() || null,
        description: description.trim() || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка сервера')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Редагувати «${donor!.name}»` : 'Новий донор'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Назва */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">
              Назва <span className="text-destructive">*</span>
            </label>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Фонд «Повернись живим»"
              maxLength={255}
              disabled={loading}
            />
          </div>

          {/* Контактна інформація */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">Контактна інформація</label>
            <Input
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Телефон, email або сайт"
              maxLength={255}
              disabled={loading}
            />
          </div>

          {/* Опис */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none">Опис</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaClass}
              placeholder="Додаткова інформація про донора…"
              rows={3}
              maxLength={1000}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Скасувати
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Збереження…' : isEdit ? 'Зберегти зміни' : 'Додати донора'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
