import { describe, expect, it } from 'vitest'
import { buildReport } from '../buildReport'
import type { Attribute, AttributeValue, Case, Code, Excerpt, Memo, Source } from '../../lib/types'

const FIXED_DATE = new Date('2026-04-29T12:00:00Z')

const code = (id: string, name: string, parentCodeId?: string): Code => ({
  id, name, color: '#000', description: `${name} description`, parentCodeId,
})
const excerpt = (id: string, sourceId: string, codeIds: string[], text: string): Excerpt => ({
  id, sourceId, sourceTitle: sourceId, codeIds, text, note: '',
})
const source = (id: string, title: string): Source => ({
  id, title, kind: 'Transcript', folder: 'Internals', content: '',
})

describe('buildReport', () => {
  it('renders zero counts and skipped sections for an empty project', () => {
    const m = buildReport({
      projectTitle: 'Empty',
      sources: [],
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.cover).toEqual({
      title: 'Empty',
      dateIso: '2026-04-29',
      counts: { sources: 0, codes: 0, references: 0, cases: 0 },
    })
    expect(m.projectMemo).toBe(null)
    expect(m.codebook).toEqual([])
    expect(m.sampleExcerpts).toEqual([])
    expect(m.cases).toEqual([])
    expect(m.sourceMemos).toEqual([])
  })

  it('includes the project memo body when present', () => {
    const memos: Memo[] = [
      { id: 'pm', title: 'Project memo', body: 'methodology notes', linkedType: 'project' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [],
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.projectMemo).toBe('methodology notes')
  })

  it('skips the project memo if body is empty', () => {
    const memos: Memo[] = [
      { id: 'pm', title: 'Project memo', body: '   ', linkedType: 'project' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [],
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.projectMemo).toBe(null)
  })

  it('renders the codebook with hierarchy depth 0/1', () => {
    const codes = [
      code('c1', 'Trust'),
      code('c2', 'Subtrust', 'c1'),
      code('c3', 'Risk'),
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [],
      codes,
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.codebook).toEqual([
      { id: 'c1', name: 'Trust', description: 'Trust description', refCount: 0, depth: 0 },
      { id: 'c2', name: 'Subtrust', description: 'Subtrust description', refCount: 0, depth: 1 },
      { id: 'c3', name: 'Risk', description: 'Risk description', refCount: 0, depth: 0 },
    ])
  })

  it('counts excerpt references per code', () => {
    const codes = [code('c1', 'Trust'), code('c2', 'Risk')]
    const excerpts = [
      excerpt('e1', 's1', ['c1'], 'first'),
      excerpt('e2', 's1', ['c1', 'c2'], 'second'),
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [source('s1', 'S1')],
      codes,
      excerpts,
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    const trust = m.codebook.find((c) => c.id === 'c1')
    const risk = m.codebook.find((c) => c.id === 'c2')
    expect(trust?.refCount).toBe(2)
    expect(risk?.refCount).toBe(1)
  })

  it('caps sample excerpts at 3 per code and skips codes with no references', () => {
    const codes = [code('c1', 'Trust'), code('c2', 'Empty')]
    const excerpts = Array.from({ length: 5 }, (_, i) =>
      excerpt(`e${i}`, 's1', ['c1'], `text-${i}`),
    )
    const m = buildReport({
      projectTitle: 'P',
      sources: [source('s1', 'S1')],
      codes,
      excerpts,
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.sampleExcerpts).toHaveLength(1) // only c1 (Empty has 0 refs)
    expect(m.sampleExcerpts[0].code.id).toBe('c1')
    expect(m.sampleExcerpts[0].samples).toHaveLength(3)
  })

  it('attaches the code memo to its sample-excerpts entry', () => {
    const codes = [code('c1', 'Trust')]
    const excerpts = [excerpt('e1', 's1', ['c1'], 'sample')]
    const memos: Memo[] = [
      { id: 'cm', title: 'Trust memo', body: 'evolving definition', linkedType: 'code', linkedId: 'c1' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [source('s1', 'S1')],
      codes,
      excerpts,
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.sampleExcerpts[0].codeMemo).toBe('evolving definition')
  })

  it('renders cases with attribute key/value pairs and linked sources', () => {
    const sources = [source('s1', 'S1'), source('s2', 'S2')]
    const cases: Case[] = [
      { id: 'C1', name: 'Renata', description: 'lead participant', sourceIds: ['s1', 's2'] },
    ]
    const attributes: Attribute[] = [
      { id: 'gender', name: 'Gender', valueType: 'text' },
      { id: 'cohort', name: 'Cohort', valueType: 'text' },
    ]
    const attributeValues: AttributeValue[] = [
      { caseId: 'C1', attributeId: 'gender', value: 'female' },
      { caseId: 'C1', attributeId: 'cohort', value: 'pilot' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources,
      codes: [],
      excerpts: [],
      cases,
      attributes,
      attributeValues,
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.cases).toHaveLength(1)
    const c = m.cases[0]
    expect(c.id).toBe('C1')
    expect(c.attributes).toEqual([
      { name: 'Gender', value: 'female' },
      { name: 'Cohort', value: 'pilot' },
    ])
    expect(c.sources.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('renders source memos only for sources with non-empty memo bodies', () => {
    const sources = [source('s1', 'S1'), source('s2', 'S2'), source('s3', 'S3')]
    const memos: Memo[] = [
      { id: 'm1', title: '', body: 'first source notes', linkedType: 'source', linkedId: 's1' },
      { id: 'm2', title: '', body: '   ', linkedType: 'source', linkedId: 's2' },
      { id: 'm3', title: '', body: 'third source notes', linkedType: 'source', linkedId: 's3' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources,
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.sourceMemos.map((sm) => sm.sourceId)).toEqual(['s1', 's3'])
    expect(m.sourceMemos[0].body).toBe('first source notes')
  })

  it('produces correct cover stat counts', () => {
    const sources = [source('s1', 'S1')]
    const codes = [code('c1', 'Trust')]
    const excerpts = [excerpt('e1', 's1', ['c1'], 'x'), excerpt('e2', 's1', ['c1'], 'y')]
    const cases: Case[] = [{ id: 'C1', name: 'C', description: '', sourceIds: ['s1'] }]
    const m = buildReport({
      projectTitle: 'P',
      sources,
      codes,
      excerpts,
      cases,
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.cover.counts).toEqual({ sources: 1, codes: 1, references: 2, cases: 1 })
  })
})
