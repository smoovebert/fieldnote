import { describe, expect, it } from 'vitest'

import { createId } from '../id'

describe('createId', () => {
  it('keeps a readable prefix and seed', () => {
    expect(createId('code', 'Access Barriers')).toMatch(/^code-access-barriers-/)
  })

  it('does not reuse ids under rapid calls', () => {
    const ids = Array.from({ length: 100 }, () => createId('excerpt'))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
