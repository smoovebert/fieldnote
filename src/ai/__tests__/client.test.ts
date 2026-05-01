import { describe, expect, it } from 'vitest'
import { estimateCostUsd, estimateInputTokens } from '../client'

describe('estimateInputTokens', () => {
  it('approximates 1 token per 4 chars', () => {
    expect(estimateInputTokens('aaaaaaaa')).toBe(2)
    expect(estimateInputTokens('')).toBe(0)
  })
  it('rounds up partial tokens', () => {
    expect(estimateInputTokens('hello')).toBe(2) // 5/4 → 2
  })
})

describe('estimateCostUsd', () => {
  it('charges Gemini Flash retail rates', () => {
    // 1M input + 0 output = $0.10
    expect(estimateCostUsd(1_000_000, 0)).toBeCloseTo(0.10, 5)
    // 0 input + 1M output = $0.40
    expect(estimateCostUsd(0, 1_000_000)).toBeCloseTo(0.40, 5)
  })
  it('returns near-zero for typical small calls', () => {
    expect(estimateCostUsd(500, 200)).toBeCloseTo(0.00013, 5)
  })
})
