// Project backup format. A single .fieldnote.json file capturing
// everything that defines a project — sources, codes, excerpts, memos,
// cases, attributes, attribute values, saved queries, plus project-
// level settings. Snapshots and AI calls are NOT included; they're
// audit/cache data that doesn't belong in a portable backup.
//
// Versioning: BACKUP_VERSION is bumped on any schema change. Importer
// validates the version and refuses unknown versions rather than
// silently mishandling them.

import type {
  Attribute,
  AttributeValue,
  Case,
  Code,
  Excerpt,
  Memo,
  ProjectData,
  ProjectRow,
  SavedQuery,
  Source,
} from './types'

export const BACKUP_VERSION = 1
export const BACKUP_MIME = 'application/json'

export type FieldnoteBackup = {
  fieldnoteBackupVersion: number
  exportedAt: string
  project: {
    title: string
    description: string
    activeSourceId: string
    lineNumberingMode: 'paragraph' | 'fixed-width'
    lineNumberingWidth: number
  }
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  memos: Memo[]
  cases: Case[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  savedQueries: SavedQuery[]
}

export type BackupInput = {
  projectRow: ProjectRow
  data: ProjectData
}

export function buildBackup(input: BackupInput): FieldnoteBackup {
  const { projectRow, data } = input
  return {
    fieldnoteBackupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      title: projectRow.title || 'Untitled project',
      description: data.description ?? '',
      activeSourceId: data.activeSourceId,
      lineNumberingMode: (projectRow.line_numbering_mode ?? 'paragraph') as 'paragraph' | 'fixed-width',
      lineNumberingWidth: projectRow.line_numbering_width ?? 80,
    },
    sources: data.sources,
    codes: data.codes,
    excerpts: data.excerpts,
    memos: data.memos,
    cases: data.cases,
    attributes: data.attributes,
    attributeValues: data.attributeValues,
    savedQueries: data.savedQueries,
  }
}

export type BackupValidation =
  | { ok: true; backup: FieldnoteBackup }
  | { ok: false; error: string }

/**
 * Validate a parsed JSON value against the FieldnoteBackup shape.
 * Returns a tagged union so callers can show a friendly message instead
 * of crashing on a malformed file.
 */
export function validateBackup(parsed: unknown): BackupValidation {
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Backup file is empty or not an object.' }
  }
  const candidate = parsed as Partial<FieldnoteBackup>
  if (typeof candidate.fieldnoteBackupVersion !== 'number') {
    return { ok: false, error: 'Backup file is missing fieldnoteBackupVersion.' }
  }
  if (candidate.fieldnoteBackupVersion !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Backup version ${candidate.fieldnoteBackupVersion} does not match the current Fieldnote version (${BACKUP_VERSION}).`,
    }
  }
  if (!candidate.project || typeof candidate.project !== 'object') {
    return { ok: false, error: 'Backup is missing the project block.' }
  }
  if (typeof candidate.project.title !== 'string') {
    return { ok: false, error: 'Backup project block is missing title.' }
  }
  for (const arrayKey of ['sources', 'codes', 'excerpts', 'memos', 'cases', 'attributes', 'attributeValues', 'savedQueries'] as const) {
    if (!Array.isArray(candidate[arrayKey])) {
      return { ok: false, error: `Backup is missing or malformed ${arrayKey}.` }
    }
  }
  return { ok: true, backup: candidate as FieldnoteBackup }
}

export function backupFilename(projectTitle: string): string {
  const slug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'
  const date = new Date().toISOString().slice(0, 10)
  return `fieldnote-${slug}-${date}.fieldnote.json`
}
