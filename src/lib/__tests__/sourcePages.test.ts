import { describe, expect, it } from 'vitest'
import { isPdfSource, parseSourcePages } from '../sourcePages'

describe('isPdfSource', () => {
  it('detects content that contains a page marker', () => {
    expect(isPdfSource('--- Page 1 ---\n\nfoo')).toBe(true)
    expect(isPdfSource('foo\n\n--- Page 2 ---\n\nbar')).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(isPdfSource('plain transcript text')).toBe(false)
    expect(isPdfSource('')).toBe(false)
  })

  it('does not match marker-shaped text inside a body', () => {
    // A line like 'see --- Page 7 ---' inside a paragraph is not a marker
    // because PAGE_MARKER requires the marker to be on its own line.
    expect(isPdfSource('this paragraph mentions --- Page 7 --- inline')).toBe(false)
  })
})

describe('parseSourcePages', () => {
  it('returns [] for empty / whitespace-only content', () => {
    expect(parseSourcePages('')).toEqual([])
    expect(parseSourcePages('   \n  ')).toEqual([])
  })

  it('returns a single synthetic page for marker-less content', () => {
    expect(parseSourcePages('hello world')).toEqual([
      { pageNumber: 1, body: 'hello world' },
    ])
  })

  it('splits a single-page PDF correctly', () => {
    const content = '--- Page 1 ---\n\nfirst page body'
    expect(parseSourcePages(content)).toEqual([
      { pageNumber: 1, body: 'first page body' },
    ])
  })

  it('splits a multi-page PDF preserving page numbers and body text', () => {
    const content = [
      '--- Page 1 ---',
      '',
      'one body',
      '',
      '--- Page 2 ---',
      '',
      'two body',
      '',
      '--- Page 3 ---',
      '',
      'three body',
    ].join('\n')
    expect(parseSourcePages(content)).toEqual([
      { pageNumber: 1, body: 'one body' },
      { pageNumber: 2, body: 'two body' },
      { pageNumber: 3, body: 'three body' },
    ])
  })

  it('honors non-sequential page numbers (e.g. PDF with offset start)', () => {
    const content = '--- Page 5 ---\n\nfive body\n\n--- Page 6 ---\n\nsix body'
    expect(parseSourcePages(content)).toEqual([
      { pageNumber: 5, body: 'five body' },
      { pageNumber: 6, body: 'six body' },
    ])
  })

  it('skips pages with empty bodies (the importer occasionally produces them)', () => {
    const content = '--- Page 1 ---\n\nreal body\n\n--- Page 2 ---\n\n\n\n--- Page 3 ---\n\nthird body'
    expect(parseSourcePages(content)).toEqual([
      { pageNumber: 1, body: 'real body' },
      { pageNumber: 3, body: 'third body' },
    ])
  })

  it('discards preamble text that precedes the first marker', () => {
    // Defensive — the PDF importer doesn't write preamble, but if a
    // future code path or hand-edit introduces one, we don't want it
    // showing up under a fake page number.
    const content = 'preamble paragraph\n\n--- Page 1 ---\n\nactual body'
    expect(parseSourcePages(content)).toEqual([
      { pageNumber: 1, body: 'actual body' },
    ])
  })
})
