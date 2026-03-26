import React, { useEffect, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { kitService } from '@renderer/services/kitService'
import type { KitItem, KitTemplate } from '@renderer/services/kitService'
import type { Item } from '@renderer/services/itemService'

interface KitTemplateFormProps {
  inventoryItems: Item[]
  onCreated: (template: KitTemplate) => void
  onClose: () => void
}

interface FormRow {
  id: string
  itemId: string
  itemName: string
  unit: string | null
  qty: string
  searchQuery: string
  showDropdown: boolean
}

function emptyRow(): FormRow {
  return {
    id: crypto.randomUUID(),
    itemId: '',
    itemName: '',
    unit: null,
    qty: '1',
    searchQuery: '',
    showDropdown: false,
  }
}

export function KitTemplateForm({ inventoryItems, onCreated, onClose }: KitTemplateFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [rows, setRows] = useState<FormRow[]>([emptyRow()])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 50)
  }, [])

  function updateRow(id: string, patch: Partial<FormRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function selectItem(rowId: string, item: Item) {
    updateRow(rowId, {
      itemId: item.id,
      itemName: item.name,
      unit: item.unit,
      searchQuery: item.name,
      showDropdown: false,
    })
  }

  function filteredItems(query: string): Item[] {
    const q = query.toLowerCase().trim()
    if (!q) return inventoryItems.slice(0, 10)
    return inventoryItems.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 10)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) { setError('Введіть назву шаблону'); return }

    const validRows = rows.filter((r) => r.itemId && Number(r.qty) > 0)
    if (validRows.length === 0) { setError('Додайте хоча б одну позицію з вибраним предметом'); return }

    const items: KitItem[] = validRows.map((r) => ({
      itemId: r.itemId,
      itemName: r.itemName,
      requiredQty: Number(r.qty),
      unit: r.unit,
    }))

    setSaving(true)
    setError(null)
    try {
      const template = kitService.createTemplate(trimmedName, items)
      onCreated(template)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новий шаблон набору</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Назва шаблону
            </label>
            <Input
              ref={nameRef}
              placeholder="Наприклад: Аптечка бойова"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={saving}
            />
          </div>

          {/* Items list */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Склад набору
            </label>

            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="flex items-start gap-2">
                  {/* Item search */}
                  <div className="relative flex-1">
                    <Input
                      placeholder="Пошук позиції…"
                      value={row.searchQuery}
                      onChange={(e) => {
                        updateRow(row.id, {
                          searchQuery: e.target.value,
                          itemId: '',
                          itemName: '',
                          showDropdown: true,
                        })
                      }}
                      onFocus={() => updateRow(row.id, { showDropdown: true })}
                      onBlur={() => setTimeout(() => updateRow(row.id, { showDropdown: false }), 150)}
                      disabled={saving}
                      className={row.itemId ? 'border-emerald-500/50' : ''}
                    />
                    {row.showDropdown && (
                      <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                        {filteredItems(row.searchQuery).length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Нічого не знайдено</p>
                        ) : (
                          filteredItems(row.searchQuery).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={() => selectItem(row.id, item)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{item.name}</span>
                              {item.unit && (
                                <span className="text-xs text-muted-foreground shrink-0">{item.unit}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <Input
                    type="number"
                    min={1}
                    value={row.qty}
                    onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                    disabled={saving}
                    className="w-20 shrink-0"
                    placeholder="К-сть"
                  />

                  {/* Unit label */}
                  {row.unit && (
                    <span className="text-sm text-muted-foreground self-center shrink-0 w-10">
                      {row.unit}
                    </span>
                  )}

                  {/* Remove row */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                    disabled={saving || rows.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addRow}
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" />
              Додати позицію
            </Button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Скасувати
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Збереження…' : 'Зберегти шаблон'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
