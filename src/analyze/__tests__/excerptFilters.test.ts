import { describe, expect, it } from 'vitest'
import { excerptMatchesAttributeFilters } from '../excerptFilters'

const av = (caseId: string, attributeId: string, value: string) => ({ caseId, attributeId, value })

describe('excerptMatchesAttributeFilters', () => {
  const baseAttrs = [
    av('A', 'region', 'urban'),
    av('A', 'gender', 'female'),
    av('B', 'region', '  Suburban  '),
    av('B', 'gender', 'male'),
  ]

  it('returns true when filters list is empty', () => {
    expect(excerptMatchesAttributeFilters([], 'A', baseAttrs)).toBe(true)
    expect(excerptMatchesAttributeFilters([], undefined, baseAttrs)).toBe(true)
  })

  it('returns false when caseId is undefined and filters are non-empty', () => {
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'region', value: 'urban' }], undefined, baseAttrs),
    ).toBe(false)
  })

  it('matches a single filter when the case has the value', () => {
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'region', value: 'urban' }], 'A', baseAttrs),
    ).toBe(true)
  })

  it('rejects a single filter when the value differs', () => {
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'region', value: 'rural' }], 'A', baseAttrs),
    ).toBe(false)
  })

  it('AND-combines multiple filters across attributes', () => {
    const filters = [
      { attributeId: 'region', value: 'urban' },
      { attributeId: 'gender', value: 'female' },
    ]
    expect(excerptMatchesAttributeFilters(filters, 'A', baseAttrs)).toBe(true)
    expect(excerptMatchesAttributeFilters(filters, 'B', baseAttrs)).toBe(false)
  })

  it('treats absent attribute on the case as a non-match', () => {
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'cohort', value: 'pilot' }], 'A', baseAttrs),
    ).toBe(false)
  })

  it('trims whitespace on the stored value before comparison', () => {
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'region', value: 'Suburban' }], 'B', baseAttrs),
    ).toBe(true)
  })

  it('ignores incomplete rows (empty attributeId or empty value)', () => {
    const filters = [
      { attributeId: '',       value: 'urban'  },
      { attributeId: 'gender', value: ''       },
    ]
    expect(excerptMatchesAttributeFilters(filters, 'A', baseAttrs)).toBe(true)
    expect(excerptMatchesAttributeFilters(filters, undefined, baseAttrs)).toBe(true)
  })
})
