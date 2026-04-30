// Pure operations on sources + linked data (excerpts, memos).
// Returns a patch — callers wire the result into state.

import type { Excerpt, Memo, Source } from './types'

type DeleteSourceInput = {
  sources: Source[]
  excerpts: Excerpt[]
  memos: Memo[]
  sourceId: string
}

type DeleteSourceResult = {
  sources: Source[]
  excerpts: Excerpt[]
  memos: Memo[]
}

/**
 * Delete a source. All excerpts that came from this source are dropped
 * (those references have nowhere to anchor anymore). Memos linked to
 * this source are dropped.
 */
export function deleteSource({
  sources,
  excerpts,
  memos,
  sourceId,
}: DeleteSourceInput): DeleteSourceResult {
  return {
    sources: sources.filter((s) => s.id !== sourceId),
    excerpts: excerpts.filter((e) => e.sourceId !== sourceId),
    memos: memos.filter(
      (m) => !(m.linkedType === 'source' && m.linkedId === sourceId),
    ),
  }
}
