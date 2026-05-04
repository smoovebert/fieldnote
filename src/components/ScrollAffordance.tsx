// Tiny visual hint that says "this region scrolls — there's more below."
// Drop as the last child of any scroll container. The component auto-binds
// to its DOM parent and only renders the badge when:
//   - the parent overflows (scrollHeight > clientHeight)
//   - the user hasn't already scrolled near the bottom
// Uses position: sticky so it floats at the bottom-right of the visible
// viewport of the parent, regardless of scroll position.

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const NEAR_BOTTOM_THRESHOLD = 12 // px from bottom counts as "at bottom"

export function ScrollAffordance() {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const scroller = anchor.parentElement
    if (!scroller) return

    const update = () => {
      const overflow = scroller.scrollHeight - scroller.clientHeight
      if (overflow <= NEAR_BOTTOM_THRESHOLD) {
        setVisible(false)
        return
      }
      const distanceFromBottom = overflow - scroller.scrollTop
      setVisible(distanceFromBottom > NEAR_BOTTOM_THRESHOLD)
    }

    update()
    scroller.addEventListener('scroll', update, { passive: true })
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(scroller)
    // Watch for content changes inside the scroller (panels expand/collapse,
    // lists grow). MutationObserver catches structural changes that
    // ResizeObserver alone misses when the scroller itself doesn't resize.
    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(scroller, { childList: true, subtree: true, characterData: true })

    return () => {
      scroller.removeEventListener('scroll', update)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return (
    <div
      ref={anchorRef}
      className={`scroll-affordance${visible ? ' is-visible' : ''}`}
      aria-hidden="true"
    >
      <ChevronDown size={11} strokeWidth={1.25} aria-hidden="true" />
    </div>
  )
}
