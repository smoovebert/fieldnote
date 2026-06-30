import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

// Draggable seam between the app-shell's fixed-width side columns and the
// flexible center. The left column is anchored to the viewport's left
// edge and the right column to its right edge, so a column's width is
// just the pointer's distance from that edge — no start-offset bookkeeping
// needed. Width is clamped to [min, max]; double-click resets to the
// CSS default; Arrow keys nudge for keyboard users.
type Props = {
  side: 'left' | 'right'
  // Current resolved width in px (state value, or the CSS default when the
  // user hasn't resized yet) — used by keyboard nudging.
  current: number
  min: number
  max: number
  onResize: (width: number) => void
  onCommit: (width: number) => void
  onReset: () => void
}

const KEY_STEP = 16

export function ResizeHandle({ side, current, min, max, onResize, onCommit, onReset }: Props) {
  const dragging = useRef(false)
  const latest = useRef(current)

  const clamp = (raw: number) => Math.max(min, Math.min(max, Math.round(raw)))
  const widthFromClientX = (clientX: number) =>
    clamp(side === 'left' ? clientX : window.innerWidth - clientX)

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragging.current = true
    latest.current = current
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const width = widthFromClientX(event.clientX)
    latest.current = width
    onResize(width)
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    event.currentTarget.classList.remove('is-dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    onCommit(latest.current)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // For the left handle, ArrowRight grows the column; for the right
    // handle, ArrowLeft grows it (the rail extends toward the center).
    const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft'
    const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight'
    if (event.key !== grow && event.key !== shrink) return
    event.preventDefault()
    const next = clamp(current + (event.key === grow ? KEY_STEP : -KEY_STEP))
    onResize(next)
    onCommit(next)
  }

  return (
    <div
      className={`panel-resize-handle panel-resize-handle-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={side === 'left' ? 'Resize the sidebar' : 'Resize the inspector'}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  )
}
