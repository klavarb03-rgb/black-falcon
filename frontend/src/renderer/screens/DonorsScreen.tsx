import React, { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Card, CardContent } from '@components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { DonorForm } from '@renderer/components/DonorForm'
import { donorService } from '@renderer/services/donorService'
import type { Donor, PaginatedDonorsResponse } from '@renderer/services/donorService'
import { useAuthStore } from '@renderer/store/authStore'

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------
interface DeleteDialogProps {
  donor: Donor
  onConfirm: () => Promise<void>
  onClose: () => void
}

function DeleteDialog({ donor, onConfirm, onClose }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка сервера')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Видалити донора</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Видалити «{donor.name}»? Цю дію не можна скасувати.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Скасувати
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Видалення…' : 'Видалити'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export function DonorsScreen(): React.JSX.Element {
  const PAGE_SIZE = 20

  const { token } = useAuthStore()
  const [donors, setDonors] = useState<Donor[]>([])
  const [meta, setMeta] = useState<PaginatedDonorsResponse['meta'] | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [formTarget, setFormTarget] = useState<Donor | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<Donor | null>(null)

  const load = useCallback(async (targetPage = page) => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await donorService.getDonors(token, targetPage, PAGE_SIZE)
      setDonors(res.data)
      setMeta(res.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити доноров')
    } finally {
      setIsLoading(false)
    }
  }, [token, page])

  useEffect(() => { load() }, [load])

  function goToPage(p: number) {
    setPage(p)
    load(p)
  }

  const filteredDonors = donors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.contactInfo ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleFormConfirm(input: Parameters<typeof donorService.createDonor>[1]) {
    if (!token) return
    if (formTarget === 'new') {
      await donorService.createDonor(token, input)
      await load(1) // go to first page after create
      setPage(1)
    } else if (formTarget) {
      await donorService.updateDonor(token, formTarget.id, input)
      await load(page)
    }
  }

  async function handleDeleteConfirm() {
    if (!token || !deleteTarget) return
    await donorService.deleteDonor(token, deleteTarget.id)
    // if last item on page, go back one page
    const targetPage = donors.length === 1 && page > 1 ? page - 1 : page
    setPage(targetPage)
    await load(targetPage)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Пошук за назвою або контактами…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => load(page)} disabled={isLoading} title="Оновити">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button onClick={() => setFormTarget('new')}>
          <Plus className="h-4 w-4" />
          Додати донора
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table card */}
      <Card>
        <CardContent className="pt-4 pb-2 px-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-6 py-8 text-center">Завантаження…</p>
          ) : filteredDonors.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-8 text-center">
              {search ? 'Нічого не знайдено' : 'Донорів ще немає. Додайте першого!'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-6 py-2.5 text-left font-medium">Назва</th>
                  <th className="px-6 py-2.5 text-left font-medium">Контакти</th>
                  <th className="px-6 py-2.5 text-left font-medium hidden md:table-cell">Опис</th>
                  <th className="px-6 py-2.5 text-right font-medium">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonors.map((donor) => (
                  <tr
                    key={donor.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium">{donor.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {donor.contactInfo ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                      {donor.description ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Редагувати"
                          onClick={() => setFormTarget(donor)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Видалити"
                          onClick={() => setDeleteTarget(donor)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination footer */}
      {!isLoading && !error && meta && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {search
              ? `${filteredDonors.length} з ${donors.length} на сторінці`
              : `Всього: ${meta.total} донорів`}
          </span>
          {meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page <= 1 || isLoading}
                onClick={() => goToPage(page - 1)}
              >
                ← Назад
              </Button>
              <span className="px-1">
                {page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={page >= meta.totalPages || isLoading}
                onClick={() => goToPage(page + 1)}
              >
                Далі →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit form */}
      {formTarget != null && (
        <DonorForm
          donor={formTarget === 'new' ? null : formTarget}
          onConfirm={handleFormConfirm}
          onClose={() => setFormTarget(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteDialog
          donor={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
