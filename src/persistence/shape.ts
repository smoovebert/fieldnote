// Pure shape functions — no React, no Supabase.
// Row-builders extracted from saveNormalizedProject's body, plus the inverse
// transforms (normalizeProject + composeProjectFromNormalized) and the
// PostgREST helper.
//
// App.tsx still has its own copies of these functions until Task 4 wires this
// module in and removes the duplicates.

import { normalizeQueryDefinition } from '../analyze/queryDefinition'
import {
  casesFromSources,
  defaultProject,
  initialAttributes,
  initialAttributeValues,
  initialSavedQueries,
  sampleTranscript,
} from '../lib/defaults'
import type {
  Attribute,
  AttributeValue,
  Case,
  Code,
  Excerpt,
  Memo,
  NormalizedAttributeRow,
  NormalizedAttributeValueRow,
  NormalizedCaseRow,
  NormalizedCaseSourceRow,
  NormalizedCodedReferenceRow,
  NormalizedCodeRow,
  NormalizedMemoRow,
  NormalizedQueryRow,
  NormalizedSegmentRow,
  NormalizedSourceRow,
  ProjectData,
  ProjectRow,
  SavedQuery,
  Source,
} from '../lib/types'

// ─── PostgREST helper ────────────────────────────────────────────────────────

export function postgrestInList(values: string[]): string {
  // PostgREST IN-list — quote each value so commas / quotes / spaces in IDs
  // can't break the filter. See https://docs.postgrest.org/en/stable/api.html#operators
  const escaped = values.map((value) =>
    `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
  )
  return `(${escaped.join(',')})`
}

// ─── Row builders ────────────────────────────────────────────────────────────

export type FolderRow = { id: string; project_id: string; name: string; kind: 'source' }

export function buildFolderRows(projectId: string, sources: Source[]): FolderRow[] {
  const folderNames = Array.from(new Set(sources.map((s) => s.folder || 'Internals')))
  return folderNames.map((folder) => ({
    id: folder.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    project_id: projectId,
    name: folder,
    kind: 'source',
  }))
}

export function buildSourceRows(projectId: string, sources: Source[]) {
  return sources.map((source) => ({
    id: source.id,
    project_id: projectId,
    title: source.title,
    kind: source.kind,
    folder_name: source.folder || 'Internals',
    content: source.content,
    archived: Boolean(source.archived),
    imported_at: source.importedAt ?? null,
    case_name: source.caseName ?? null,
  }))
}

export function buildCodeRows(projectId: string, codes: Code[]) {
  return codes.map((code) => ({
    id: code.id,
    project_id: projectId,
    parent_code_id: code.parentCodeId ?? null,
    name: code.name,
    color: code.color,
    description: code.description,
  }))
}

export function buildMemoRows(projectId: string, memos: Memo[]) {
  return memos.map((memo) => ({
    id: memo.id,
    project_id: projectId,
    title: memo.title,
    body: memo.body,
    linked_type: memo.linkedType,
    linked_id: memo.linkedId ?? null,
  }))
}

export function buildSegmentRows(projectId: string, excerpts: Excerpt[]) {
  return excerpts.map((excerpt) => ({
    id: excerpt.id,
    project_id: projectId,
    source_id: excerpt.sourceId,
    segment_type: 'text_range' as const,
    content: excerpt.text,
  }))
}

export function buildCodedReferenceRows(projectId: string, excerpts: Excerpt[]) {
  return excerpts.flatMap((excerpt) =>
    excerpt.codeIds.map((codeId) => ({
      project_id: projectId,
      segment_id: excerpt.id,
      code_id: codeId,
      source_id: excerpt.sourceId,
      note: excerpt.note,
    })),
  )
}

export function buildCaseRows(projectId: string, cases: Case[]) {
  return cases.map((c) => ({
    id: c.id,
    project_id: projectId,
    name: c.name,
    description: c.description,
  }))
}

export function buildCaseSourceRows(projectId: string, cases: Case[]) {
  return cases.flatMap((c) =>
    c.sourceIds.map((sourceId) => ({
      project_id: projectId,
      case_id: c.id,
      source_id: sourceId,
    })),
  )
}

export function buildAttributeRows(projectId: string, attributes: Attribute[]) {
  return attributes.map((a) => ({
    id: a.id,
    project_id: projectId,
    name: a.name,
    value_type: a.valueType,
  }))
}

export function buildAttributeValueRows(projectId: string, attributeValues: AttributeValue[]) {
  return attributeValues
    .filter((v) => v.value.trim())
    .map((v) => ({
      project_id: projectId,
      case_id: v.caseId,
      attribute_id: v.attributeId,
      value: v.value,
    }))
}

export function buildQueryRows(projectId: string, savedQueries: SavedQuery[]) {
  return savedQueries.map((query) => ({
    id: query.id,
    project_id: projectId,
    name: query.name,
    query_type: query.queryType,
    definition: query.definition,
  }))
}

// ─── Inverse transforms ───────────────────────────────────────────────────────

export function normalizeProject(project: ProjectRow): ProjectData {
  const fallbackSource: Source = {
    id: 'interview-03',
    title: project.source_title || 'Interview 03',
    kind: 'Transcript',
    folder: 'Internals',
    content: project.transcript || sampleTranscript,
  }
  const sources = project.sources?.length ? project.sources : [fallbackSource]
  const memos = project.memos?.length
    ? project.memos
    : [
        {
          id: 'project-memo',
          title: 'Project memo',
          linkedType: 'project' as const,
          body: project.memo || defaultProject.memos[0].body,
        },
      ]

  return {
    activeSourceId: project.active_source_id || sources[0].id,
    sources,
    cases: casesFromSources(sources),
    attributes: initialAttributes,
    attributeValues: initialAttributeValues,
    savedQueries: initialSavedQueries,
    codes: project.codes?.length ? project.codes : defaultProject.codes,
    memos,
    excerpts: (project.excerpts ?? []).map((excerpt) => ({
      ...excerpt,
      sourceId: excerpt.sourceId || sources.find((source) => source.title === excerpt.sourceTitle)?.id || sources[0].id,
    })),
  }
}

export function composeProjectFromNormalized(
  project: ProjectRow,
  sourceRows: NormalizedSourceRow[],
  codeRows: NormalizedCodeRow[],
  memoRows: NormalizedMemoRow[],
  segmentRows: NormalizedSegmentRow[],
  referenceRows: NormalizedCodedReferenceRow[],
  caseRows: NormalizedCaseRow[] = [],
  caseSourceRows: NormalizedCaseSourceRow[] = [],
  attributeRows: NormalizedAttributeRow[] = [],
  attributeValueRows: NormalizedAttributeValueRow[] = [],
  queryRows: NormalizedQueryRow[] = []
): ProjectData {
  const caseNameBySourceId = new Map<string, string>()
  const caseNameById = new Map(caseRows.map((caseRow) => [caseRow.id, caseRow.name]))
  caseSourceRows.forEach((caseSource) => {
    const caseName = caseNameById.get(caseSource.case_id)
    if (caseName) caseNameBySourceId.set(caseSource.source_id, caseName)
  })

  const sources = sourceRows.map<Source>((source) => ({
    id: source.id,
    title: source.title,
    kind: source.kind,
    folder: source.folder_name,
    content: source.content,
    archived: source.archived,
    importedAt: source.imported_at ?? undefined,
    caseName: caseNameBySourceId.get(source.id) ?? source.case_name ?? undefined,
  }))
  const caseSourceIdsByCaseId = caseSourceRows.reduce<Record<string, string[]>>((groups, caseSource) => {
    groups[caseSource.case_id] = [...(groups[caseSource.case_id] ?? []), caseSource.source_id]
    return groups
  }, {})
  const cases = caseRows.map<Case>((caseRow) => ({
    id: caseRow.id,
    name: caseRow.name,
    description: caseRow.description,
    sourceIds: caseSourceIdsByCaseId[caseRow.id] ?? [],
  }))
  const attributes = attributeRows.map<Attribute>((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    valueType: attribute.value_type,
  }))
  const attributeValues = attributeValueRows.map<AttributeValue>((attributeValue) => ({
    caseId: attributeValue.case_id,
    attributeId: attributeValue.attribute_id,
    value: attributeValue.value,
  }))
  const savedQueries = queryRows.map<SavedQuery>((query) => ({
    id: query.id,
    name: query.name,
    queryType: query.query_type,
    definition: normalizeQueryDefinition(query.definition),
  }))
  const codes = codeRows.map<Code>((code) => ({
    id: code.id,
    name: code.name,
    color: code.color,
    description: code.description,
    parentCodeId: code.parent_code_id ?? undefined,
  }))
  const memos = memoRows.map<Memo>((memo) => ({
    id: memo.id,
    title: memo.title,
    body: memo.body,
    linkedType: memo.linked_type,
    linkedId: memo.linked_id ?? undefined,
  }))
  const referencesBySegment = referenceRows.reduce<Record<string, NormalizedCodedReferenceRow[]>>((groups, reference) => {
    groups[reference.segment_id] = [...(groups[reference.segment_id] ?? []), reference]
    return groups
  }, {})
  const sourceTitleById = new Map(sources.map((source) => [source.id, source.title]))
  const excerpts = segmentRows.flatMap<Excerpt>((segment) => {
    const segmentReferences = referencesBySegment[segment.id] ?? []
    if (!segmentReferences.length) return []

    return [
      {
        id: segment.id,
        sourceId: segment.source_id,
        sourceTitle: sourceTitleById.get(segment.source_id) ?? 'Unknown source',
        text: segment.content,
        note: segmentReferences[0]?.note ?? '',
        codeIds: segmentReferences.map((reference) => reference.code_id),
      },
    ]
  })

  return {
    activeSourceId: project.active_source_id || sources[0]?.id || defaultProject.activeSourceId,
    sources: sources.length ? sources : normalizeProject(project).sources,
    cases: cases.length ? cases : casesFromSources(sources),
    attributes: attributes.length ? attributes : initialAttributes,
    attributeValues,
    savedQueries,
    codes: codes.length ? codes : normalizeProject(project).codes,
    memos: memos.length ? memos : normalizeProject(project).memos,
    excerpts,
  }
}
