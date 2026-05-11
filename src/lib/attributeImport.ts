import type { Attribute, AttributeValue, Case } from './types'

type BuildAttributeImportInput = {
  rows: string[][]
  attributes: Attribute[]
  cases: Case[]
  attributeValues: AttributeValue[]
  createId: (prefix: string, readableSeed?: string) => string
}

type BuildAttributeImportResult =
  | { ok: false; message: string }
  | {
      ok: true
      attributes: Attribute[]
      cases: Case[]
      attributeValues: AttributeValue[]
      summary: string
    }

export function buildAttributeImport({
  rows,
  attributes,
  cases,
  attributeValues,
  createId,
}: BuildAttributeImportInput): BuildAttributeImportResult {
  if (rows.length < 2) {
    return { ok: false, message: 'File needs a header row plus at least one case row.' }
  }

  const header = rows[0]
  const attrNames = header.slice(1).map((h) => h.trim()).filter(Boolean)
  if (attrNames.length === 0) {
    return { ok: false, message: 'CSV needs at least one attribute column after the case-name column.' }
  }

  const findOrCreateAttribute = (currentAttrs: Attribute[], name: string, freshIds: Map<string, string>) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = currentAttrs.find((a) => a.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing.id
    const cached = freshIds.get(trimmed.toLowerCase())
    if (cached) return cached
    const id = createId('attribute', trimmed)
    freshIds.set(trimmed.toLowerCase(), id)
    return id
  }

  const newAttrIds = new Map<string, string>()
  const attrIdByHeaderIndex: Array<string | null> = attrNames.map((name) =>
    findOrCreateAttribute(attributes, name, newAttrIds),
  )

  const newAttrs: Attribute[] = []
  newAttrIds.forEach((id, lowerName) => {
    const original = attrNames.find((n) => n.toLowerCase() === lowerName)!
    newAttrs.push({ id, name: original, valueType: 'text' })
  })

  let updated = 0
  let skippedNoName = 0
  const updatesByPair = new Map<string, string>()
  const newCases: Case[] = []
  const caseLookup = [...cases]

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const caseName = row[0]?.trim()
    if (!caseName) {
      skippedNoName += 1
      continue
    }
    let matchedCase = caseLookup.find((c) => c.name.trim().toLowerCase() === caseName.toLowerCase())
    if (!matchedCase) {
      matchedCase = {
        id: createId('case', caseName),
        name: caseName,
        description: '',
        sourceIds: [],
      }
      newCases.push(matchedCase)
      caseLookup.push(matchedCase)
    }
    for (let col = 0; col < attrNames.length; col++) {
      const attrId = attrIdByHeaderIndex[col]
      if (!attrId) continue
      const value = (row[col + 1] ?? '').trim()
      if (!value) continue
      updatesByPair.set(`${matchedCase.id}::${attrId}`, value)
      updated += 1
    }
  }

  const nextAttributeValues = attributeValues.map((v) => {
    const key = `${v.caseId}::${v.attributeId}`
    if (updatesByPair.has(key)) {
      const value = updatesByPair.get(key)!
      updatesByPair.delete(key)
      return { ...v, value }
    }
    return v
  })
  updatesByPair.forEach((value, key) => {
    const [caseId, attributeId] = key.split('::')
    nextAttributeValues.push({ caseId, attributeId, value })
  })

  const parts: string[] = [`Imported ${updated} attribute value${updated === 1 ? '' : 's'}`]
  if (newAttrs.length) parts.push(`created ${newAttrs.length} new attribute${newAttrs.length === 1 ? '' : 's'}`)
  if (newCases.length) parts.push(`created ${newCases.length} new case${newCases.length === 1 ? '' : 's'}`)
  if (skippedNoName > 0) parts.push(`skipped ${skippedNoName} row${skippedNoName === 1 ? '' : 's'} with no name`)

  return {
    ok: true,
    attributes: [...attributes, ...newAttrs],
    cases: [...cases, ...newCases],
    attributeValues: nextAttributeValues,
    summary: `${parts.join(', ')}.`,
  }
}
