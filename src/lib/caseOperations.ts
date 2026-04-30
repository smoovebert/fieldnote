// Pure operations on cases + the data they reference (attribute values,
// linked sources). Returns a patch — callers wire the result into state.

import type { AttributeValue, Case, Source } from './types'

type DeleteCaseInput = {
  cases: Case[]
  attributeValues: AttributeValue[]
  sources: Source[]
  caseId: string
}

type DeleteCaseResult = {
  cases: Case[]
  attributeValues: AttributeValue[]
  sources: Source[]
}

/**
 * Delete a case.
 *
 * - The case is removed from the cases collection.
 * - All attribute values for this case are dropped.
 * - Sources that were linked to this case have their `caseName` cleared
 *   (the source itself stays — only the link breaks).
 */
export function deleteCase({
  cases,
  attributeValues,
  sources,
  caseId,
}: DeleteCaseInput): DeleteCaseResult {
  const removed = cases.find((c) => c.id === caseId)
  if (!removed) return { cases, attributeValues, sources }

  const linkedSourceIds = new Set(removed.sourceIds)

  return {
    cases: cases.filter((c) => c.id !== caseId),
    attributeValues: attributeValues.filter((v) => v.caseId !== caseId),
    sources: sources.map((s) =>
      linkedSourceIds.has(s.id) ? { ...s, caseName: '' } : s,
    ),
  }
}
