// Refine-mode left rail: the codebook as a draggable tree. Drag a code
// onto another to nest it; drop above to make it top-level. The drag/drop
// state is local — only the reparent decision flows back out via callback.

import { useMemo, useState } from 'react'
import type { Code, Excerpt } from '../../lib/types'
import { buildCodeTree } from '../../lib/codeTree'

type Props = {
  codes: Code[]
  excerpts: Excerpt[]
  activeCodeId: string
  onSelectCode: (id: string) => void
  onReparentCode: (codeId: string, parentCodeId: string) => void
}

export function RefineSidebar(props: Props) {
  const orderedCodes = buildCodeTree(props.codes)
  const [draggingCodeId, setDraggingCodeId] = useState<string | null>(null)
  const [dropTargetCodeId, setDropTargetCodeId] = useState<string | null>(null)
  const [rootDropActive, setRootDropActive] = useState(false)

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
      <p className="code-tree-hint">Drag a code onto another to nest it. Drop above to unparent.</p>
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
      {orderedCodes.map((code) => {
        const isActive = code.id === props.activeCodeId
        const isDragging = draggingCodeId === code.id
        const isDropTarget = dropTargetCodeId === code.id && isValidDrop(code.id)
        const classes = ['list-item']
        if (isActive) classes.push('active')
        if (isDragging) classes.push('is-dragging')
        if (isDropTarget) classes.push('is-drop-target')
        return (
          <button
            className={classes.join(' ')}
            key={code.id}
            type="button"
            style={{ paddingLeft: 14 + code.depth * 16 }}
            draggable
            onClick={() => props.onSelectCode(code.id)}
            onDragStart={(event) => {
              setDraggingCodeId(code.id)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', code.id)
            }}
            onDragEnd={() => {
              setDraggingCodeId(null)
              setDropTargetCodeId(null)
              setRootDropActive(false)
            }}
            onDragOver={(event) => {
              if (!isValidDrop(code.id)) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropTargetCodeId(code.id)
            }}
            onDragLeave={() => {
              if (dropTargetCodeId === code.id) setDropTargetCodeId(null)
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (draggingCodeId && isValidDrop(code.id)) {
                props.onReparentCode(draggingCodeId, code.id)
              }
              setDraggingCodeId(null)
              setDropTargetCodeId(null)
              setRootDropActive(false)
            }}
          >
            <span className="code-dot" style={{ background: code.color }} />
            <div>
              <strong>{code.name}</strong>
              <span>{refCounts.get(code.id) ?? 0} direct references</span>
            </div>
          </button>
        )
      })}
    </>
  )
}
