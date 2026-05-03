import type { CSSProperties } from 'react'

export type LineNumberingMode = 'paragraph' | 'fixed-width'

export type TranscriptPiece = {
  text: string
  codes?: { id: string; color: string; name: string }[]
}

export function markBackground(codes: { color: string }[]): CSSProperties {
  if (codes.length === 0) return {}
  if (codes.length === 1) {
    return {
      background: `color-mix(in oklch, ${codes[0].color} 22%, transparent)`,
    }
  }
  const stops = codes
    .map((c, i) => {
      const a = (i * 100) / codes.length
      const b = ((i + 1) * 100) / codes.length
      const tint = `color-mix(in oklch, ${c.color} 22%, transparent)`
      return `${tint} ${a}% ${b}%`
    })
    .join(', ')
  return { background: `linear-gradient(${stops})` }
}

// Per-page highlight builder for PDF sources. Same overlay logic the
// whole-doc `highlightedTranscript` memo uses (overlaps an excerpt's
// text into the page body and surfaces matching codes), but scoped to
// a single page so the Code-mode reader can render one card per page.
//
// Excerpts are matched by substring against the page body. Excerpts
// without `pageNumber` (legacy data) match anywhere their text appears,
// so old highlights still light up on whichever page the substring
// happens to live.
// Reader-side helper for the page-card render. Walks up from a DOM
// node to the nearest `<section data-page="N">` ancestor and returns
// the element. Returns null if the node lives outside any page card
// (e.g. a click on the surrounding container, or a non-PDF source).
export function findPageSection(node: Node, container: HTMLElement): HTMLElement | null {
  let current: Node | null = node
  while (current && current !== container) {
    if (current.nodeType === 1) {
      const el = current as HTMLElement
      if (el.dataset && el.dataset.page) return el
    }
    current = current.parentNode
  }
  return null
}

// Sums the textContent length of every text node that precedes `range`
// inside `pageElement`. Used to record `Excerpt.charOffset` so the
// reader can later scroll-and-highlight to the exact spot on the page.
export function charOffsetWithinPage(pageElement: HTMLElement, range: Range): number {
  let offset = 0
  const walker = document.createTreeWalker(pageElement, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (node === range.startContainer) {
      return offset + range.startOffset
    }
    // If the start container is somewhere ahead, accumulate this node's length.
    offset += (node.textContent ?? '').length
    node = walker.nextNode()
  }
  // Fallback when the start container isn't inside the page (shouldn't
  // happen if the caller checked findPageSection first).
  return offset
}

export type SelectionPageInfo =
  | { kind: 'page'; pageNumber: number; charOffset: number }
  | { kind: 'cross-page' }
  | { kind: 'none' }

// Reads the document's current selection and resolves it to a single
// page card within `container`. Returns 'cross-page' when the start
// and end live in different page sections (the caller should reject
// the coding action with a hint). Returns 'none' for empty/collapsed
// selections or when the selection lies outside any page card (which
// happens for non-PDF sources — caller should fall through to the
// existing non-page coding path).
export function selectionPageInfo(container: HTMLElement | null): SelectionPageInfo {
  if (!container) return { kind: 'none' }
  const sel = typeof window === 'undefined' ? null : window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return { kind: 'none' }
  const range = sel.getRangeAt(0)
  const startPage = findPageSection(range.startContainer, container)
  const endPage = findPageSection(range.endContainer, container)
  if (!startPage) return { kind: 'none' }
  if (!endPage || startPage.dataset.page !== endPage.dataset.page) {
    return { kind: 'cross-page' }
  }
  const pageNumber = Number(startPage.dataset.page)
  if (!Number.isFinite(pageNumber) || pageNumber <= 0) return { kind: 'none' }
  return { kind: 'page', pageNumber, charOffset: charOffsetWithinPage(startPage, range) }
}

export function buildPageHighlights(
  pageBody: string,
  excerpts: Array<{ text: string; codeIds: string[] }>,
  codes: Array<{ id: string; name: string; color: string }>,
): TranscriptPiece[] {
  let pieces: TranscriptPiece[] = [{ text: pageBody }]
  for (const excerpt of excerpts) {
    const excerptCodes = codes.filter((c) => excerpt.codeIds.includes(c.id))
    if (!excerptCodes.length || !excerpt.text.trim()) continue
    pieces = pieces.flatMap((piece) => {
      if (piece.codes) return [piece]
      const idx = piece.text.indexOf(excerpt.text)
      if (idx === -1) return [piece]
      return [
        { text: piece.text.slice(0, idx) },
        { text: excerpt.text, codes: excerptCodes },
        { text: piece.text.slice(idx + excerpt.text.length) },
      ].filter((p) => p.text)
    })
  }
  return pieces
}

export function wrapHighlightedTranscript(
  pieces: TranscriptPiece[],
  mode: LineNumberingMode,
  width: number,
): TranscriptPiece[][] {
  const lines: TranscriptPiece[][] = [[]]
  let currentLength = 0

  const pushNewLine = () => {
    lines.push([])
    currentLength = 0
  }

  const pushSegment = (piece: TranscriptPiece, text: string) => {
    if (!text) return
    lines[lines.length - 1].push({ ...piece, text })
    currentLength += text.length
  }

  for (const piece of pieces) {
    const paragraphs = piece.text.split('\n')
    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraphIndex > 0) pushNewLine()

      if (mode === 'paragraph' || paragraph.length === 0) {
        pushSegment(piece, paragraph)
        return
      }

      let remaining = paragraph
      while (remaining.length > 0) {
        const room = width - currentLength
        if (remaining.length <= room) {
          pushSegment(piece, remaining)
          break
        }
        // Break at the last space within the remaining room (word-aware).
        // -1 means no space found at or before `room`.
        const breakIndex = remaining.lastIndexOf(' ', room)
        if (breakIndex <= 0) {
          // No usable break point. If the current line already has content,
          // wrap to a fresh line and try again. Otherwise hard-break at room
          // to make progress on a single very long word.
          if (currentLength > 0) {
            pushNewLine()
            continue
          }
          pushSegment(piece, remaining.slice(0, room))
          remaining = remaining.slice(room)
          pushNewLine()
          continue
        }
        pushSegment(piece, remaining.slice(0, breakIndex))
        remaining = remaining.slice(breakIndex + 1) // drop the space at the break
        pushNewLine()
      }
    })
  }

  return lines
}
