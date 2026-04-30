import { describe, expect, it } from 'vitest'
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
} from '../shape'
import type {
  Attribute,
  AttributeValue,
  Case,
  Code,
  Excerpt,
  Memo,
  NormalizedCodedReferenceRow,
  NormalizedSourceRow,
  Source,
} from '../../lib/types'

const PROJECT_ID = 'p1'

const source = (id: string, overrides: Partial<Source> = {}): Source => ({
  id, title: id, kind: 'Transcript', folder: 'Internals', content: '', ...overrides,
})
const code = (id: string, overrides: Partial<Code> = {}): Code => ({
  id, name: id, color: '#000', description: '', ...overrides,
})
const excerpt = (id: string, sourceId: string, codeIds: string[], overrides: Partial<Excerpt> = {}): Excerpt => ({
  id, sourceId, sourceTitle: sourceId, codeIds, text: 'x', note: '', ...overrides,
})

// ─── postgrestInList ──────────────────────────────────────────────────────────

describe('postgrestInList', () => {
  it('quotes each value and joins with commas', () => {
    expect(postgrestInList(['a', 'b'])).toBe('("a","b")')
  })
  it('escapes embedded quotes', () => {
    expect(postgrestInList(['a"b'])).toBe('("a\\"b")')
  })
  it('escapes backslashes before quotes', () => {
    expect(postgrestInList(['a\\b'])).toBe('("a\\\\b")')
  })
  it('emits empty parens for empty input', () => {
    expect(postgrestInList([])).toBe('()')
  })
})

// ─── buildSourceRows ──────────────────────────────────────────────────────────

describe('buildSourceRows', () => {
  it('maps every source to a row stamped with project_id', () => {
    const rows = buildSourceRows(PROJECT_ID, [source('s1', { title: 'S1', folder: 'External' })])
    expect(rows).toEqual([{
      id: 's1', project_id: PROJECT_ID, title: 'S1', kind: 'Transcript',
      folder_name: 'External', content: '', archived: false,
      imported_at: null, case_name: null,
    }])
  })
  it('defaults folder_name to "Internals" when missing', () => {
    const rows = buildSourceRows(PROJECT_ID, [source('s1', { folder: '' })])
    expect(rows[0].folder_name).toBe('Internals')
  })
  it('passes through archived, importedAt, caseName', () => {
    const rows = buildSourceRows(PROJECT_ID, [source('s1', {
      archived: true, importedAt: '2026-04-30', caseName: 'Renata',
    })])
    expect(rows[0].archived).toBe(true)
    expect(rows[0].imported_at).toBe('2026-04-30')
    expect(rows[0].case_name).toBe('Renata')
  })
  it('returns empty for no sources', () => {
    expect(buildSourceRows(PROJECT_ID, [])).toEqual([])
  })
})

// ─── buildCodeRows ────────────────────────────────────────────────────────────

describe('buildCodeRows', () => {
  it('maps parentCodeId to parent_code_id (null when undefined)', () => {
    const rows = buildCodeRows(PROJECT_ID, [
      code('c1'),
      code('c2', { parentCodeId: 'c1' }),
    ])
    expect(rows[0].parent_code_id).toBe(null)
    expect(rows[1].parent_code_id).toBe('c1')
  })
})

// ─── buildMemoRows ────────────────────────────────────────────────────────────

describe('buildMemoRows', () => {
  it('maps linkedType + linkedId (null when undefined)', () => {
    const memos: Memo[] = [
      { id: 'm1', title: '', body: '', linkedType: 'project' },
      { id: 'm2', title: '', body: '', linkedType: 'source', linkedId: 's1' },
    ]
    const rows = buildMemoRows(PROJECT_ID, memos)
    expect(rows[0].linked_id).toBe(null)
    expect(rows[1].linked_id).toBe('s1')
  })
})

// ─── buildSegmentRows ─────────────────────────────────────────────────────────

describe('buildSegmentRows', () => {
  it('emits one segment per excerpt', () => {
    const rows = buildSegmentRows(PROJECT_ID, [
      excerpt('e1', 's1', ['c1'], { text: 'first' }),
      excerpt('e2', 's2', ['c2'], { text: 'second' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'e1', project_id: PROJECT_ID, source_id: 's1', segment_type: 'text_range', content: 'first',
    })
  })
})

// ─── buildCodedReferenceRows ──────────────────────────────────────────────────

describe('buildCodedReferenceRows', () => {
  it('emits one row per (excerpt, code) pair', () => {
    const rows = buildCodedReferenceRows(PROJECT_ID, [
      excerpt('e1', 's1', ['c1', 'c2'], { note: 'shared' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ segment_id: 'e1', code_id: 'c1', source_id: 's1', note: 'shared' })
    expect(rows[1]).toMatchObject({ segment_id: 'e1', code_id: 'c2', source_id: 's1', note: 'shared' })
  })
  it('skips excerpts with empty codeIds', () => {
    const rows = buildCodedReferenceRows(PROJECT_ID, [excerpt('e1', 's1', [])])
    expect(rows).toEqual([])
  })
})

// ─── buildCaseRows ────────────────────────────────────────────────────────────

describe('buildCaseRows', () => {
  it('drops sourceIds — those go to buildCaseSourceRows', () => {
    const cases: Case[] = [{ id: 'C1', name: 'Renata', description: '', sourceIds: ['s1', 's2'] }]
    const rows = buildCaseRows(PROJECT_ID, cases)
    expect(rows).toEqual([{ id: 'C1', project_id: PROJECT_ID, name: 'Renata', description: '' }])
  })
})

// ─── buildCaseSourceRows ──────────────────────────────────────────────────────

describe('buildCaseSourceRows', () => {
  it('emits one row per (case, sourceId) pair', () => {
    const cases: Case[] = [
      { id: 'C1', name: '', description: '', sourceIds: ['s1', 's2'] },
      { id: 'C2', name: '', description: '', sourceIds: ['s3'] },
    ]
    const rows = buildCaseSourceRows(PROJECT_ID, cases)
    expect(rows).toHaveLength(3)
  })
  it('emits no rows for cases with empty sourceIds', () => {
    const cases: Case[] = [{ id: 'C1', name: '', description: '', sourceIds: [] }]
    expect(buildCaseSourceRows(PROJECT_ID, cases)).toEqual([])
  })
})

// ─── buildAttributeRows ───────────────────────────────────────────────────────

describe('buildAttributeRows', () => {
  it('maps valueType to value_type', () => {
    const attrs: Attribute[] = [{ id: 'a', name: 'A', valueType: 'text' }]
    const rows = buildAttributeRows(PROJECT_ID, attrs)
    expect(rows[0].value_type).toBe('text')
  })
})

// ─── buildAttributeValueRows ──────────────────────────────────────────────────

describe('buildAttributeValueRows', () => {
  it('skips values with whitespace-only body', () => {
    const values: AttributeValue[] = [
      { caseId: 'C1', attributeId: 'a1', value: 'real' },
      { caseId: 'C1', attributeId: 'a2', value: '  ' },
      { caseId: 'C1', attributeId: 'a3', value: '' },
    ]
    const rows = buildAttributeValueRows(PROJECT_ID, values)
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe('real')
  })
})

// ─── buildFolderRows ──────────────────────────────────────────────────────────

describe('buildFolderRows', () => {
  it('emits one row per distinct folder, slugified id', () => {
    const sources = [
      source('s1', { folder: 'Internals' }),
      source('s2', { folder: 'External Memos' }),
      source('s3', { folder: 'Internals' }),
    ]
    const rows = buildFolderRows(PROJECT_ID, sources)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.name === 'Internals')?.id).toBe('internals')
    expect(rows.find((r) => r.name === 'External Memos')?.id).toBe('external-memos')
  })
  it('defaults missing folder to "Internals"', () => {
    const rows = buildFolderRows(PROJECT_ID, [source('s1', { folder: '' })])
    expect(rows[0].name).toBe('Internals')
  })
})

// ─── buildQueryRows ───────────────────────────────────────────────────────────

describe('buildQueryRows', () => {
  it('preserves definition', () => {
    const queries = [
      {
        id: 'q1', name: 'My', queryType: 'coded_excerpt' as const,
        definition: { text: '', codeId: '', caseId: '', attributes: [] },
      },
    ]
    const rows = buildQueryRows(PROJECT_ID, queries as Parameters<typeof buildQueryRows>[1])
    expect(rows[0].definition).toEqual(queries[0].definition)
  })
})

// ─── normalizeProject ─────────────────────────────────────────────────────────

describe('normalizeProject', () => {
  it('returns a usable ProjectData with empty inputs', () => {
    const project = { id: 'p', title: 'P', codes: [], excerpts: [], memos: [], sources: [] } as unknown as Parameters<typeof normalizeProject>[0]
    const data = normalizeProject(project)
    expect(data.activeSourceId).toBeTruthy()
    expect(Array.isArray(data.sources)).toBe(true)
    expect(Array.isArray(data.codes)).toBe(true)
  })
  it('passes through non-empty sources unchanged', () => {
    const sources = [source('s1', { title: 'Custom' })]
    const project = { id: 'p', title: 'P', codes: [], excerpts: [], memos: [], sources } as unknown as Parameters<typeof normalizeProject>[0]
    const data = normalizeProject(project)
    expect(data.sources).toHaveLength(1)
    expect(data.sources[0].title).toBe('Custom')
  })
  it('re-derives sourceId from sourceTitle when sourceId is missing on an excerpt', () => {
    const sources = [source('s1', { title: 'My Source' })]
    const excerpts = [excerpt('e1', '', ['c1'], { sourceTitle: 'My Source' })]
    const project = { id: 'p', title: 'P', codes: [], excerpts, memos: [], sources } as unknown as Parameters<typeof normalizeProject>[0]
    const data = normalizeProject(project)
    expect(data.excerpts[0].sourceId).toBe('s1')
  })
})

// ─── composeProjectFromNormalized ─────────────────────────────────────────────

describe('composeProjectFromNormalized', () => {
  it('returns ProjectData built from row arrays', () => {
    const project = { id: 'p', title: 'P' } as unknown as Parameters<typeof composeProjectFromNormalized>[0]
    const sourceRows: NormalizedSourceRow[] = [
      {
        id: 's1', project_id: 'p', title: 'S1', kind: 'Transcript', folder_name: 'Internals',
        content: 'hello', archived: false, imported_at: null, case_name: null,
      },
    ]
    const codeRows = [{ id: 'c1', project_id: 'p', parent_code_id: null, name: 'Trust', color: '#000', description: '' }]
    const memoRows = [{ id: 'm1', project_id: 'p', title: '', body: 'note', linked_type: 'source' as const, linked_id: 's1' }]
    const segmentRows = [{ id: 'e1', project_id: 'p', source_id: 's1', segment_type: 'text_range' as const, content: 'hello' }]
    const referenceRows: NormalizedCodedReferenceRow[] = [{ project_id: 'p', segment_id: 'e1', code_id: 'c1', source_id: 's1', note: '' }]

    const data = composeProjectFromNormalized(
      project,
      sourceRows,
      codeRows as Parameters<typeof composeProjectFromNormalized>[2],
      memoRows as Parameters<typeof composeProjectFromNormalized>[3],
      segmentRows as Parameters<typeof composeProjectFromNormalized>[4],
      referenceRows,
    )
    expect(data.sources).toHaveLength(1)
    expect(data.sources[0].title).toBe('S1')
    expect(data.codes).toHaveLength(1)
    expect(data.excerpts).toHaveLength(1)
    expect(data.excerpts[0].codeIds).toEqual(['c1'])
  })
})
