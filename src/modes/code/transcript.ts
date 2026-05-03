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
