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
export type QueryResultSnapshot = {
  id: string
  projectId: string
  queryId: string
  capturedAt: string
  label: string
  resultKind: 'coded_excerpt'
  definition: QueryDefinition
  results: { excerpts: Array<{ id: string; sourceTitle: string; codeIds: string[]; text: string; note: string; sourceId: string }> }
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
