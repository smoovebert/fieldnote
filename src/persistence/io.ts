// Async Supabase I/O layer — no React.
// loadProject wraps loadProjectData from App.tsx.
// saveProject wraps the autosave save path from App.tsx.
// The Supabase client is injected as a parameter so this module is
// portable and testable in isolation.
//
// App.tsx still has its own inline copies of these functions until Task 4
// wires this module in and removes the duplicates.

import type { SupabaseClient } from '@supabase/supabase-js'
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
import {
  buildAttributeRows,
  buildAttributeValueRows,
  buildCaseRows,
  buildCaseSourceRows,
  buildCodeRows,
  buildCodedReferenceRows,
  buildFolderRows,
  buildMemoRows,
  buildQueryRows,
  buildSegmentRows,
  buildSourceRows,
  composeProjectFromNormalized,
  normalizeProject,
  postgrestInList,
} from './shape'

export type SavePayload = {
  title: string
  active_source_id: string
  source_title: string
  transcript: string
  memo: string
  sources: Source[]
  codes: Code[]
  memos: Memo[]
  excerpts: Excerpt[]
  cases: Case[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  savedQueries: SavedQuery[]
  line_numbering_mode: 'paragraph' | 'fixed-width'
  line_numbering_width: number
  projectData: ProjectData
}

export async function loadProject(
  project: ProjectRow,
  supabase: SupabaseClient,
): Promise<ProjectData> {
  try {
    const [
      sourceResult,
      codeResult,
      memoResult,
      segmentResult,
      referenceResult,
      caseResult,
      caseSourceResult,
      attributeResult,
      attributeValueResult,
      queryResult,
    ] = await Promise.all([
      supabase.from('fieldnote_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_codes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_memos').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_source_segments').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_coded_references').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_cases').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_case_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_attributes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_attribute_values').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_queries').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
    ])

    const normalizedError =
      sourceResult.error ??
      codeResult.error ??
      memoResult.error ??
      segmentResult.error ??
      referenceResult.error ??
      caseResult.error ??
      caseSourceResult.error ??
      attributeResult.error ??
      attributeValueResult.error ??
      queryResult.error
    if (normalizedError) throw normalizedError

    const normalizedSources = (sourceResult.data ?? []) as NormalizedSourceRow[]
    const normalizedCodes = (codeResult.data ?? []) as NormalizedCodeRow[]
    const normalizedMemos = (memoResult.data ?? []) as NormalizedMemoRow[]
    const normalizedSegments = (segmentResult.data ?? []) as NormalizedSegmentRow[]
    const normalizedReferences = (referenceResult.data ?? []) as NormalizedCodedReferenceRow[]
    const normalizedCases = (caseResult.data ?? []) as NormalizedCaseRow[]
    const normalizedCaseSources = (caseSourceResult.data ?? []) as NormalizedCaseSourceRow[]
    const normalizedAttributes = (attributeResult.data ?? []) as NormalizedAttributeRow[]
    const normalizedAttributeValues = (attributeValueResult.data ?? []) as NormalizedAttributeValueRow[]
    const normalizedQueries = (queryResult.data ?? []) as NormalizedQueryRow[]

    if (
      normalizedSources.length ||
      normalizedCodes.length ||
      normalizedMemos.length ||
      normalizedSegments.length ||
      normalizedReferences.length ||
      normalizedCases.length ||
      normalizedAttributes.length ||
      normalizedQueries.length
    ) {
      return composeProjectFromNormalized(
        project,
        normalizedSources,
        normalizedCodes,
        normalizedMemos,
        normalizedSegments,
        normalizedReferences,
        normalizedCases,
        normalizedCaseSources,
        normalizedAttributes,
        normalizedAttributeValues,
        normalizedQueries,
      )
    }
  } catch (error) {
    console.warn('Falling back to project JSON data.', error)
  }

  return normalizeProject(project)
}

export async function saveProject(
  projectId: string,
  payload: SavePayload,
  supabase: SupabaseClient,
): Promise<void> {
  const { error: jsonError } = await supabase
    .from('fieldnote_projects')
    .update({
      active_source_id: payload.active_source_id,
      title: payload.title,
      source_title: payload.source_title,
      transcript: payload.transcript,
      memo: payload.memo,
      sources: payload.sources,
      codes: payload.codes,
      memos: payload.memos,
      excerpts: payload.excerpts,
      line_numbering_mode: payload.line_numbering_mode,
      line_numbering_width: payload.line_numbering_width,
    })
    .eq('id', projectId)
  if (jsonError) throw jsonError

  try {
    await saveNormalizedTables(projectId, payload.projectData, supabase)
  } catch (normalizedError) {
    console.warn('Project JSON saved, but normalized save failed.', normalizedError)
  }
}

async function saveNormalizedTables(
  projectId: string,
  data: ProjectData,
  supabase: SupabaseClient,
): Promise<void> {
  const folderRows = buildFolderRows(projectId, data.sources)
  const sourceRows = buildSourceRows(projectId, data.sources)
  const caseRows = buildCaseRows(projectId, data.cases)
  const caseSourceRows = buildCaseSourceRows(projectId, data.cases)
  const attributeRows = buildAttributeRows(projectId, data.attributes)
  const attributeValueRows = buildAttributeValueRows(projectId, data.attributeValues)
  const queryRows = buildQueryRows(projectId, data.savedQueries)
  const codeRows = buildCodeRows(projectId, data.codes)
  const memoRows = buildMemoRows(projectId, data.memos)
  const segmentRows = buildSegmentRows(projectId, data.excerpts)
  const referenceRows = buildCodedReferenceRows(projectId, data.excerpts)

  const upserts = [
    folderRows.length ? supabase.from('fieldnote_folders').upsert(folderRows, { onConflict: 'project_id,id' }) : undefined,
    sourceRows.length ? supabase.from('fieldnote_sources').upsert(sourceRows, { onConflict: 'project_id,id' }) : undefined,
    caseRows.length ? supabase.from('fieldnote_cases').upsert(caseRows, { onConflict: 'project_id,id' }) : undefined,
    attributeRows.length ? supabase.from('fieldnote_attributes').upsert(attributeRows, { onConflict: 'project_id,id' }) : undefined,
    queryRows.length ? supabase.from('fieldnote_queries').upsert(queryRows, { onConflict: 'project_id,id' }) : undefined,
    codeRows.length ? supabase.from('fieldnote_codes').upsert(codeRows, { onConflict: 'project_id,id' }) : undefined,
    memoRows.length ? supabase.from('fieldnote_memos').upsert(memoRows, { onConflict: 'project_id,id' }) : undefined,
    segmentRows.length ? supabase.from('fieldnote_source_segments').upsert(segmentRows, { onConflict: 'project_id,id' }) : undefined,
  ].filter(Boolean)

  const upsertResults = await Promise.all(upserts)
  const upsertError = upsertResults.find((result) => result?.error)?.error
  if (upsertError) throw upsertError

  const existingSourceIds = data.sources.map((source) => source.id)
  const existingCaseIds = data.cases.map((item) => item.id)
  const existingAttributeIds = data.attributes.map((attribute) => attribute.id)
  const existingQueryIds = data.savedQueries.map((query) => query.id)
  const existingCodeIds = data.codes.map((code) => code.id)
  const existingMemoIds = data.memos.map((memo) => memo.id)
  const existingSegmentIds = data.excerpts.map((excerpt) => excerpt.id)

  const { error: caseSourcesDeleteError } = await supabase.from('fieldnote_case_sources').delete().eq('project_id', projectId)
  if (caseSourcesDeleteError) throw caseSourcesDeleteError
  if (caseSourceRows.length) {
    const { error: caseSourcesInsertError } = await supabase.from('fieldnote_case_sources').insert(caseSourceRows)
    if (caseSourcesInsertError) throw caseSourcesInsertError
  }

  const { error: attributeValuesDeleteError } = await supabase.from('fieldnote_attribute_values').delete().eq('project_id', projectId)
  if (attributeValuesDeleteError) throw attributeValuesDeleteError
  if (attributeValueRows.length) {
    const { error: attributeValuesInsertError } = await supabase.from('fieldnote_attribute_values').insert(attributeValueRows)
    if (attributeValuesInsertError) throw attributeValuesInsertError
  }

  await Promise.all([
    existingSourceIds.length
      ? supabase.from('fieldnote_sources').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingSourceIds))
      : supabase.from('fieldnote_sources').delete().eq('project_id', projectId),
    existingCaseIds.length
      ? supabase.from('fieldnote_cases').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingCaseIds))
      : supabase.from('fieldnote_cases').delete().eq('project_id', projectId),
    existingAttributeIds.length
      ? supabase.from('fieldnote_attributes').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingAttributeIds))
      : supabase.from('fieldnote_attributes').delete().eq('project_id', projectId),
    existingQueryIds.length
      ? supabase.from('fieldnote_queries').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingQueryIds))
      : supabase.from('fieldnote_queries').delete().eq('project_id', projectId),
    existingCodeIds.length
      ? supabase.from('fieldnote_codes').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingCodeIds))
      : supabase.from('fieldnote_codes').delete().eq('project_id', projectId),
    existingMemoIds.length
      ? supabase.from('fieldnote_memos').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingMemoIds))
      : supabase.from('fieldnote_memos').delete().eq('project_id', projectId),
    existingSegmentIds.length
      ? supabase.from('fieldnote_source_segments').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingSegmentIds))
      : supabase.from('fieldnote_source_segments').delete().eq('project_id', projectId),
  ])

  const { error: referencesDeleteError } = await supabase.from('fieldnote_coded_references').delete().eq('project_id', projectId)
  if (referencesDeleteError) throw referencesDeleteError
  if (referenceRows.length) {
    const { error: referencesInsertError } = await supabase.from('fieldnote_coded_references').insert(referenceRows)
    if (referencesInsertError) throw referencesInsertError
  }
}
