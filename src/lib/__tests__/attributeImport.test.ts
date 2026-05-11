import { describe, expect, it } from 'vitest'

import { buildAttributeImport } from '../attributeImport'
import type { Attribute, AttributeValue, Case } from '../types'

const attr = (id: string, name: string): Attribute => ({ id, name, valueType: 'text' })
const c = (id: string, name: string): Case => ({ id, name, description: '', sourceIds: [] })
const av = (caseId: string, attributeId: string, value: string): AttributeValue => ({ caseId, attributeId, value })

function idFactory() {
  let next = 1
  return (prefix: string, seed?: string) => `${prefix}-${seed ?? 'item'}-${next++}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

describe('buildAttributeImport', () => {
  it('requires a header and at least one case row', () => {
    const result = buildAttributeImport({
      rows: [['Case', 'Role']],
      attributes: [],
      cases: [],
      attributeValues: [],
      createId: idFactory(),
    })
    expect(result).toEqual({ ok: false, message: 'File needs a header row plus at least one case row.' })
  })

  it('requires at least one attribute header after the case column', () => {
    const result = buildAttributeImport({
      rows: [['Case'], ['Maria']],
      attributes: [],
      cases: [],
      attributeValues: [],
      createId: idFactory(),
    })
    expect(result).toEqual({ ok: false, message: 'CSV needs at least one attribute column after the case-name column.' })
  })

  it('creates missing attributes and cases, then assigns values', () => {
    const result = buildAttributeImport({
      rows: [
        ['Case', 'Role', 'Cohort'],
        ['Maria', 'Student', '2024'],
      ],
      attributes: [],
      cases: [],
      attributeValues: [],
      createId: idFactory(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.attributes.map((a) => a.name)).toEqual(['Role', 'Cohort'])
    expect(result.cases.map((item) => item.name)).toEqual(['Maria'])
    expect(result.attributeValues).toEqual([
      av('case-maria-3', 'attribute-role-1', 'Student'),
      av('case-maria-3', 'attribute-cohort-2', '2024'),
    ])
    expect(result.summary).toBe('Imported 2 attribute values, created 2 new attributes, created 1 new case.')
  })

  it('updates existing values and skips blank case-name rows', () => {
    const result = buildAttributeImport({
      rows: [
        ['Case', 'Role'],
        ['Maria', 'Advisor'],
        ['', 'Ignored'],
      ],
      attributes: [attr('role', 'Role')],
      cases: [c('case-maria', 'Maria')],
      attributeValues: [av('case-maria', 'role', 'Student')],
      createId: idFactory(),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.attributes).toEqual([attr('role', 'Role')])
    expect(result.cases).toEqual([c('case-maria', 'Maria')])
    expect(result.attributeValues).toEqual([av('case-maria', 'role', 'Advisor')])
    expect(result.summary).toBe('Imported 1 attribute value, skipped 1 row with no name.')
  })
})
