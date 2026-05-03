import { describe, expect, it } from 'vitest'
import { RESEARCH_TEMPLATES, getTemplate } from '../researchTemplates'

describe('researchTemplates registry', () => {
  it('ships exactly five entries: three methodology + sample + blank', () => {
    expect(RESEARCH_TEMPLATES).toHaveLength(5)
    expect(RESEARCH_TEMPLATES.map((t) => t.id)).toEqual([
      'inductive-interview',
      'deductive-interview',
      'focus-group',
      'sample',
      'blank',
    ])
  })

  it('every template has the required string fields', () => {
    for (const template of RESEARCH_TEMPLATES) {
      expect(template.id.length).toBeGreaterThan(0)
      expect(template.name.length).toBeGreaterThan(0)
      expect(template.tagline.length).toBeGreaterThan(0)
      expect(template.description.length).toBeGreaterThan(0)
      expect(typeof template.buildSeed).toBe('function')
    }
  })

  it('getTemplate returns the right template by id and undefined for unknown', () => {
    expect(getTemplate('focus-group')?.name).toBe('Focus group')
    expect(getTemplate('does-not-exist')).toBeUndefined()
  })
})

describe('methodology template seeds', () => {
  // The blank template intentionally has zero codes; the sample
  // template ships with the existing defaultProject seed (covered by
  // its own tests). These assertions cover the three new templates.
  const methodologyIds = ['inductive-interview', 'deductive-interview', 'focus-group']

  for (const id of methodologyIds) {
    it(`${id}: seeds a usable codebook`, () => {
      const template = getTemplate(id)!
      const seed = template.buildSeed()
      // Reasonable-size codebook — at least 5 codes total.
      expect(seed.codes.length).toBeGreaterThanOrEqual(5)
      // No sources / cases / attributes / queries — codebook only.
      expect(seed.sources).toEqual([])
      expect(seed.cases).toEqual([])
      expect(seed.attributes).toEqual([])
      expect(seed.attributeValues).toEqual([])
      expect(seed.savedQueries).toEqual([])
      expect(seed.excerpts).toEqual([])
    })

    it(`${id}: hierarchy depth is at most 2 (no grandchildren)`, () => {
      const template = getTemplate(id)!
      const seed = template.buildSeed()
      const byId = new Map(seed.codes.map((c) => [c.id, c]))
      for (const code of seed.codes) {
        if (!code.parentCodeId) continue
        const parent = byId.get(code.parentCodeId)
        expect(parent).toBeDefined()
        // The parent must itself be a top-level code.
        expect(parent!.parentCodeId).toBeUndefined()
      }
    })

    it(`${id}: every parent code's children share the parent's color`, () => {
      const template = getTemplate(id)!
      const seed = template.buildSeed()
      const byId = new Map(seed.codes.map((c) => [c.id, c]))
      for (const code of seed.codes) {
        if (!code.parentCodeId) continue
        const parent = byId.get(code.parentCodeId)!
        expect(code.color).toBe(parent.color)
      }
    })

    it(`${id}: every code memo points at a real code in this template`, () => {
      const template = getTemplate(id)!
      const seed = template.buildSeed()
      const codeIds = new Set(seed.codes.map((c) => c.id))
      for (const memo of seed.memos) {
        expect(memo.linkedType).toBe('code')
        expect(memo.linkedId).toBeDefined()
        expect(codeIds.has(memo.linkedId!)).toBe(true)
      }
    })

    it(`${id}: top-level code colors are unique within the template`, () => {
      const template = getTemplate(id)!
      const seed = template.buildSeed()
      const topLevelColors = seed.codes.filter((c) => !c.parentCodeId).map((c) => c.color)
      expect(new Set(topLevelColors).size).toBe(topLevelColors.length)
    })
  }
})
