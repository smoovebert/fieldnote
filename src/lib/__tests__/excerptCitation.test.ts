import { describe, expect, it } from 'vitest'
import { formatExcerptCitation } from '../excerptCitation'

describe('formatExcerptCitation', () => {
  it('returns just the source title when pageNumber is missing', () => {
    expect(formatExcerptCitation({ sourceTitle: 'Interview 03' })).toBe('Interview 03')
  })

  it('appends ", p. N" when pageNumber is set', () => {
    expect(formatExcerptCitation({ sourceTitle: 'Interview 03', pageNumber: 5 })).toBe('Interview 03, p. 5')
  })

  it('treats pageNumber 0 as missing (defensive)', () => {
    // 0 is not a valid 1-based page; fall through to the title.
    expect(formatExcerptCitation({ sourceTitle: 'Interview 03', pageNumber: 0 })).toBe('Interview 03')
  })

  it('falls back to "Untitled source" when sourceTitle is blank', () => {
    expect(formatExcerptCitation({ sourceTitle: '' })).toBe('Untitled source')
    expect(formatExcerptCitation({ sourceTitle: '   ', pageNumber: 2 })).toBe('Untitled source, p. 2')
  })
})
