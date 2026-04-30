import { describe, expect, it } from 'vitest'
import { deleteCase } from '../caseOperations'
import type { AttributeValue, Case, Source } from '../types'

const c = (id: string, sourceIds: string[]): Case => ({
  id,
  name: id,
  description: '',
  sourceIds,
})

const av = (caseId: string, attributeId: string, value: string): AttributeValue => ({
  caseId,
  attributeId,
  value,
})

const src = (id: string, caseName = ''): Source => ({
  id,
  title: id,
  kind: 'Transcript',
  folder: 'Internals',
  content: '',
  caseName,
})

describe('deleteCase', () => {
  it('removes the case from the cases collection', () => {
    const result = deleteCase({
      cases: [c('A', []), c('B', [])],
      attributeValues: [],
      sources: [],
      caseId: 'A',
    })
    expect(result.cases.map((x) => x.id)).toEqual(['B'])
  })

  it('drops attribute values for the deleted case', () => {
    const result = deleteCase({
      cases: [c('A', [])],
      attributeValues: [av('A', 'attr1', 'x'), av('B', 'attr1', 'y')],
      sources: [],
      caseId: 'A',
    })
    expect(result.attributeValues).toEqual([av('B', 'attr1', 'y')])
  })

  it('clears caseName on linked sources', () => {
    const result = deleteCase({
      cases: [c('A', ['s1', 's2'])],
      attributeValues: [],
      sources: [src('s1', 'A'), src('s2', 'A'), src('s3', 'B')],
      caseId: 'A',
    })
    expect(result.sources.find((s) => s.id === 's1')?.caseName).toBe('')
    expect(result.sources.find((s) => s.id === 's2')?.caseName).toBe('')
    expect(result.sources.find((s) => s.id === 's3')?.caseName).toBe('B')
  })

  it('returns inputs unchanged when caseId missing', () => {
    const cases = [c('A', [])]
    const sources = [src('s1', 'A')]
    const result = deleteCase({
      cases,
      attributeValues: [],
      sources,
      caseId: 'missing',
    })
    expect(result.cases).toBe(cases)
    expect(result.sources).toBe(sources)
  })
})
