// Pure operations on coded excerpts. Returns the next excerpt array;
// callers wire the result back into state.

import type { Excerpt } from './types'

export function deleteExcerpt(excerpts: Excerpt[], excerptId: string): Excerpt[] {
  return excerpts.filter((e) => e.id !== excerptId)
}

type RemoveCodeInput = {
  excerpts: Excerpt[]
  excerptId: string
  codeId: string
}

/**
 * Remove a single code from an excerpt's codeIds.
 *
 * If the excerpt loses its last code, it is removed from the excerpts
 * array entirely (an uncoded reference has no meaning).
 */
export function removeCodeFromExcerpt({
  excerpts,
  excerptId,
  codeId,
}: RemoveCodeInput): Excerpt[] {
  return excerpts
    .map((e) =>
      e.id === excerptId ? { ...e, codeIds: e.codeIds.filter((id) => id !== codeId) } : e,
    )
    .filter((e) => e.codeIds.length > 0)
}

type SplitExcerptInput = {
  excerpts: Excerpt[]
  excerptId: string
  selectedText: string
  newExcerptId: string
}

export type SplitExcerptResult =
  | { ok: true; excerpts: Excerpt[]; newExcerptId: string }
  | { ok: false; reason: 'not-found' | 'selection-not-in-text' | 'selection-is-whole-text' }

/**
 * Split a coded reference: extract `selectedText` into a new excerpt
 * (with the same code IDs), leave the rest as the existing excerpt.
 *
 * Failure modes:
 * - 'not-found' — `excerptId` doesn't match any excerpt.
 * - 'selection-not-in-text' — `selectedText` isn't a substring of the excerpt.
 * - 'selection-is-whole-text' — splitting would empty the original excerpt
 *   (the user selected everything; that's a rename, not a split).
 *
 * `newExcerptId` is provided by the caller so the function stays
 * deterministic for tests. App.tsx generates a Date.now()-based ID.
 */
export function splitExcerpt({
  excerpts,
  excerptId,
  selectedText,
  newExcerptId,
}: SplitExcerptInput): SplitExcerptResult {
  const excerpt = excerpts.find((e) => e.id === excerptId)
  if (!excerpt) return { ok: false, reason: 'not-found' }

  const trimmed = selectedText.trim()
  if (!trimmed) return { ok: false, reason: 'selection-not-in-text' }

  const splitIndex = excerpt.text.indexOf(trimmed)
  if (splitIndex === -1) return { ok: false, reason: 'selection-not-in-text' }

  const before = excerpt.text.slice(0, splitIndex).trim()
  const after = excerpt.text.slice(splitIndex + trimmed.length).trim()
  const remainingText = [before, after].filter(Boolean).join(' ')

  if (!remainingText) return { ok: false, reason: 'selection-is-whole-text' }

  const splitReference: Excerpt = {
    ...excerpt,
    id: newExcerptId,
    text: trimmed,
    note: '',
  }

  const nextExcerpts = excerpts.flatMap((item) =>
    item.id === excerptId ? [{ ...item, text: remainingText }, splitReference] : [item],
  )

  return { ok: true, excerpts: nextExcerpts, newExcerptId }
}
