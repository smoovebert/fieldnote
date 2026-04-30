import { describe, expect, it } from 'vitest'
import { deleteCode, descendantCodeIds, mergeCodeInto } from '../codeOperations'
import type { Code, Excerpt, Memo } from '../types'

const code = (id: string, parentCodeId?: string): Code => ({
  id,
  name: id,
  color: '#000',
  description: '',
  parentCodeId,
})

const excerpt = (id: string, sourceId: string, codeIds: string[], text = 'x'): Excerpt => ({
  id,
  sourceId,
  sourceTitle: sourceId,
  codeIds,
  text,
  note: '',
})

const codeMemo = (id: string, codeId: string): Memo => ({
  id,
  title: 'memo',
  body: 'note',
  linkedType: 'code',
  linkedId: codeId,
})

describe('descendantCodeIds', () => {
  it('returns [] for a leaf code', () => {
    expect(descendantCodeIds([code('a'), code('b')], 'a')).toEqual([])
  })

  it('returns direct children + grandchildren in DFS order', () => {
    const codes = [
      code('a'),
      code('b', 'a'),
      code('c', 'a'),
      code('d', 'b'),
    ]
    expect(descendantCodeIds(codes, 'a')).toEqual(['b', 'd', 'c'])
  })

  it('does not loop on cycles', () => {
    // synthetic cycle: a→b→a
    const codes = [code('a', 'b'), code('b', 'a')]
    const result = descendantCodeIds(codes, 'a')
    // Just assert it terminates with a finite list; specific contents are
    // deterministic but the goal is no infinite recursion.
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeLessThan(10)
  })
})

describe('deleteCode', () => {
  it('removes the code from the codebook', () => {
    const result = deleteCode({
      codes: [code('a'), code('b')],
      excerpts: [],
      memos: [],
      codeId: 'a',
    })
    expect(result.codes.map((c) => c.id)).toEqual(['b'])
  })

  it('re-parents children to the deleted code\'s parent', () => {
    const result = deleteCode({
      codes: [code('root'), code('parent', 'root'), code('child', 'parent'), code('keeper')],
      excerpts: [],
      memos: [],
      codeId: 'parent',
    })
    expect(result.codes.find((c) => c.id === 'child')?.parentCodeId).toBe('root')
  })

  it('re-parents to undefined when the deleted code was a top-level', () => {
    const result = deleteCode({
      codes: [code('top'), code('child', 'top'), code('keeper')],
      excerpts: [],
      memos: [],
      codeId: 'top',
    })
    expect(result.codes.find((c) => c.id === 'child')?.parentCodeId).toBeUndefined()
  })

  it('strips the codeId from every excerpt that referenced it', () => {
    const result = deleteCode({
      codes: [code('a'), code('b')],
      excerpts: [excerpt('e1', 's', ['a', 'b']), excerpt('e2', 's', ['b'])],
      memos: [],
      codeId: 'a',
    })
    expect(result.excerpts.find((e) => e.id === 'e1')?.codeIds).toEqual(['b'])
    expect(result.excerpts.find((e) => e.id === 'e2')?.codeIds).toEqual(['b'])
  })

  it('drops excerpts that lose their last code', () => {
    const result = deleteCode({
      codes: [code('a'), code('b')],
      excerpts: [excerpt('e1', 's', ['a'])],
      memos: [],
      codeId: 'a',
    })
    expect(result.excerpts).toEqual([])
  })

  it('drops memos linked to the deleted code', () => {
    const result = deleteCode({
      codes: [code('a'), code('b')],
      excerpts: [],
      memos: [codeMemo('m1', 'a'), codeMemo('m2', 'b')],
      codeId: 'a',
    })
    expect(result.memos.map((m) => m.id)).toEqual(['m2'])
  })

  it('returns inputs unchanged if deleting would empty the codebook', () => {
    const codes = [code('only')]
    const result = deleteCode({ codes, excerpts: [], memos: [], codeId: 'only' })
    expect(result.codes).toBe(codes)
  })

  it('returns inputs unchanged if codeId not present', () => {
    const codes = [code('a')]
    const result = deleteCode({ codes, excerpts: [], memos: [], codeId: 'missing' })
    expect(result.codes).toBe(codes)
  })
})

describe('mergeCodeInto', () => {
  it('moves all excerpt references from from→into', () => {
    const result = mergeCodeInto({
      codes: [code('from'), code('into')],
      excerpts: [excerpt('e1', 's', ['from']), excerpt('e2', 's', ['from', 'other'])],
      memos: [],
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    expect(result.excerpts.find((e) => e.id === 'e1')?.codeIds).toEqual(['into'])
    expect(result.excerpts.find((e) => e.id === 'e2')?.codeIds.sort()).toEqual(['into', 'other'])
  })

  it('dedupes when an excerpt already had both codes', () => {
    const result = mergeCodeInto({
      codes: [code('from'), code('into')],
      excerpts: [excerpt('e1', 's', ['from', 'into'])],
      memos: [],
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    expect(result.excerpts[0].codeIds).toEqual(['into'])
  })

  it('removes the from-code from the codebook', () => {
    const result = mergeCodeInto({
      codes: [code('from'), code('into')],
      excerpts: [],
      memos: [],
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    expect(result.codes.map((c) => c.id)).toEqual(['into'])
  })

  it('re-parents children of the from-code to into-code', () => {
    const result = mergeCodeInto({
      codes: [code('from'), code('child', 'from'), code('into')],
      excerpts: [],
      memos: [],
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    expect(result.codes.find((c) => c.id === 'child')?.parentCodeId).toBe('into')
  })

  it('preserves source memo content by appending to target memo body', () => {
    const memos: Memo[] = [
      { id: 'src', title: 't', body: 'translation barriers', linkedType: 'code', linkedId: 'from' },
      { id: 'tgt', title: 't', body: 'access friction', linkedType: 'code', linkedId: 'into' },
    ]
    const result = mergeCodeInto({
      codes: [code('from'), code('into')],
      excerpts: [],
      memos,
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    // The source memo row is gone — its content lives inside the target.
    expect(result.memos.map((m) => m.id)).toEqual(['tgt'])
    expect(result.memos[0].body).toContain('access friction')
    expect(result.memos[0].body).toContain('translation barriers')
    expect(result.memos[0].body).toContain('merged from "from"')
  })

  it('retargets source memo linkedId when target has no memo', () => {
    const memos: Memo[] = [codeMemo('src', 'from')]
    const result = mergeCodeInto({
      codes: [code('from'), code('into')],
      excerpts: [],
      memos,
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    // No new row created; the existing row's linkedId points at the target.
    expect(result.memos).toHaveLength(1)
    expect(result.memos[0].id).toBe('src')
    expect(result.memos[0].linkedId).toBe('into')
  })

  it('does not touch memos when source has no memo', () => {
    const memos: Memo[] = [codeMemo('tgt', 'into'), codeMemo('other', 'other')]
    const result = mergeCodeInto({
      codes: [code('from'), code('into'), code('other')],
      excerpts: [],
      memos,
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    expect(result.memos).toEqual(memos)
  })

  it('formats appended body cleanly when target memo body is empty', () => {
    const memos: Memo[] = [
      { id: 'src', title: 't', body: 'source content', linkedType: 'code', linkedId: 'from' },
      { id: 'tgt', title: 't', body: '', linkedType: 'code', linkedId: 'into' },
    ]
    const result = mergeCodeInto({
      codes: [code('from'), code('into')],
      excerpts: [],
      memos,
      fromCodeId: 'from',
      intoCodeId: 'into',
    })
    // No leading newlines on an empty target body.
    expect(result.memos[0].body.startsWith('\n')).toBe(false)
    expect(result.memos[0].body).toContain('source content')
  })

  it('returns inputs unchanged on self-merge', () => {
    const codes = [code('a')]
    const excerpts = [excerpt('e', 's', ['a'])]
    const result = mergeCodeInto({
      codes,
      excerpts,
      memos: [],
      fromCodeId: 'a',
      intoCodeId: 'a',
    })
    expect(result.codes).toBe(codes)
    expect(result.excerpts).toBe(excerpts)
  })

  it('returns inputs unchanged when target is a descendant of source (would orphan subtree)', () => {
    const codes = [code('parent'), code('child', 'parent')]
    const excerpts = [excerpt('e', 's', ['parent'])]
    const result = mergeCodeInto({
      codes,
      excerpts,
      memos: [],
      fromCodeId: 'parent',
      intoCodeId: 'child',
    })
    expect(result.codes).toBe(codes)
    expect(result.excerpts).toBe(excerpts)
  })

  it('returns inputs unchanged when source or target missing', () => {
    const codes = [code('a')]
    const result = mergeCodeInto({
      codes,
      excerpts: [],
      memos: [],
      fromCodeId: 'a',
      intoCodeId: 'missing',
    })
    expect(result.codes).toBe(codes)
  })
})
