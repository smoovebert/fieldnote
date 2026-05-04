// Visual hint that says "this region scrolls — there's more below."
// Drop as the last child of any scroll container; the component finds
// its DOM parent (the scroll container), then renders the badge as
// fixed-position overlay chrome via a portal to document.body. This
// keeps the badge fully decoupled from the scroll container's content
// flow — it can never overlap text rows, since it lives outside.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const NEAR_BOTTOM_THRESHOLD = 12 // px from bottom counts as "at bottom"
const BADGE_SIZE = 22
const INSET = 10 // gap from container's bottom-right corner

export function ScrollAffordance() {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const scroller = sentinel.parentElement
    if (!scroller) return

    const update = () => {
      const overflow = scroller.scrollHeight - scroller.clientHeight
      if (overflow <= NEAR_BOTTOM_THRESHOLD) {
        setVisible(false)
        return
      }
      const distanceFromBottom = overflow - scroller.scrollTop
      const shouldShow = distanceFromBottom > NEAR_BOTTOM_THRESHOLD
      setVisible(shouldShow)
      if (shouldShow) {
        const rect = scroller.getBoundingClientRect()
        setPos({
          top: rect.bottom - INSET - BADGE_SIZE,
          left: rect.right - INSET - BADGE_SIZE,
        })
      }
    }

    update()
    scroller.addEventListener('scroll', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true, capture: true })
    window.addEventListener('resize', update)
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(scroller)
    // Watch for content changes inside the scroller (panels expand/collapse,
    // lists grow). MutationObserver catches structural changes that
    // ResizeObserver alone misses when the scroller itself doesn't resize.
    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(scroller, { childList: true, subtree: true, characterData: true })

    return () => {
      scroller.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', update)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return (
    <>
      <div ref={sentinelRef} className="scroll-affordance-sentinel" aria-hidden="true" />
      {visible && pos && createPortal(
        <div
          className="scroll-affordance is-visible"
          style={{ top: pos.top, left: pos.left }}
          aria-hidden="true"
        >
          <ChevronDown size={11} strokeWidth={1.25} aria-hidden="true" />
        </div>,
        document.body,
      )}
    </>
  )
}
