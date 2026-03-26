import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
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
import { GroupTree } from '@renderer/components/GroupTree'
import { groupService } from '@renderer/services/groupService'
import type { Group } from '@renderer/services/groupService'
import { useAuthStore } from '@renderer/store/authStore'

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------
interface ContextMenuState {
  group: Group
  x: number
  y: number
}

interface ContextMenuProps {
  state: ContextMenuState
  onClose: () => void
  onCreateChild: (group: Group) => void
  onRename: (group: Group) => void
  onDelete: (group: Group) => void
}

function ContextMenu({ state, onClose, onCreateChild, onRename, onDelete }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const canCreateChild = state.group.level < 4

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const item = (label: string, handler: () => void, danger = false) => (
    <button
      key={label}
      onMouseDown={(e) => {
        e.preventDefault()
        handler()
        onClose()
      }}
      className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors ${
        danger ? 'text-destructive hover:bg-destructive/10' : ''
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: state.y, left: state.x, zIndex: 9999 }}
      className="min-w-40 rounded-md border border-border bg-popover shadow-lg p-1"
    >
      {canCreateChild && item('Створити підгрупу', () => onCreateChild(state.group))}
      {item('Перейменувати', () => onRename(state.group))}
      {item('Видалити', () => onDelete(state.group), true)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal dialog for create / rename
// ---------------------------------------------------------------------------
type ModalMode = 'create-root' | 'create-child' | 'rename'

interface NameModalProps {
  mode: ModalMode
  initialValue?: string
  parentGroup?: Group | null
  onConfirm: (name: string) => Promise<void>
  onClose: () => void
}

function NameModal({ mode, initialValue = '', parentGroup, onConfirm, onClose }: NameModalProps) {
  const [value, setValue] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const title =
    mode === 'create-root'
      ? 'Нова коренева група'
      : mode === 'create-child'
        ? `Нова підгрупа в «${parentGroup?.name}»`
        : `Перейменувати «${initialValue}»`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) { setError('Назва не може бути порожньою'); return }
    setLoading(true)
    setError(null)
    try {
      await onConfirm(trimmed)
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            ref={inputRef}
            placeholder="Назва групи"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={100}
            disabled={loading}
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Скасувати
            </Button>
            <Button type="submit" disabled={loading || !value.trim()}>
              {loading ? 'Збереження…' : 'Зберегти'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------
interface DeleteDialogProps {
  group: Group
  onConfirm: () => Promise<void>
  onClose: () => void
}

function DeleteDialog({ group, onConfirm, onClose }: DeleteDialogProps) {
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
          <DialogTitle>Видалити групу</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Видалити «{group.name}» та всі її підгрупи? Цю дію не можна скасувати.
        </p>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
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
export function GroupsScreen(): React.JSX.Element {
  const { token } = useAuthStore()
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [modal, setModal] = useState<{
    mode: ModalMode
    group?: Group | null
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await groupService.getGroups(token)
      setGroups(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося завантажити групи')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  // --- context menu handlers ---
  const handleContextMenu = useCallback((group: Group, x: number, y: number) => {
    setContextMenu({ group, x, y })
  }, [])

  // --- drag-drop: move group ---
  const handleMove = useCallback(async (draggedId: string, newParentId: string | null) => {
    if (!token) return
    try {
      await groupService.moveGroup(token, draggedId, newParentId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка переміщення групи')
    }
  }, [token, load])

  // --- create ---
  const handleCreateConfirm = useCallback(async (name: string) => {
    if (!token || !modal) return
    const parentId = modal.mode === 'create-child' ? modal.group?.id ?? null : null
    await groupService.createGroup(token, { name, parentId })
    await load()
  }, [token, modal, load])

  // --- rename ---
  const handleRenameConfirm = useCallback(async (name: string) => {
    if (!token || !modal?.group) return
    await groupService.renameGroup(token, modal.group.id, name)
    await load()
  }, [token, modal, load])

  // --- delete ---
  const handleDeleteConfirm = useCallback(async () => {
    if (!token || !deleteTarget) return
    await groupService.deleteGroup(token, deleteTarget.id)
    await load()
  }, [token, deleteTarget, load])

  const confirmHandler = modal?.mode === 'rename' ? handleRenameConfirm : handleCreateConfirm

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Button onClick={() => setModal({ mode: 'create-root' })}>
          <Plus className="h-4 w-4" />
          Нова група
        </Button>
        <Button variant="outline" size="icon" onClick={load} disabled={isLoading} title="Оновити">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          {isLoading ? 'Завантаження…' : `${countGroups(groups)} груп`}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tree card */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4 min-h-48">
          <GroupTree
            groups={groups}
            onContextMenu={handleContextMenu}
            onMove={handleMove}
          />
        </CardContent>
      </Card>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onCreateChild={(g) => { setModal({ mode: 'create-child', group: g }) }}
          onRename={(g) => { setModal({ mode: 'rename', group: g }) }}
          onDelete={(g) => { setDeleteTarget(g) }}
        />
      )}

      {/* Name modal (create / rename) */}
      {modal && (
        <NameModal
          mode={modal.mode}
          initialValue={modal.mode === 'rename' ? modal.group?.name : ''}
          parentGroup={modal.mode === 'create-child' ? modal.group : null}
          onConfirm={confirmHandler}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteDialog
          group={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function countGroups(groups: Group[]): number {
  let count = 0
  function walk(nodes: Group[]) {
    for (const n of nodes) {
      count++
      if (n.children.length) walk(n.children)
    }
  }
  walk(groups)
  return count
}
