import { describe, expect, it } from 'vitest'

import {
  buildCoOccurrenceRows,
  buildMatrixColumns,
  buildMatrixResults,
  buildWordFrequencyRows,
  coOccurrenceRowsToPairs,
  filterAnalyzeExcerpts,
  matchingCasesForExcerpts,
} from '../derivedResults'
import type { Attribute, AttributeValue, Case, Code, Excerpt, Source } from '../../lib/types'

const codes: Code[] = [
  { id: 'access', name: 'Access', color: '#111', description: 'Access problems' },
  { id: 'trust', name: 'Trust', color: '#222', description: 'Trust and safety' },
  { id: 'identity', name: 'Identity', color: '#333', description: 'Identity work' },
]

const sources: Source[] = [
  { id: 's1', title: 'Interview 1', kind: 'Transcript', folder: 'Internals', content: '' },
  { id: 's2', title: 'Interview 2', kind: 'Transcript', folder: 'Externals', content: '' },
]

const cases: Case[] = [
  { id: 'case-maria', name: 'Maria', description: 'Student participant', sourceIds: ['s1'] },
  { id: 'case-joel', name: 'Joel', description: 'Faculty participant', sourceIds: ['s2'] },
]

const attributes: Attribute[] = [
  { id: 'role', name: 'Role', valueType: 'text' },
]

const attributeValues: AttributeValue[] = [
  { caseId: 'case-maria', attributeId: 'role', value: 'Student' },
  { caseId: 'case-joel', attributeId: 'role', value: 'Faculty' },
]

const excerpts: Excerpt[] = [
  {
    id: 'e1',
    codeIds: ['access', 'trust'],
    sourceId: 's1',
    sourceTitle: 'Interview 1',
    text: 'forms forms office trust',
    note: 'navigation problem',
  },
  {
    id: 'e2',
    codeIds: ['identity'],
    sourceId: 's2',
    sourceTitle: 'Interview 2',
    text: 'identity office',
    note: '',
  },
]

describe('derived analyze results', () => {
  it('filters excerpts by text, code, case, and attributes', () => {
    const result = filterAnalyzeExcerpts({
      excerpts,
      codes,
      sources,
      cases,
      attributeValues,
      text: 'navigation',
      codeId: 'access',
      additionalCodeIds: ['trust'],
      caseId: 'case-maria',
      attributes: [{ attributeId: 'role', value: 'Student' }],
    })

    expect(result.map((excerpt) => excerpt.id)).toEqual(['e1'])
  })

  it('returns unique matching cases for result excerpts', () => {
    expect(matchingCasesForExcerpts([excerpts[0], excerpts[0]], cases).map((item) => item.id)).toEqual(['case-maria'])
  })

  it('builds attribute matrix columns and cell counts', () => {
    const columns = buildMatrixColumns({
      mode: 'attribute',
      cases,
      activeAttribute: attributes[0],
      attributeValues,
    })
    const matrix = buildMatrixResults({
      rows: [codes[0]],
      columns,
      cases,
      excerpts,
    })

    expect(columns.map((column) => column.label)).toEqual(['Student', 'Faculty'])
    expect(matrix[0].cells.map((cell) => cell.excerpts.length)).toEqual([1, 0])
  })

  it('builds sorted word frequency rows', () => {
    expect(buildWordFrequencyRows(excerpts).slice(0, 2)).toEqual([
      { word: 'forms', count: 2, excerptCount: 1 },
      { word: 'office', count: 2, excerptCount: 2 },
    ])
  })

  it('builds code co-occurrence rows and view pairs', () => {
    const rows = buildCoOccurrenceRows(excerpts, codes)
    expect(rows).toHaveLength(1)
    expect(rows[0].codes.map((code) => code.name)).toEqual(['Access', 'Trust'])
    expect(coOccurrenceRowsToPairs(rows)).toEqual([{
      codeAId: 'access',
      codeAName: 'Access',
      codeBId: 'trust',
      codeBName: 'Trust',
      count: 1,
      sampleExcerpt: 'forms forms office trust',
    }])
  })
})
