// Refine-mode left rail: the codebook as a draggable tree. Drag a code
// onto another to nest it; drop above to make it top-level. The drag/drop
// state is local — only the reparent decision flows back out via callback.

import { useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { Code, Excerpt } from '../../lib/types'
import { buildCodeTree } from '../../lib/codeTree'

type Props = {
  codes: Code[]
  excerpts: Excerpt[]
  activeCodeId: string
  onSelectCode: (id: string) => void
  onReparentCode: (codeId: string, parentCodeId: string) => void
  onMergeCode: (fromCodeId: string, intoCodeId: string) => void
  newCodeName: string
  onNewCodeNameChange: (next: string) => void
  onAddCode: () => void
  onDeleteCodes: (codeIds: string[]) => void
}

export function RefineSidebar(props: Props) {
  const orderedCodes = buildCodeTree(props.codes)
  const [draggingCodeId, setDraggingCodeId] = useState<string | null>(null)
  const [dropTargetCodeId, setDropTargetCodeId] = useState<string | null>(null)
  const [rootDropActive, setRootDropActive] = useState(false)
  // True while the pointer is over a drop target with Shift held — the
  // drop will merge (combine the two codes) instead of nest. Tracked
  // from dragOver's live shiftKey so the target's affordance updates as
  // the user presses/releases Shift mid-hover.
  const [mergeIntent, setMergeIntent] = useState(false)
  // Bulk-selection set for multi-delete. Cmd/Ctrl-click toggles a code
  // in/out without changing the active code; plain click selects the
  // active code and clears the bulk set so the two interactions don't
  // fight each other.
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  // Build descendant set for the dragged code so we can reject drops onto
  // self/descendants — without this, a user could drag a parent into its
  // own child and create a cycle.
  const draggingDescendants = useMemo(() => {
    if (!draggingCodeId) return new Set<string>()
    const descendants = new Set<string>([draggingCodeId])
    let frontier = [draggingCodeId]
    while (frontier.length) {
      const next: string[] = []
      for (const parentId of frontier) {
        for (const c of props.codes) {
          if (c.parentCodeId === parentId && !descendants.has(c.id)) {
            descendants.add(c.id)
            next.push(c.id)
          }
        }
      }
      frontier = next
    }
    return descendants
  }, [draggingCodeId, props.codes])

  const isValidDrop = (targetId: string) => Boolean(draggingCodeId) && !draggingDescendants.has(targetId)

  const refCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const excerpt of props.excerpts) {
      for (const codeId of excerpt.codeIds) {
        counts.set(codeId, (counts.get(codeId) ?? 0) + 1)
      }
    }
    return counts
  }, [props.excerpts])

  return (
    <>
      <div className="new-code refine-sidebar-new-code">
        <input
          value={props.newCodeName}
          placeholder="New code"
          aria-label="New code name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => props.onNewCodeNameChange(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') props.onAddCode()
          }}
        />
        <button type="button" className="icon-button" onClick={props.onAddCode} aria-label="Add code">
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="code-tree-hint">Drag a code onto another to nest it, or <strong>Shift-drag</strong> to merge them into one. Drop above to unparent. {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}-click to multi-select for bulk delete.</p>
      <div
        className={`code-tree-root-drop${rootDropActive ? ' is-drop-target' : ''}`}
        onDragOver={(event) => {
          if (!draggingCodeId) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setRootDropActive(true)
        }}
        onDragLeave={() => setRootDropActive(false)}
        onDrop={(event) => {
          event.preventDefault()
          if (draggingCodeId) props.onReparentCode(draggingCodeId, '')
          setRootDropActive(false)
          setDraggingCodeId(null)
          setDropTargetCodeId(null)
        }}
      >
        ↑ Drop here to make top-level
      </div>
      {bulkSelected.size > 0 && (
        <div className="refine-bulk-bar">
          <span className="refine-bulk-count">{bulkSelected.size} selected</span>
          <button
            type="button"
            className="refine-bulk-delete"
            onClick={() => {
              const ids = Array.from(bulkSelected)
              props.onDeleteCodes(ids)
              setBulkSelected(new Set())
            }}
          >
            <Trash2 size={13} aria-hidden="true" />
            Delete
          </button>
          <button
            type="button"
            className="refine-bulk-clear"
            onClick={() => setBulkSelected(new Set())}
            aria-label="Clear bulk selection"
          >
            <X size={13} aria-hidden="true" />
          </button>
        </div>
      )}
      {orderedCodes.map((code) => {
        const isActive = code.id === props.activeCodeId
        const isDragging = draggingCodeId === code.id
        const isDropTarget = dropTargetCodeId === code.id && isValidDrop(code.id)
        const isMergeTarget = isDropTarget && mergeIntent
        const isBulkSelected = bulkSelected.has(code.id)
        const classes = ['list-item']
        if (isActive) classes.push('active')
        if (isDragging) classes.push('is-dragging')
        if (isDropTarget) classes.push('is-drop-target')
        if (isMergeTarget) classes.push('is-merge-target')
        if (isBulkSelected) classes.push('is-bulk-selected')
        return (
          <button
            className={classes.join(' ')}
            key={code.id}
            type="button"
            style={{ paddingLeft: 14 + code.depth * 16 }}
            draggable
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              if (event.metaKey || event.ctrlKey) {
                setBulkSelected((current) => {
                  const next = new Set(current)
                  if (next.has(code.id)) next.delete(code.id)
                  else next.add(code.id)
                  return next
                })
                return
              }
              setBulkSelected(new Set())
              props.onSelectCode(code.id)
            }}
            onDragStart={(event) => {
              setDraggingCodeId(code.id)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', code.id)
            }}
            onDragEnd={() => {
              setDraggingCodeId(null)
              setDropTargetCodeId(null)
              setRootDropActive(false)
              setMergeIntent(false)
            }}
            onDragOver={(event) => {
              if (!isValidDrop(code.id)) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropTargetCodeId(code.id)
              setMergeIntent(event.shiftKey)
            }}
            onDragLeave={() => {
              if (dropTargetCodeId === code.id) {
                setDropTargetCodeId(null)
                setMergeIntent(false)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (draggingCodeId && isValidDrop(code.id)) {
                // Shift-drop merges the two codes; a plain drop nests.
                if (event.shiftKey) props.onMergeCode(draggingCodeId, code.id)
                else props.onReparentCode(draggingCodeId, code.id)
              }
              setDraggingCodeId(null)
              setDropTargetCodeId(null)
              setRootDropActive(false)
              setMergeIntent(false)
            }}
          >
            <span className="code-dot" style={{ background: code.color }} />
            <div>
              <strong>{code.name}</strong>
              <span>{refCounts.get(code.id) ?? 0} direct excerpt{refCounts.get(code.id) === 1 ? '' : 's'}</span>
            </div>
            {isDropTarget && (
              <span className="code-drop-flag">{isMergeTarget ? 'Merge here' : 'Nest here'}</span>
            )}
          </button>
        )
      })}
    </>
  )
}
