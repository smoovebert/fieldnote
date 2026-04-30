import type { Code, Excerpt, Source } from '../../lib/types'

export function computeProgress(input: {
  sources: Source[]
  excerpts: Excerpt[]
}): { coded: number; total: number } {
  const liveSources = input.sources.filter((s) => !s.archived)
  const total = liveSources.length
  const codedSourceIds = new Set(
    input.excerpts
      .filter((e) => e.codeIds.length > 0)
      .map((e) => e.sourceId)
  )
  const coded = liveSources.filter((s) => codedSourceIds.has(s.id)).length
  return { coded, total }
}

export function computeOntology(codes: Code[]): { codes: number; themes: number } {
  const ids = new Set(codes.map((c) => c.id))
  const themes = codes.filter((c) => !c.parentCodeId || !ids.has(c.parentCodeId)).length
  return { codes: codes.length, themes }
}
