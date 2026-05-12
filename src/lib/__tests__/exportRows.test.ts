import { describe, expect, it } from 'vitest'

import { caseSheetRows, codedExcerptsRows, snapshotRows } from '../exportRows'
import type { Attribute, Case, Code, Excerpt, QueryResultSnapshot, Source } from '../types'

const source: Source = {
  id: 's1',
  title: 'Interview 1',
  kind: 'Transcript',
  folder: 'Internals',
  content: '',
}

const code: Code = {
  id: 'access',
  name: 'Access',
  color: '#000',
  description: 'Access problems',
}

const excerpt: Excerpt = {
  id: 'e1',
  codeIds: ['access'],
  sourceId: 's1',
  sourceTitle: 'Interview 1',
  text: 'hard to apply',
  note: 'strong quote',
  pageNumber: 3,
}

const caseRow: Case = {
  id: 'c1',
  name: 'Maria',
  description: 'Student',
  sourceIds: ['s1'],
}

const attribute: Attribute = { id: 'role', name: 'Role', valueType: 'text' }

describe('export row builders', () => {
  it('builds coded excerpt rows with page, case, code, and source folder context', () => {
    expect(codedExcerptsRows({
      projectTitle: 'Study',
      excerpts: [excerpt],
      sources: [source],
      cases: [caseRow],
      codes: [code],
    })).toEqual([
      ['Project', 'Source', 'Page', 'Source folder', 'Case', 'Codes', 'Code descriptions', 'Excerpt', 'Note'],
      ['Study', 'Interview 1', '3', 'Internals', 'Maria', 'Access', 'Access problems', 'hard to apply', 'strong quote'],
    ])
  })

  it('builds case sheet rows with dynamic attribute columns', () => {
    expect(caseSheetRows({
      projectTitle: 'Study',
      cases: [caseRow],
      sources: [source],
      attributes: [attribute],
      attributeValues: [{ caseId: 'c1', attributeId: 'role', value: 'Student' }],
    })).toEqual([
      ['Project', 'Case', 'Sources', 'Notes', 'Role'],
      ['Study', 'Maria', 'Interview 1', 'Student', 'Student'],
    ])
  })

  it('builds coded excerpt snapshot rows', () => {
    const snap: QueryResultSnapshot = {
      id: 'snap1',
      projectId: 'p1',
      queryId: 'q1',
      capturedAt: '2026-05-11T00:00:00.000Z',
      label: 'Before cleanup',
      note: '',
      includeInReport: false,
      activeFilters: [],
      resultKind: 'coded_excerpt',
      definition: { text: '', codeId: '', additionalCodeIds: [], caseId: '', attributes: [] },
      results: {
        kind: 'coded_excerpt',
        excerpts: [{
          id: excerpt.id,
          sourceId: excerpt.sourceId,
          sourceTitle: excerpt.sourceTitle,
          codeIds: excerpt.codeIds,
          text: excerpt.text,
          note: excerpt.note,
          pageNumber: excerpt.pageNumber,
        }],
      },
    }

    expect(snapshotRows({ projectTitle: 'Study', queryName: 'Access query', snapshot: snap, codes: [code] })).toEqual([
      ['Project', 'Saved query', 'Snapshot label', 'Captured at', 'Source', 'Page', 'Codes', 'Excerpt', 'Note'],
      ['Study', 'Access query', 'Before cleanup', '2026-05-11T00:00:00.000Z', 'Interview 1', '3', 'Access', 'hard to apply', 'strong quote'],
    ])
  })
})
