import { describe, expect, it } from 'vitest'
import { computeProgress, computeOntology } from '../stats'
import type { Code, Excerpt, Source } from '../../../lib/types'

const source = (id: string, overrides: Partial<Source> = {}): Source => ({
  id, title: id, kind: 'Transcript', folder: 'Internals', content: '', ...overrides,
})
const code = (id: string, overrides: Partial<Code> = {}): Code => ({
  id, name: id, color: '#000', description: '', ...overrides,
})
const excerpt = (id: string, sourceId: string, codeIds: string[]): Excerpt => ({
  id, sourceId, sourceTitle: sourceId, codeIds, text: 'x', note: '',
})

describe('computeProgress', () => {
  it('returns 0/0 for empty inputs', () => {
    expect(computeProgress({ sources: [], excerpts: [] })).toEqual({ coded: 0, total: 0 })
  })

  it('counts a source as coded when it has at least one excerpt with at least one code', () => {
    const sources = [source('s1'), source('s2')]
    const excerpts = [excerpt('e1', 's1', ['c1'])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 1, total: 2 })
  })

  it('does not count a source whose only excerpt has no codes', () => {
    const sources = [source('s1')]
    const excerpts = [excerpt('e1', 's1', [])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 0, total: 1 })
  })

  it('excludes archived sources from total and coded count', () => {
    const sources = [source('s1', { archived: true }), source('s2')]
    const excerpts = [excerpt('e1', 's1', ['c1']), excerpt('e2', 's2', ['c1'])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 1, total: 1 })
  })

  it('counts a source once even with many coded excerpts', () => {
    const sources = [source('s1')]
    const excerpts = [excerpt('e1', 's1', ['c1']), excerpt('e2', 's1', ['c2'])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 1, total: 1 })
  })
})

describe('computeOntology', () => {
  it('returns 0 codes / 0 themes for empty input', () => {
    expect(computeOntology([])).toEqual({ codes: 0, themes: 0 })
  })

  it('counts top-level codes (no parentCodeId) as themes', () => {
    const codes = [code('c1'), code('c2'), code('c3', { parentCodeId: 'c1' })]
    expect(computeOntology(codes)).toEqual({ codes: 3, themes: 2 })
  })

  it('treats a parentCodeId pointing to a missing code as a theme', () => {
    const codes = [code('c1', { parentCodeId: 'missing' })]
    expect(computeOntology(codes)).toEqual({ codes: 1, themes: 1 })
  })
})
