import { describe, expect, it } from 'vitest'

import {
  parseDraftDescriptionResponse,
  parseDraftMemoResponse,
  parseSuggestCodesResponse,
  parseSummarizeSourceResponse,
} from '../responseGuards'

describe('AI response guards', () => {
  it('accepts valid code suggestions and drops malformed items', () => {
    expect(parseSuggestCodesResponse({
      suggestions: [
        { name: 'Access', description: 'Access barriers' },
        { name: 'Broken' },
      ],
    })).toEqual({
      ok: true,
      response: { suggestions: [{ name: 'Access', description: 'Access barriers' }] },
    })
  })

  it('rejects missing code suggestions', () => {
    expect(parseSuggestCodesResponse({ suggestions: [{ name: 'Broken' }] })).toEqual({
      ok: false,
      message: 'AI response was missing valid code suggestions.',
    })
  })

  it('accepts simple string draft responses', () => {
    expect(parseDraftDescriptionResponse({ description: 'A description' })).toEqual({
      ok: true,
      response: { description: 'A description' },
    })
    expect(parseSummarizeSourceResponse({ summary: 'A summary' })).toEqual({
      ok: true,
      response: { summary: 'A summary' },
    })
    expect(parseDraftMemoResponse({ memo: 'A memo' })).toEqual({
      ok: true,
      response: { memo: 'A memo' },
    })
  })
})
