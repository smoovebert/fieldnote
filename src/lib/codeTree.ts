import type { Code } from './types'

// Topologically order the codebook for display. Children appear under their
// parent in alphabetical order, with a depth marker for indentation. Codes
// whose parentCodeId points to a missing/deleted parent are reattached to
// root, so an orphaned subtree can never disappear from the UI.
export function buildCodeTree(codes: Code[]): Array<Code & { depth: number }> {
  const byParent = new Map<string, Code[]>()
  codes.forEach((code) => {
    const parentId = code.parentCodeId && codes.some((item) => item.id === code.parentCodeId) ? code.parentCodeId : 'root'
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), code])
  })

  const ordered: Array<Code & { depth: number }> = []
  const visit = (parentId: string, depth: number, seen: Set<string>) => {
    const children = [...(byParent.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    children.forEach((code) => {
      if (seen.has(code.id)) return
      const nextSeen = new Set(seen).add(code.id)
      ordered.push({ ...code, depth })
      visit(code.id, depth + 1, nextSeen)
    })
  }

  visit('root', 0, new Set())
  // Defensive: any code missed by the visit (e.g., a cycle) gets appended.
  codes.forEach((code) => {
    if (!ordered.some((item) => item.id === code.id)) ordered.push({ ...code, depth: 0 })
  })

  return ordered
}
