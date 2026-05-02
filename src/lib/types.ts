// Shared domain types used by the destructive-op modules and consumed back
// into App.tsx. Extracting them out of App.tsx is the prerequisite for the
// pure-function refactor — keeps lib/ free of React imports.

import type { QueryDefinition } from '../analyze/queryDefinition'
export type { QueryDefinition }

export type Code = {
  id: string
  name: string
  color: string
  description: string
  parentCodeId?: string
}

export type Source = {
  id: string
  title: string
  kind: 'Transcript' | 'Document'
  folder: string
  content: string
  archived?: boolean
  importedAt?: string
  caseName?: string
}

export type Case = {
  id: string
  name: string
  description: string
  sourceIds: string[]
}

export type Attribute = {
  id: string
  name: string
  valueType: 'text'
}

export type AttributeValue = {
  caseId: string
  attributeId: string
  value: string
}

export type Memo = {
  id: string
  title: string
  body: string
  linkedType: 'project' | 'source' | 'code'
  linkedId?: string
}

export type Excerpt = {
  id: string
  codeIds: string[]
  sourceId: string
  sourceTitle: string
  text: string
  note: string
}

export type SavedQuery = {
  id: string
  name: string
  queryType: 'coded_excerpt'
  definition: QueryDefinition
}

/**
 * A point-in-time capture of a saved query's coded-excerpt result list.
 * `results` payload shape (v1, result_kind = 'coded_excerpt'):
 *   { excerpts: Array<{ id: string; sourceTitle: string; codeIds: string[]; text: string; note: string; sourceId: string }> }
 */
// Panel kinds that can be snapshotted. coded_excerpt covers the
// Find-excerpts panel (the original snapshot path); the rest cover
// the Compare / Language / Relationships panels.
export type AnalysisSnapshotKind =
  | 'coded_excerpt'
  | 'matrix'
  | 'frequency'
  | 'cooccurrence'
  | 'crosstab'

// Computed numeric result captured at snapshot time. Discriminated by
// `kind` so the report renderer and the inspector know how to display
// it without re-deriving from the current project state (which would
// drift over time and defeat the snapshot).
export type SnapshotExcerpt = { id: string; sourceTitle: string; codeIds: string[]; text: string; note: string; sourceId: string }
export type SnapshotResults =
  | { kind: 'coded_excerpt'; excerpts: SnapshotExcerpt[] }
  | { kind: 'matrix'; columnMode: 'case' | 'attribute'; attributeName: string | null; colLabels: string[]; rows: Array<{ codeName: string; counts: number[] }> }
  | { kind: 'frequency'; topN: number; rows: Array<{ word: string; count: number; excerptCount: number }> }
  | { kind: 'cooccurrence'; topN: number; pairs: Array<{ codeAName: string; codeBName: string; count: number }> }
  | { kind: 'crosstab'; attr1Name: string; attr2Name: string; percentMode: 'count' | 'row' | 'col'; colLabels: string[]; rows: Array<{ codeName: string; counts: number[] }> }

export type QueryResultSnapshot = {
  id: string
  projectId: string
  // Null for non-coded_excerpt panels — those analyses aren't tied to
  // a saved query. Coded_excerpt snapshots still require a saved query
  // (otherwise there's nothing to re-derive on view).
  queryId: string | null
  capturedAt: string
  label: string
  // Free-form interpretation memo attached to the snapshot — the researcher's
  // "at this stage, this is how I understood the theme" note. Empty when the
  // snapshot has just been pinned and not yet annotated.
  note: string
  // When true, the snapshot is included in the Report's "Analysis
  // snapshots" section regardless of whether it has a note. Set by the
  // "Send to report" action; togglable per-row from the inspector.
  includeInReport: boolean
  // Filter scope at capture time — used as a contextual sentence in
  // the inspector and report. We store the human-readable strings
  // directly so they survive code/case/attribute renames or deletes.
  activeFilters: string[]
  resultKind: AnalysisSnapshotKind
  // Filter definition used by Find-excerpts to re-run; empty object for
  // non-coded_excerpt panels.
  definition: QueryDefinition
  results: SnapshotResults
}

export type ProjectData = {
  activeSourceId: string
  description: string
  sources: Source[]
  cases: Case[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  savedQueries: SavedQuery[]
  codes: Code[]
  memos: Memo[]
  excerpts: Excerpt[]
}

export type ProjectRow = {
  id: string
  title: string
  description: string
  updated_at?: string | null
  active_source_id?: string | null
  sources?: Source[] | null
  source_title?: string | null
  transcript?: string | null
  memo?: string | null
  codes: Code[]
  memos?: Memo[] | null
  excerpts: Excerpt[]
  line_numbering_mode?: string | null
  line_numbering_width?: number | null
}

export type NormalizedSourceRow = {
  id: string
  project_id: string
  title: string
  kind: Source['kind']
  folder_name: string
  content: string
  archived: boolean
  imported_at?: string | null
  case_name?: string | null
}

export type NormalizedCodeRow = {
  id: string
  project_id: string
  name: string
  color: string
  description: string
  parent_code_id?: string | null
}

export type NormalizedMemoRow = {
  id: string
  project_id: string
  title: string
  body: string
  linked_type: Memo['linkedType']
  linked_id?: string | null
}

export type NormalizedSegmentRow = {
  id: string
  project_id: string
  source_id: string
  content: string
}

export type NormalizedCodedReferenceRow = {
  project_id: string
  segment_id: string
  code_id: string
  source_id: string
  note: string
}

export type NormalizedCaseRow = {
  id: string
  project_id: string
  name: string
  description: string
}

export type NormalizedCaseSourceRow = {
  project_id: string
  case_id: string
  source_id: string
}

export type NormalizedAttributeRow = {
  id: string
  project_id: string
  name: string
  value_type: Attribute['valueType']
}

export type NormalizedAttributeValueRow = {
  project_id: string
  case_id: string
  attribute_id: string
  value: string
}

export type NormalizedQueryRow = {
  id: string
  project_id: string
  name: string
  query_type: SavedQuery['queryType']
  definition: Partial<QueryDefinition> | null
}
