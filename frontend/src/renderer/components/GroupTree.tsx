import React, { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import { cn } from '@lib/utils'
import type { Group } from '@renderer/services/groupService'

export interface GroupTreeProps {
  groups: Group[]
  /** Called on right-click: provides the group and screen coordinates for the context menu. */
  onContextMenu: (group: Group, x: number, y: number) => void
  /** Called when a group is dragged onto a new parent (null = root). */
  onMove: (draggedId: string, newParentId: string | null) => void
}

interface DragState {
  draggedId: string | null
  overId: string | null
}

interface TreeNodeProps {
  group: Group
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onContextMenu: (group: Group, x: number, y: number) => void
  drag: DragState
  onDragStart: (id: string) => void
  onDragOver: (id: string) => void
  onDrop: (targetId: string | null) => void
  onDragEnd: () => void
}

const INDENT = 20 // px per depth level

function TreeNode({
  group,
  depth,
  expanded,
  onToggle,
  onContextMenu,
  drag,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TreeNodeProps): React.JSX.Element {
  const hasChildren = group.children.length > 0
  const isExpanded = expanded.has(group.id)
  const isDragging = drag.draggedId === group.id
  const isOver = drag.overId === group.id && drag.draggedId !== group.id
  // max 4 levels: depth 0..3; a node at depth 3 (level 4) can't accept children
  const canAcceptDrop = depth < 3 && drag.draggedId !== group.id

  return (
    <li>
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.effectAllowed = 'move'
          onDragStart(group.id)
        }}
        onDragOver={(e) => {
          if (!canAcceptDrop) return
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          onDragOver(group.id)
        }}
        onDrop={(e) => {
          if (!canAcceptDrop) return
          e.preventDefault()
          e.stopPropagation()
          onDrop(group.id)
        }}
        onDragEnd={(e) => {
          e.stopPropagation()
          onDragEnd()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(group, e.clientX, e.clientY)
        }}
        style={{ paddingLeft: depth * INDENT }}
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer select-none',
          'hover:bg-muted/60 transition-colors',
          isDragging && 'opacity-40',
          isOver && canAcceptDrop && 'bg-primary/15 ring-1 ring-primary/40',
        )}
      >
        {/* Expand/collapse chevron */}
        <span
          className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggle(group.id)
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : null}
        </span>

        {/* Folder icon */}
        <span className="shrink-0 text-muted-foreground">
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-primary/70" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground/70" />
          )}
        </span>

        {/* Group name */}
        <span className="flex-1 truncate text-foreground">{group.name}</span>

        {/* Level badge */}
        <span className="shrink-0 text-[10px] text-muted-foreground/50 font-mono">
          Р{depth + 1}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul>
          {group.children.map((child) => (
            <TreeNode
              key={child.id}
              group={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
              drag={drag}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function GroupTree({ groups, onContextMenu, onMove }: GroupTreeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand root nodes by default
    return new Set(groups.map((g) => g.id))
  })
  const [drag, setDrag] = useState<DragState>({ draggedId: null, overId: null })

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDragStart = useCallback((id: string) => {
    setDrag({ draggedId: id, overId: null })
  }, [])

  const handleDragOver = useCallback((id: string) => {
    setDrag((prev) => ({ ...prev, overId: id }))
  }, [])

  const handleDrop = useCallback(
    (targetId: string | null) => {
      if (drag.draggedId && drag.draggedId !== targetId) {
        onMove(drag.draggedId, targetId)
      }
      setDrag({ draggedId: null, overId: null })
    },
    [drag.draggedId, onMove],
  )

  const handleDragEnd = useCallback(() => {
    setDrag({ draggedId: null, overId: null })
  }, [])

  if (groups.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Груп ще немає. Створіть першу групу.
      </div>
    )
  }

  return (
    // Drop zone for root (drag onto empty area)
    <div
      className="min-h-full"
      onDragOver={(e) => {
        if (!drag.draggedId) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDrag((prev) => ({ ...prev, overId: null }))
      }}
      onDrop={(e) => {
        e.preventDefault()
        handleDrop(null)
      }}
    >
      <ul className="space-y-0.5">
        {groups.map((group) => (
          <TreeNode
            key={group.id}
            group={group}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            onContextMenu={onContextMenu}
            drag={drag}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />
        ))}
      </ul>
    </div>
  )
}
