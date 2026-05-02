import { describe, expect, it } from 'vitest'
import { normalizeQueryDefinition } from '../queryDefinition'

describe('normalizeQueryDefinition', () => {
  it('returns a fully-defaulted definition for undefined input', () => {
    const result = normalizeQueryDefinition()
    expect(result.text).toBe('')
    expect(result.codeId).toBe('')
    expect(result.caseId).toBe('')
    expect(result.attributes).toEqual([])
  })

  it('passes through a new-shape definition with attributes array', () => {
    const result = normalizeQueryDefinition({
      text: 'trust',
      codeId: 'c1',
      caseId: 'A',
      attributes: [
        { attributeId: 'region', value: 'urban' },
        { attributeId: 'gender', value: 'female' },
      ],
    })
    expect(result.attributes).toEqual([
      { attributeId: 'region', value: 'urban' },
      { attributeId: 'gender', value: 'female' },
    ])
  })

  it('migrates legacy single-pair shape to a 1-element array', () => {
    const result = normalizeQueryDefinition({
      text: '',
      codeId: '',
      caseId: '',
      attributeId: 'region',
      attributeValue: 'urban',
    } as unknown as Parameters<typeof normalizeQueryDefinition>[0])
    expect(result.attributes).toEqual([{ attributeId: 'region', value: 'urban' }])
  })

  it('migrates legacy shape with empty attributeId to empty array', () => {
    const result = normalizeQueryDefinition({
      attributeId: '',
      attributeValue: '',
    } as unknown as Parameters<typeof normalizeQueryDefinition>[0])
    expect(result.attributes).toEqual([])
  })

  it('prefers new-shape attributes when both shapes are present', () => {
    const result = normalizeQueryDefinition({
      attributes: [{ attributeId: 'region', value: 'urban' }],
      attributeId: 'gender',
      attributeValue: 'female',
    } as unknown as Parameters<typeof normalizeQueryDefinition>[0])
    expect(result.attributes).toEqual([{ attributeId: 'region', value: 'urban' }])
  })

  it('drops malformed array entries (missing fields, wrong types)', () => {
    const result = normalizeQueryDefinition({
      attributes: [
        { attributeId: 'region', value: 'urban' },
        { attributeId: '', value: 'lonely' },
        { attributeId: 'gender' },              // missing value
        { value: 'orphan' },                     // missing attributeId
        42,                                      // wrong type
        null,                                    // wrong type
      ],
    } as unknown as Parameters<typeof normalizeQueryDefinition>[0])
    expect(result.attributes).toEqual([{ attributeId: 'region', value: 'urban' }])
  })

  it('returns empty attributes when input.attributes is not an array', () => {
    const result = normalizeQueryDefinition({
      attributes: 'not-an-array',
    } as unknown as Parameters<typeof normalizeQueryDefinition>[0])
    expect(result.attributes).toEqual([])
  })

  it('reads additionalCodeIds and filters out non-string entries', () => {
    const result = normalizeQueryDefinition({
      codeId: 'c1',
      additionalCodeIds: ['c2', 'c3', '', 42 as unknown as string],
    } as unknown as Parameters<typeof normalizeQueryDefinition>[0])
    expect(result.additionalCodeIds).toEqual(['c2', 'c3'])
  })

  it('defaults additionalCodeIds to [] when omitted (legacy saved queries)', () => {
    const result = normalizeQueryDefinition({ codeId: 'c1' })
    expect(result.additionalCodeIds).toEqual([])
  })
})
