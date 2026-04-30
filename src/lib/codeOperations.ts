// Pure operations on the codebook + linked data (excerpts, memos).
// Each function returns a new patch — callers wire setState to the result.
// No React imports, no async, no side effects.

import type { Code, Excerpt, Memo } from './types'

export function descendantCodeIds(codes: Code[], codeId: string): string[] {
  const childrenByParent = new Map<string, string[]>()
  for (const code of codes) {
    if (!code.parentCodeId) continue
    const list = childrenByParent.get(code.parentCodeId) ?? []
    list.push(code.id)
    childrenByParent.set(code.parentCodeId, list)
  }

  const ids: string[] = []
  const visit = (parentId: string, seen: Set<string>) => {
    const childIds = childrenByParent.get(parentId) ?? []
    for (const childId of childIds) {
      if (seen.has(childId)) continue
      ids.push(childId)
      const next = new Set(seen)
      next.add(childId)
      visit(childId, next)
    }
  }
  visit(codeId, new Set<string>())
  return ids
}

type DeleteCodeInput = {
  codes: Code[]
  excerpts: Excerpt[]
  memos: Memo[]
  codeId: string
}

type DeleteCodeResult = {
  codes: Code[]
  excerpts: Excerpt[]
  memos: Memo[]
}

/**
 * Delete a code from the codebook.
 *
 * - Children of the deleted code are re-parented to its parent (one level up).
 * - The codeId is removed from every excerpt's codeIds. Excerpts that lose
 *   their last code are dropped (they were only that code's reference).
 * - Memos linked to this code are dropped.
 * - If the deletion would empty the codebook, returns the inputs unchanged
 *   (callers expect at least one code in the codebook).
 */
export function deleteCode({ codes, excerpts, memos, codeId }: DeleteCodeInput): DeleteCodeResult {
  const target = codes.find((c) => c.id === codeId)
  if (!target) return { codes, excerpts, memos }

  const remaining = codes.filter((c) => c.id !== codeId)
  if (remaining.length === 0) return { codes, excerpts, memos }

  const nextCodes = remaining.map((c) =>
    c.parentCodeId === codeId ? { ...c, parentCodeId: target.parentCodeId } : c,
  )

  const nextExcerpts = excerpts
    .map((e) => ({ ...e, codeIds: e.codeIds.filter((id) => id !== codeId) }))
    .filter((e) => e.codeIds.length > 0)

  const nextMemos = memos.filter(
    (m) => !(m.linkedType === 'code' && m.linkedId === codeId),
  )

  return { codes: nextCodes, excerpts: nextExcerpts, memos: nextMemos }
}

type MergeCodeInput = {
  codes: Code[]
  excerpts: Excerpt[]
  memos: Memo[]
  fromCodeId: string
  intoCodeId: string
}

/**
 * Merge `fromCode` into `intoCode`.
 *
 * - Every excerpt that referenced `fromCode` now references `intoCode`
 *   (deduplicated — if it already had both, no double entry).
 * - `fromCode` is removed from the codebook. Children of `fromCode` are
 *   re-parented to `intoCode` (so the tree absorbs the merged subtree).
 * - **Memo migration** — explicit choice (and a fix to prior destructive
 *   behavior). The source code's memo is preserved:
 *     - If `intoCode` already has a memo, the source's body is appended
 *       to the target's body with a one-line marker noting the merge.
 *       The source memo row is dropped (its content lives on inside
 *       the target memo).
 *     - If `intoCode` has no memo, the source memo is retargeted in
 *       place — its `linkedId` switches to `intoCodeId`. No data lost.
 *     - If the source has no memo, no memo work happens.
 *   Researchers' notes on a soon-to-disappear code are non-trivial; the
 *   prior implementation silently deleted them on merge.
 * - Returns inputs unchanged if the merge is invalid (same id, missing
 *   source/target, or target is a descendant of source — would orphan
 *   the subtree).
 */
export function mergeCodeInto({
  codes,
  excerpts,
  memos,
  fromCodeId,
  intoCodeId,
}: MergeCodeInput): DeleteCodeResult {
  if (fromCodeId === intoCodeId) return { codes, excerpts, memos }
  const fromCode = codes.find((c) => c.id === fromCodeId)
  const intoCode = codes.find((c) => c.id === intoCodeId)
  if (!fromCode || !intoCode) return { codes, excerpts, memos }
  if (descendantCodeIds(codes, fromCodeId).includes(intoCodeId)) {
    return { codes, excerpts, memos }
  }

  const nextExcerpts = excerpts.map((e) =>
    e.codeIds.includes(fromCodeId)
      ? {
          ...e,
          codeIds: Array.from(
            new Set(e.codeIds.map((id) => (id === fromCodeId ? intoCodeId : id))),
          ),
        }
      : e,
  )

  const nextCodes = codes
    .filter((c) => c.id !== fromCodeId)
    .map((c) => (c.parentCodeId === fromCodeId ? { ...c, parentCodeId: intoCodeId } : c))

  // Memo migration — preserve source memo content.
  const sourceMemo = memos.find(
    (m) => m.linkedType === 'code' && m.linkedId === fromCodeId,
  )
  const targetMemo = memos.find(
    (m) => m.linkedType === 'code' && m.linkedId === intoCodeId,
  )

  let nextMemos: Memo[]
  if (!sourceMemo) {
    nextMemos = memos
  } else if (targetMemo) {
    // Append source body into target body with a marker.
    const marker = `\n\n— merged from "${fromCode.name}":\n`
    const mergedBody = targetMemo.body
      ? `${targetMemo.body}${marker}${sourceMemo.body}`
      : `${marker.replace(/^\n+/, '')}${sourceMemo.body}`
    nextMemos = memos
      .filter((m) => m.id !== sourceMemo.id)
      .map((m) => (m.id === targetMemo.id ? { ...m, body: mergedBody } : m))
  } else {
    // No target memo — retarget the source memo's linkedId.
    nextMemos = memos.map((m) =>
      m.id === sourceMemo.id ? { ...m, linkedId: intoCodeId } : m,
    )
  }

  return { codes: nextCodes, excerpts: nextExcerpts, memos: nextMemos }
}
