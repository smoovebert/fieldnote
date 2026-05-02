import type {
  Attribute, AttributeValue, Case, Code, Excerpt, Memo, QueryResultSnapshot, SavedQuery, SnapshotResults, Source,
} from '../lib/types'

export type ReportModel = {
  cover: {
    title: string
    dateIso: string
    counts: { sources: number; codes: number; references: number; cases: number }
  }
  projectMemo: string | null
  codebook: Array<{
    id: string
    name: string
    description: string
    refCount: number
    depth: 0 | 1
  }>
  sampleExcerpts: Array<{
    code: { id: string; name: string }
    codeMemo: string | null
    samples: Array<{ excerptId: string; sourceTitle: string; text: string; note: string }>
  }>
  cases: Array<{
    id: string
    name: string
    description: string
    attributes: Array<{ name: string; value: string }>
    sources: Array<{ id: string; title: string }>
  }>
  sourceMemos: Array<{ sourceId: string; sourceTitle: string; body: string }>
  // Snapshots promoted to the Report. The full computed result is
  // included so the report renderer can show the right shape per kind:
  // - coded_excerpt: a small set of sample excerpts as evidence
  // - matrix / crosstab: a counts table with labelled rows + columns
  // - frequency: a top-N word list
  // - cooccurrence: a top-N code-pair list
  snapshotMemos: Array<{
    snapshotId: string
    title: string
    capturedAtIso: string
    note: string
    activeFilters: string[]
    results: SnapshotResults
  }>
}

export type BuildReportInput = {
  projectTitle: string
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  cases: Case[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  memos: Memo[]
  // Optional with empty default — older callers (and tests) that don't
  // care about snapshot memos can omit these without breaking.
  savedQueries?: SavedQuery[]
  snapshots?: QueryResultSnapshot[]
  now?: Date
}

export type ReportIncludes = {
  projectMemo: boolean
  codebook: boolean
  sampleExcerpts: boolean
  cases: boolean
  sourceMemos: boolean
  snapshotMemos: boolean
}

export const DEFAULT_REPORT_INCLUDES: ReportIncludes = {
  projectMemo: true,
  codebook: true,
  sampleExcerpts: true,
  cases: true,
  sourceMemos: true,
  snapshotMemos: true,
}

/**
 * Apply user-selected section toggles to a built ReportModel by nulling /
 * emptying the skipped sections. Cover is always preserved.
 */
export function applyReportIncludes(model: ReportModel, includes: ReportIncludes): ReportModel {
  return {
    cover: model.cover,
    projectMemo: includes.projectMemo ? model.projectMemo : null,
    codebook: includes.codebook ? model.codebook : [],
    sampleExcerpts: includes.sampleExcerpts ? model.sampleExcerpts : [],
    cases: includes.cases ? model.cases : [],
    sourceMemos: includes.sourceMemos ? model.sourceMemos : [],
    snapshotMemos: includes.snapshotMemos ? model.snapshotMemos : [],
  }
}

const SAMPLE_CAP = 3

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildReport(input: BuildReportInput): ReportModel {
  const { projectTitle, sources, codes, excerpts, cases, attributes, attributeValues, memos } = input
  const savedQueries = input.savedQueries ?? []
  const snapshots = input.snapshots ?? []
  const dateIso = isoDate(input.now ?? new Date())

  const projectMemoBody = memos.find((m) => m.linkedType === 'project')?.body?.trim() ?? ''
  const projectMemo = projectMemoBody.length > 0 ? projectMemoBody : null

  // Codebook: top-level codes first, then their children, in order.
  const topLevel = codes.filter((c) => !c.parentCodeId)
  const childrenByParent = new Map<string, Code[]>()
  for (const c of codes) {
    if (!c.parentCodeId) continue
    const list = childrenByParent.get(c.parentCodeId) ?? []
    list.push(c)
    childrenByParent.set(c.parentCodeId, list)
  }

  const refCounts = new Map<string, number>()
  for (const e of excerpts) {
    for (const codeId of e.codeIds) {
      refCounts.set(codeId, (refCounts.get(codeId) ?? 0) + 1)
    }
  }

  const codebook: ReportModel['codebook'] = []
  for (const parent of topLevel) {
    codebook.push({
      id: parent.id,
      name: parent.name,
      description: parent.description,
      refCount: refCounts.get(parent.id) ?? 0,
      depth: 0,
    })
    for (const child of childrenByParent.get(parent.id) ?? []) {
      codebook.push({
        id: child.id,
        name: child.name,
        description: child.description,
        refCount: refCounts.get(child.id) ?? 0,
        depth: 1,
      })
    }
  }

  // Sample excerpts: only codes with at least one ref; up to SAMPLE_CAP each.
  const codeMemoByCodeId = new Map<string, string>()
  for (const m of memos) {
    if (m.linkedType === 'code' && m.linkedId && m.body.trim()) {
      codeMemoByCodeId.set(m.linkedId, m.body.trim())
    }
  }

  const sampleExcerpts: ReportModel['sampleExcerpts'] = []
  for (const c of codes) {
    const matching = excerpts.filter((e) => e.codeIds.includes(c.id))
    if (matching.length === 0) continue
    sampleExcerpts.push({
      code: { id: c.id, name: c.name },
      codeMemo: codeMemoByCodeId.get(c.id) ?? null,
      samples: matching.slice(0, SAMPLE_CAP).map((e) => ({
        excerptId: e.id,
        sourceTitle: e.sourceTitle,
        text: e.text,
        note: e.note,
      })),
    })
  }

  // Cases: lookup attributes by name.
  const attributeNameById = new Map(attributes.map((a) => [a.id, a.name]))
  const sourceById = new Map(sources.map((s) => [s.id, s]))
  const reportCases: ReportModel['cases'] = cases.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    attributes: attributeValues
      .filter((v) => v.caseId === c.id && v.value.trim().length > 0)
      .map((v) => ({
        name: attributeNameById.get(v.attributeId) ?? 'Unknown attribute',
        value: v.value,
      })),
    sources: c.sourceIds
      .map((id) => sourceById.get(id))
      .filter((s): s is Source => s !== undefined)
      .map((s) => ({ id: s.id, title: s.title })),
  }))

  // Source memos: only sources with non-empty memo body, in source order.
  const sourceMemoBySourceId = new Map<string, string>()
  for (const m of memos) {
    if (m.linkedType === 'source' && m.linkedId && m.body.trim()) {
      sourceMemoBySourceId.set(m.linkedId, m.body.trim())
    }
  }
  const sourceMemos: ReportModel['sourceMemos'] = sources
    .filter((s) => sourceMemoBySourceId.has(s.id))
    .map((s) => ({
      sourceId: s.id,
      sourceTitle: s.title,
      body: sourceMemoBySourceId.get(s.id)!,
    }))

  // Snapshots flagged for inclusion appear in the Report. Title is
  // composed from the saved-query name (for coded_excerpt snapshots) or
  // the snapshot label (for non-query panels). Order by capture time
  // descending so the most recent appears first.
  const queryNameById = new Map(savedQueries.map((q) => [q.id, q.name]))
  const snapshotMemos: ReportModel['snapshotMemos'] = snapshots
    .filter((s) => s.includeInReport)
    .slice()
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    .map((s) => {
      const queryName = s.queryId ? queryNameById.get(s.queryId) : null
      const titlePieces = [queryName, s.label].filter((piece): piece is string => Boolean(piece && piece.length > 0))
      const title = titlePieces.length > 0 ? titlePieces.join(' — ') : 'Analysis snapshot'
      // Cap each kind's payload to keep printed reports tidy. Excerpt
      // samples honor the existing SAMPLE_CAP; counts tables and lists
      // get their own modest caps below.
      let results: SnapshotResults = s.results
      if (results.kind === 'coded_excerpt') {
        results = { ...results, excerpts: results.excerpts.slice(0, SAMPLE_CAP) }
      } else if (results.kind === 'frequency') {
        results = { ...results, rows: results.rows.slice(0, 25) }
      } else if (results.kind === 'cooccurrence') {
        results = { ...results, pairs: results.pairs.slice(0, 25) }
      }
      return {
        snapshotId: s.id,
        title,
        capturedAtIso: s.capturedAt,
        note: s.note.trim(),
        activeFilters: s.activeFilters,
        results,
      }
    })

  return {
    cover: {
      title: projectTitle,
      dateIso,
      counts: {
        sources: sources.length,
        codes: codes.length,
        references: excerpts.length,
        cases: cases.length,
      },
    },
    projectMemo,
    codebook,
    sampleExcerpts,
    cases: reportCases,
    sourceMemos,
    snapshotMemos,
  }
}
