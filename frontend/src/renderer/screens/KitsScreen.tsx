import React, { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  RefreshCw,
  PackagePlus,
  PackageMinus,
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react'
import { Button } from '@components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { kitService } from '@renderer/services/kitService'
import type { KitTemplate, AssembledKit } from '@renderer/services/kitService'
import { itemService } from '@renderer/services/itemService'
import type { Item } from '@renderer/services/itemService'
import { KitTemplateForm } from '@renderer/components/KitTemplateForm'
import { useAuthStore } from '@renderer/store/authStore'
import { cn } from '@lib/utils'

// ---------------------------------------------------------------------------
// Available kits dialog
// ---------------------------------------------------------------------------
interface AvailableDialogProps {
  template: KitTemplate
  inventoryByItemId: Map<string, number>
  onClose: () => void
}

function AvailableDialog({ template, inventoryByItemId, onClose }: AvailableDialogProps): React.JSX.Element {
  const available = kitService.calculateAvailable(template, inventoryByItemId)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Доступні набори — {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
            <p className="text-4xl font-bold text-foreground">{available}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {available === 1 ? 'набір можна зібрати' : available < 5 ? 'набори можна зібрати' : 'наборів можна зібрати'}
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Деталі по позиціях:</p>
            {template.items.map((item) => {
              const have = inventoryByItemId.get(item.itemId) ?? 0
              const canMake = Math.floor(have / item.requiredQty)
              const ok = canMake > 0
              return (
                <div
                  key={item.itemId}
                  className={cn(
                    'flex items-center justify-between text-sm rounded-md px-3 py-2 border',
                    ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'
                  )}
                >
                  <span className="truncate mr-2">{item.itemName}</span>
                  <span className={cn('shrink-0 font-medium tabular-nums', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                    {have} / {item.requiredQty}{item.unit ? ` ${item.unit}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Закрити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete template confirmation
// ---------------------------------------------------------------------------
interface DeleteTemplateDialogProps {
  template: KitTemplate
  onConfirm: () => void
  onClose: () => void
}

function DeleteTemplateDialog({ template, onConfirm, onClose }: DeleteTemplateDialogProps): React.JSX.Element {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Видалити шаблон</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Видалити шаблон «{template.name}»? Усі зібрані набори за цим шаблоном також буде видалено.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Скасувати</Button>
          <Button variant="destructive" onClick={onConfirm}>Видалити</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------
interface TemplateCardProps {
  template: KitTemplate
  assembledKits: AssembledKit[]
  inventoryByItemId: Map<string, number>
  onAssemble: (template: KitTemplate) => void
  onDisassemble: (kitId: string) => void
  onDelete: (template: KitTemplate) => void
  onViewAvailable: (template: KitTemplate) => void
}

function TemplateCard({
  template,
  assembledKits,
  inventoryByItemId,
  onAssemble,
  onDisassemble,
  onDelete,
  onViewAvailable,
}: TemplateCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const available = kitService.calculateAvailable(template, inventoryByItemId)
  const assembled = assembledKits.filter((k) => k.templateId === template.id)

  return (
    <Card className="overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <button className="text-muted-foreground shrink-0" tabIndex={-1}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <Package className="h-4 w-4 text-muted-foreground shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {template.items.length} позиц{template.items.length === 1 ? 'ія' : 'ій'}
            {' · '}
            {assembled.length} зібран{assembled.length === 1 ? 'о' : 'о'}
          </p>
        </div>

        {/* Available badge */}
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            available > 0
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
          )}
          title="Доступно для збирання"
          onClick={(e) => { e.stopPropagation(); onViewAvailable(template) }}
        >
          {available} дост.
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => onViewAvailable(template)}
            title="Переглянути доступну кількість"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Доступні</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
            onClick={() => onAssemble(template)}
            disabled={available < 1}
            title="Зібрати набір"
          >
            <PackagePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Зібрати</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(template)}
            title="Видалити шаблон"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4 border-t border-border bg-muted/20">
          {/* Template composition */}
          <div className="mt-3 mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Склад набору</p>
            <div className="space-y-1">
              {template.items.map((item) => {
                const have = inventoryByItemId.get(item.itemId) ?? 0
                const ok = have >= item.requiredQty
                return (
                  <div key={item.itemId} className="flex items-center justify-between text-sm">
                    <span className="truncate mr-2 text-foreground">{item.itemName}</span>
                    <span className={cn('shrink-0 tabular-nums text-xs', ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                      {item.requiredQty}{item.unit ? ` ${item.unit}` : ''} (є: {have})
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Assembled kits list */}
          {assembled.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Зібрані набори ({assembled.length})</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {assembled.map((kit) => (
                  <div
                    key={kit.id}
                    className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground text-xs">
                      {new Date(kit.assembledAt).toLocaleString('uk-UA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 text-muted-foreground hover:text-destructive ml-2"
                      onClick={() => onDisassemble(kit.id)}
                      title="Розібрати набір"
                    >
                      <PackageMinus className="h-3 w-3" />
                      Розібрати
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assembled.length === 0 && (
            <p className="text-xs text-muted-foreground">Ще не зібрано жодного набору.</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export function KitsScreen(): React.JSX.Element {
  const { token } = useAuthStore()
  const [templates, setTemplates] = useState<KitTemplate[]>([])
  const [assembledKits, setAssembledKits] = useState<AssembledKit[]>([])
  const [inventoryItems, setInventoryItems] = useState<Item[]>([])
  const [inventoryByItemId, setInventoryByItemId] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KitTemplate | null>(null)
  const [availableTarget, setAvailableTarget] = useState<KitTemplate | null>(null)

  const loadInventory = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await itemService.getItems(token, 1, 1000)
      const items = res.data
      setInventoryItems(items)
      const byId = new Map<string, number>()
      for (const item of items) {
        byId.set(item.id, (byId.get(item.id) ?? 0) + item.quantity)
      }
      setInventoryByItemId(byId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити інвентар')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  function loadLocal() {
    setTemplates(kitService.getTemplates())
    setAssembledKits(kitService.getAssembledKits())
  }

  useEffect(() => {
    loadLocal()
    void loadInventory()
  }, [loadInventory])

  function handleCreated() {
    loadLocal()
    setShowCreateForm(false)
  }

  function handleAssemble(template: KitTemplate) {
    kitService.assembleKit(template)
    loadLocal()
  }

  function handleDisassemble(kitId: string) {
    kitService.disassembleKit(kitId)
    loadLocal()
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    kitService.deleteTemplate(deleteTarget.id)
    loadLocal()
    setDeleteTarget(null)
  }

  async function handleRefresh() {
    loadLocal()
    await loadInventory()
  }

  const totalAssembled = assembledKits.length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          Створити шаблон
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          title="Оновити"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>

        <span className="text-sm text-muted-foreground ml-auto">
          {isLoading
            ? 'Завантаження…'
            : `${templates.length} шаблон${templates.length === 1 ? '' : 'ів'} · ${totalAssembled} зібрано`}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Шаблони
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <p className="text-2xl font-bold">{templates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Зібрані набори
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <p className="text-2xl font-bold">{totalAssembled}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Позицій в інвентарі
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <p className="text-2xl font-bold">{inventoryItems.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates list */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Шаблони відсутні</p>
              <p className="text-xs text-muted-foreground mt-1">
                Створіть перший шаблон набору, щоб почати роботу.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4" />
              Створити шаблон
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              assembledKits={assembledKits}
              inventoryByItemId={inventoryByItemId}
              onAssemble={handleAssemble}
              onDisassemble={handleDisassemble}
              onDelete={setDeleteTarget}
              onViewAvailable={setAvailableTarget}
            />
          ))}
        </div>
      )}

      {/* Create template form */}
      {showCreateForm && (
        <KitTemplateForm
          inventoryItems={inventoryItems}
          onCreated={handleCreated}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteTemplateDialog
          template={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Available kits dialog */}
      {availableTarget && (
        <AvailableDialog
          template={availableTarget}
          inventoryByItemId={inventoryByItemId}
          onClose={() => setAvailableTarget(null)}
        />
      )}
    </div>
  )
}
