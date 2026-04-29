// Pure helper for the analyze attribute-filter intersection.
// Caller (App.tsx) passes its existing AttributeValue array structurally.

export type AttributeFilter = { attributeId: string; value: string }
export type AttributeValueRow = { caseId: string; attributeId: string; value: string }

export function excerptMatchesAttributeFilters(
  filters: AttributeFilter[],
  caseId: string | undefined,
  attributeValues: AttributeValueRow[],
): boolean {
  // Drop incomplete rows (user mid-edit): they do not constrain the result set.
  const active = filters.filter((f) => f.attributeId.length > 0 && f.value.length > 0)
  if (active.length === 0) return true
  if (!caseId) return false
  for (const filter of active) {
    const v = attributeValues.find(
      (av) => av.caseId === caseId && av.attributeId === filter.attributeId,
    )?.value.trim() ?? ''
    if (v !== filter.value) return false
  }
  return true
}
