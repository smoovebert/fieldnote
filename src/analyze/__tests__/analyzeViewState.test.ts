import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_ANALYZE_VIEW,
  serialize,
  deserialize,
  clampTopN,
  type AnalyzeViewState,
} from '../analyzeViewState'

describe('DEFAULT_ANALYZE_VIEW', () => {
  it('matches the spec defaults: bar / heatmap / heatmap', () => {
    expect(DEFAULT_ANALYZE_VIEW.wordFreq.view).toBe('bar')
    expect(DEFAULT_ANALYZE_VIEW.cooccur.view).toBe('heatmap')
    expect(DEFAULT_ANALYZE_VIEW.matrix.view).toBe('heatmap')
  })

  it('uses spec topN defaults', () => {
    expect(DEFAULT_ANALYZE_VIEW.wordFreq.topN).toBe(25)
    expect(DEFAULT_ANALYZE_VIEW.cooccur.topN).toBe(30)
    expect(DEFAULT_ANALYZE_VIEW.matrix.topNRows).toBe(30)
    expect(DEFAULT_ANALYZE_VIEW.matrix.topNCols).toBe(30)
  })
})

describe('serialize / deserialize round-trip', () => {
  it('round-trips an arbitrary state', () => {
    const state: AnalyzeViewState = {
      wordFreq: { view: 'cloud', topN: 50 },
      cooccur:  { view: 'network', topN: 15 },
      matrix:   { view: 'bars', topNRows: 20, topNCols: 25 },
    }
    expect(deserialize({ analyzeView: serialize(state) })).toEqual(state)
  })
})

describe('deserialize fallbacks', () => {
  it('returns DEFAULT_ANALYZE_VIEW for undefined', () => {
    expect(deserialize(undefined)).toEqual(DEFAULT_ANALYZE_VIEW)
  })
  it('returns DEFAULT_ANALYZE_VIEW for empty object', () => {
    expect(deserialize({})).toEqual(DEFAULT_ANALYZE_VIEW)
  })
  it('returns DEFAULT_ANALYZE_VIEW for legacy query (no analyzeView key)', () => {
    expect(deserialize({ text: 'hi', codeId: 'abc' } as unknown as { analyzeView?: unknown })).toEqual(DEFAULT_ANALYZE_VIEW)
  })
  it('fills missing keys when only one analysis is present', () => {
    const result = deserialize({ analyzeView: { wordFreq: { view: 'cloud', topN: 50 } } })
    expect(result.wordFreq).toEqual({ view: 'cloud', topN: 50 })
    expect(result.cooccur).toEqual(DEFAULT_ANALYZE_VIEW.cooccur)
    expect(result.matrix).toEqual(DEFAULT_ANALYZE_VIEW.matrix)
  })
  it('falls back on malformed shape and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = deserialize({ analyzeView: 'not an object' })
    expect(result).toEqual(DEFAULT_ANALYZE_VIEW)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('falls back on invalid view enum', () => {
    const result = deserialize({ analyzeView: { wordFreq: { view: 'pie', topN: 25 } } })
    expect(result.wordFreq.view).toBe('bar') // default
  })
})

describe('clampTopN', () => {
  it('clamps below min', () => { expect(clampTopN(2, 5, 100)).toBe(5) })
  it('clamps above max', () => { expect(clampTopN(500, 5, 100)).toBe(100) })
  it('passes through valid values', () => { expect(clampTopN(42, 5, 100)).toBe(42) })
  it('handles non-finite inputs', () => { expect(clampTopN(NaN, 5, 100)).toBe(5) })
})
