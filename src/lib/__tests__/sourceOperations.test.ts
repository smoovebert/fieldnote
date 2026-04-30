import { describe, expect, it } from 'vitest'
import { deleteSource } from '../sourceOperations'
import type { Excerpt, Memo, Source } from '../types'

const src = (id: string): Source => ({
  id,
  title: id,
  kind: 'Transcript',
  folder: 'Internals',
  content: '',
})

const ex = (id: string, sourceId: string): Excerpt => ({
  id,
  sourceId,
  sourceTitle: sourceId,
  codeIds: ['c'],
  text: 'x',
  note: '',
})

const sourceMemo = (id: string, sourceId: string): Memo => ({
  id,
  title: 'memo',
  body: '',
  linkedType: 'source',
  linkedId: sourceId,
})

describe('deleteSource', () => {
  it('drops the matching source', () => {
    const result = deleteSource({
      sources: [src('a'), src('b')],
      excerpts: [],
      memos: [],
      sourceId: 'a',
    })
    expect(result.sources.map((s) => s.id)).toEqual(['b'])
  })

  it('drops every excerpt whose sourceId matched', () => {
    const result = deleteSource({
      sources: [src('a'), src('b')],
      excerpts: [ex('e1', 'a'), ex('e2', 'a'), ex('e3', 'b')],
      memos: [],
      sourceId: 'a',
    })
    expect(result.excerpts.map((e) => e.id)).toEqual(['e3'])
  })

  it('drops memos linked to this source only', () => {
    const result = deleteSource({
      sources: [src('a')],
      excerpts: [],
      memos: [
        sourceMemo('m1', 'a'),
        sourceMemo('m2', 'b'),
        { id: 'm3', title: 'project', body: '', linkedType: 'project' },
      ],
      sourceId: 'a',
    })
    expect(result.memos.map((m) => m.id).sort()).toEqual(['m2', 'm3'])
  })
})
