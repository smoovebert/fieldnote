import { describe, expect, it } from 'vitest'
import {
  deleteExcerpt,
  removeCodeFromExcerpt,
  splitExcerpt,
} from '../excerptOperations'
import type { Excerpt } from '../types'

const ex = (id: string, text: string, codeIds: string[]): Excerpt => ({
  id,
  text,
  codeIds,
  sourceId: 's',
  sourceTitle: 's',
  note: '',
})

describe('deleteExcerpt', () => {
  it('removes the matching excerpt', () => {
    const list = [ex('a', 'x', ['c']), ex('b', 'y', ['c'])]
    expect(deleteExcerpt(list, 'a').map((e) => e.id)).toEqual(['b'])
  })

  it('returns the same content when id missing', () => {
    const list = [ex('a', 'x', ['c'])]
    expect(deleteExcerpt(list, 'missing')).toEqual(list)
  })
})

describe('removeCodeFromExcerpt', () => {
  it('strips the codeId from the matching excerpt', () => {
    const list = [ex('a', 'x', ['c1', 'c2'])]
    const result = removeCodeFromExcerpt({ excerpts: list, excerptId: 'a', codeId: 'c1' })
    expect(result[0].codeIds).toEqual(['c2'])
  })

  it('drops the excerpt entirely when its last code is removed', () => {
    const list = [ex('a', 'x', ['c1'])]
    const result = removeCodeFromExcerpt({ excerpts: list, excerptId: 'a', codeId: 'c1' })
    expect(result).toEqual([])
  })

  it('leaves other excerpts untouched', () => {
    const list = [ex('a', 'x', ['c1', 'c2']), ex('b', 'y', ['c1'])]
    const result = removeCodeFromExcerpt({ excerpts: list, excerptId: 'a', codeId: 'c1' })
    expect(result.find((e) => e.id === 'b')?.codeIds).toEqual(['c1'])
  })
})

describe('splitExcerpt', () => {
  it('extracts the selected text into a new excerpt with the same codes', () => {
    const list = [ex('a', 'one two three', ['c1', 'c2'])]
    const result = splitExcerpt({
      excerpts: list,
      excerptId: 'a',
      selectedText: 'two',
      newExcerptId: 'NEW',
    })
    if (!result.ok) throw new Error('expected ok')
    const original = result.excerpts.find((e) => e.id === 'a')
    const created = result.excerpts.find((e) => e.id === 'NEW')
    expect(original?.text).toBe('one three')
    expect(created?.text).toBe('two')
    expect(created?.codeIds).toEqual(['c1', 'c2'])
  })

  it('clears the new excerpt\'s note', () => {
    const list = [{ ...ex('a', 'one two', ['c']), note: 'original note' }]
    const result = splitExcerpt({
      excerpts: list,
      excerptId: 'a',
      selectedText: 'two',
      newExcerptId: 'NEW',
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.excerpts.find((e) => e.id === 'a')?.note).toBe('original note')
    expect(result.excerpts.find((e) => e.id === 'NEW')?.note).toBe('')
  })

  it('fails with not-found when excerptId is missing', () => {
    const result = splitExcerpt({
      excerpts: [],
      excerptId: 'missing',
      selectedText: 'x',
      newExcerptId: 'NEW',
    })
    expect(result).toEqual({ ok: false, reason: 'not-found' })
  })

  it('fails with selection-not-in-text when text isn\'t a substring', () => {
    const result = splitExcerpt({
      excerpts: [ex('a', 'hello world', ['c'])],
      excerptId: 'a',
      selectedText: 'goodbye',
      newExcerptId: 'NEW',
    })
    expect(result).toEqual({ ok: false, reason: 'selection-not-in-text' })
  })

  it('fails with selection-not-in-text when selection is whitespace only', () => {
    const result = splitExcerpt({
      excerpts: [ex('a', 'hello world', ['c'])],
      excerptId: 'a',
      selectedText: '   ',
      newExcerptId: 'NEW',
    })
    expect(result).toEqual({ ok: false, reason: 'selection-not-in-text' })
  })

  it('fails with selection-is-whole-text when split would leave nothing', () => {
    const result = splitExcerpt({
      excerpts: [ex('a', 'whole', ['c'])],
      excerptId: 'a',
      selectedText: 'whole',
      newExcerptId: 'NEW',
    })
    expect(result).toEqual({ ok: false, reason: 'selection-is-whole-text' })
  })

  it('joins before + after with a single space (trims whitespace boundaries)', () => {
    const list = [ex('a', 'leading middle trailing', ['c'])]
    const result = splitExcerpt({
      excerpts: list,
      excerptId: 'a',
      selectedText: 'middle',
      newExcerptId: 'NEW',
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.excerpts.find((e) => e.id === 'a')?.text).toBe('leading trailing')
  })
})
