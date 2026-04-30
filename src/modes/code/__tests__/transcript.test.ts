import { describe, expect, it } from 'vitest'
import {
  markBackground,
  wrapHighlightedTranscript,
  type TranscriptPiece,
} from '../transcript'

const piece = (text: string, codes?: TranscriptPiece['codes']): TranscriptPiece => ({ text, codes })

describe('wrapHighlightedTranscript', () => {
  it('paragraph mode emits one line per piece, no wrapping', () => {
    const result = wrapHighlightedTranscript(
      [piece('a short line of text')],
      'paragraph',
      10, // width should be ignored in paragraph mode
    )
    // Paragraph mode does not wrap — exactly one line, containing the whole piece.
    expect(result).toHaveLength(1)
    expect(result[0].map((p) => p.text).join('')).toBe('a short line of text')
  })

  it('fixed-width below cap returns a single line', () => {
    const text = 'short line'
    const result = wrapHighlightedTranscript([piece(text)], 'fixed-width', 80)
    expect(result).toHaveLength(1)
    expect(result[0].map((p) => p.text).join('')).toBe(text)
  })

  it('fixed-width above cap wraps at a word boundary', () => {
    // Width 10. The text has clear word boundaries; wraps should occur at spaces.
    const text = 'first second third fourth'
    const result = wrapHighlightedTranscript([piece(text)], 'fixed-width', 10)
    expect(result.length).toBeGreaterThanOrEqual(2)
    // Reconstructing with single spaces between lines should reproduce the
    // original (the function drops the space at each break point).
    const reconstructed = result
      .map((line) => line.map((p) => p.text).join(''))
      .join(' ')
    expect(reconstructed).toBe(text)
  })

  it('hard-wraps a long unbreakable word', () => {
    // No spaces. The function falls back to hard-breaking to make progress.
    const text = 'unbreakablecontiguouswordmuchlongerthancap'
    const result = wrapHighlightedTranscript([piece(text)], 'fixed-width', 10)
    const reconstructed = result.map((line) => line.map((p) => p.text).join('')).join('')
    expect(reconstructed).toBe(text)
    expect(result.length).toBeGreaterThan(1)
  })

  it('preserves code attributions across line breaks', () => {
    const codes = [{ id: 'c1', color: '#000', name: 'C1' }]
    const result = wrapHighlightedTranscript(
      [piece('first second third fourth fifth', codes)],
      'fixed-width',
      10,
    )
    // Every text-bearing piece in every line should still carry the codes.
    for (const line of result) {
      for (const p of line) {
        if (p.text.length > 0) {
          expect(p.codes).toEqual(codes)
        }
      }
    }
  })

  it('paragraph splits on \\n produce one line per paragraph', () => {
    const result = wrapHighlightedTranscript(
      [piece('first paragraph\nsecond paragraph\nthird')],
      'paragraph',
      80,
    )
    expect(result).toHaveLength(3)
    expect(result[0][0].text).toBe('first paragraph')
    expect(result[1][0].text).toBe('second paragraph')
    expect(result[2][0].text).toBe('third')
  })
})

describe('markBackground', () => {
  it('returns empty object for no codes', () => {
    expect(markBackground([])).toEqual({})
  })

  it('returns a single color-mix background for one code', () => {
    const result = markBackground([{ color: '#ff0000' }])
    expect(typeof result.background).toBe('string')
    expect(result.background).toContain('#ff0000')
    expect(result.background).toContain('color-mix')
    expect(result.background).not.toContain('linear-gradient')
  })

  it('returns a linear-gradient with N stops for N codes', () => {
    const result = markBackground([{ color: '#ff0000' }, { color: '#00ff00' }])
    expect(typeof result.background).toBe('string')
    expect(result.background).toContain('linear-gradient')
    expect(result.background).toContain('#ff0000')
    expect(result.background).toContain('#00ff00')
  })
})
