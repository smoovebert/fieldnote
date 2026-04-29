# Multi-Attribute Filter Model + Crosstab Drill-Down — Design

Status: approved 2026-04-29. Ready for implementation plan.

## Goal

Replace the single-slot `(queryAttributeId, queryAttributeValue)` analyze filter with an array of `(attributeId, value)` pairs AND'd together, then re-add click-to-drill on crosstab cells using a smart-merge that reproduces the cell's count in the query result set. Unblocks the M5.2 crosstab follow-up that was deferred during M5.2 v1.

## Non-goals (v1)

- Multi-value within a single attribute (e.g. "Region in {Urban, Suburban}"). Each row is a single `(attribute, value)` pair; no row-duplication for OR.
- Filter chip rail / typeahead UX (a separate UX overhaul, not blocking).
- "Attribute is missing" filter mode. `(none)` cells in the crosstab remain non-clickable in v1.
- OR semantics across rows.

## Data model

`QueryDefinition` in `src/App.tsx` changes shape:

```ts
type QueryDefinition = {
  text: string
  codeId: string
  caseId: string
  attributes: Array<{ attributeId: string; value: string }>
  analyzeView?: AnalyzeViewState
}
```

The fields `attributeId` and `attributeValue` are removed from `QueryDefinition`. Saved queries on disk in `fieldnote_queries.definition` (jsonb) keep working via `normalizeQueryDefinition` migration: when reading, if the payload carries the legacy `attributeId`/`attributeValue` and no `attributes`, transform into a 1-element array (or `[]` if `attributeId` is empty). When writing, only the new shape is emitted.

No DB migration required — `definition` is `jsonb`.

## UI

In the query builder section of `App.tsx` (around line 3034), the single Attribute/Value row is replaced with:

- A stack of N filter rows. Each row: an attribute `<select>`, a value `<select>` populated from the attribute's distinct non-empty values, and a delete button.
- Each row's attribute `<select>` excludes attributes already used by *other* rows so the user cannot create same-attribute duplicates. The row's own selection is always present in its own picker.
- New rows start with `attributeId: ''` and `value: ''`. A row is **active** (participates in the filter intersection) only when both its `attributeId` and `value` are non-empty. Incomplete rows are tolerated in state and persisted, but skipped at filter time. This matches how the existing single-slot filter behaves: picking an attribute without a value yields no filtering.
- Below the stack: an "Add attribute filter" button. Disabled when every project attribute is already in use, or when there are no attributes defined.
- The existing "Clear filters" button continues to clear everything (text + code + case + all attribute filters).

Filter chips in the analyze summary render one chip per pair, e.g. `Region: Urban`, `Gender: Female`. Existing chips for Code / Case / Text are unchanged.

## State

```ts
const [queryAttributes, setQueryAttributes] = useState<Array<{ attributeId: string; value: string }>>([])
```

This single piece of state replaces `queryAttributeId` and `queryAttributeValue` everywhere they appear (state declaration, autosave payload, filter logic, summary chips, hydrate-from-saved-query path, clear-filters handler).

## Filter intersection logic

The current single-attribute branch in the analyze `useMemo` (around line 1333):

```ts
if (queryAttributeId) {
  const value = attributeValues.find((item) =>
    item.caseId === linkedCase?.id && item.attributeId === queryAttributeId
  )?.value.trim() ?? ''
  if (queryAttributeValue && value !== queryAttributeValue) return false
}
```

is extracted into a pure helper for testability and replaced with a loop:

```ts
// in a new src/analyze/excerptFilters.ts (or kept inline if size stays small)
export function excerptMatchesAttributeFilters(
  filters: Array<{ attributeId: string; value: string }>,
  caseId: string | undefined,
  attributeValues: Array<{ caseId: string; attributeId: string; value: string }>,
): boolean {
  // Drop incomplete rows (user mid-edit): they do not constrain the result set.
  const active = filters.filter((f) => f.attributeId.length > 0 && f.value.length > 0)
  if (active.length === 0) return true
  if (!caseId) return false  // no case → no attribute values → cannot match a non-empty filter set
  for (const filter of active) {
    const v = attributeValues.find(
      (av) => av.caseId === caseId && av.attributeId === filter.attributeId,
    )?.value.trim() ?? ''
    if (v !== filter.value) return false
  }
  return true
}
```

Excerpts whose source has no linked case fail any non-empty filter set. This matches the existing semantics (an excerpt can't satisfy `attr=value` if it has no case).

## Crosstab cell drill-down

`CrosstabsView` regains an optional prop:

```ts
onCellSelect?: (rowCodeId: string, col1Value: string, col2Value: string) => void
```

The cell click handler in `CrosstabsView` calls `onCellSelect(rowId, col1, col2)` for any cell where neither value is `CROSSTAB_NONE`. `(none)` cells remain non-clickable; cursor stays default and a `title` tooltip explains why.

App-side handler (in `src/App.tsx`):

```ts
function handleCrosstabCellSelect(codeId: string, v1: string, v2: string) {
  const attr1Id = analyzeView.crosstab.attr1Id
  const attr2Id = analyzeView.crosstab.attr2Id
  if (!attr1Id || !attr2Id) return
  setQueryCodeId(codeId)
  setQueryAttributes((prev) => {
    const filtered = prev.filter(
      (f) => f.attributeId !== attr1Id && f.attributeId !== attr2Id,
    )
    return [
      ...filtered,
      { attributeId: attr1Id, value: v1 },
      { attributeId: attr2Id, value: v2 },
    ]
  })
  setAnalyzePanel('query')
}
```

The merge:

- **Replaces** the row's Code filter (`queryCodeId`).
- **Replaces** any existing rows that filter on the cell's attr1 or attr2; **keeps** all other attribute-filter rows.
- **Preserves** Text and Case filters.
- **Switches** the panel to `'query'` so the user immediately sees the drilled result set whose count should equal the cell's count.

## Migration semantics

`normalizeQueryDefinition`:

```ts
function normalizeQueryDefinition(
  definition?: Partial<QueryDefinition> & { attributeId?: string; attributeValue?: string } | null,
): QueryDefinition {
  const text = typeof definition?.text === 'string' ? definition.text : ''
  const codeId = typeof definition?.codeId === 'string' ? definition.codeId : ''
  const caseId = typeof definition?.caseId === 'string' ? definition.caseId : ''
  const analyzeView = definition?.analyzeView

  let attributes: Array<{ attributeId: string; value: string }>
  if (Array.isArray(definition?.attributes)) {
    attributes = definition!.attributes.filter(
      (a): a is { attributeId: string; value: string } =>
        typeof a?.attributeId === 'string' && typeof a?.value === 'string' && a.attributeId.length > 0,
    )
  } else if (typeof definition?.attributeId === 'string' && definition.attributeId.length > 0) {
    attributes = [{
      attributeId: definition.attributeId,
      value: typeof definition.attributeValue === 'string' ? definition.attributeValue : '',
    }]
  } else {
    attributes = []
  }

  return { text, codeId, caseId, attributes, analyzeView }
}
```

The function never emits the legacy fields, so saving a legacy query and reopening it upgrades the payload in place.

## Architecture notes

- The intersection helper `excerptMatchesAttributeFilters` lives in `src/analyze/excerptFilters.ts` so it can be unit-tested without React.
- The merge handler `handleCrosstabCellSelect` stays inline in `App.tsx` since it touches multiple `App` state setters; the merge *logic* is straightforward enough that an extracted pure function would be over-engineering.
- The "filter row" UI is rendered inline in `App.tsx`, matching the inline form-field pattern already used for Code / Case / Text. No new component file.

## Testing

Unit tests in `src/analyze/__tests__/excerptFilters.test.ts`:

1. Empty filter list → always returns `true`.
2. No linked case → returns `false` whenever filters is non-empty.
3. Single filter, value matches → `true`. Value mismatch → `false`.
4. Two filters on different attributes, both match → `true`. One mismatches → `false`.
5. Filter targets an attribute the case has no value for → `false` (treats absent as not matching).
6. Whitespace handling: stored value `'  Urban  '` matches filter value `'Urban'` (mirrors current trim behavior).
7. Incomplete row (`attributeId: ''` or `value: ''`) does not contribute to the filter — a list with only incomplete rows behaves like an empty list.

Unit tests for `normalizeQueryDefinition` (extend the existing test scaffolding if any, or add a new file `src/analyze/__tests__/queryDefinition.test.ts`):

1. New shape with `attributes: []` → unchanged.
2. New shape with multiple attributes → unchanged.
3. Legacy shape `{ attributeId: 'a', attributeValue: 'v' }` → produces `attributes: [{ attributeId: 'a', value: 'v' }]`.
4. Legacy shape with empty `attributeId` → produces `attributes: []`.
5. Both shapes present (new wins) → returns the array, ignores legacy.
6. Malformed `attributes` (e.g. `'nope'`, `[42]`) → returns `[]`.

Manual / visual checks in dev:

- Add two attribute filters, confirm result count goes down with each.
- Try to add a row for an already-used attribute — option should be disabled or absent.
- Open a saved query that was created before this change — should hydrate one filter row.
- Save a query with two filters, reopen — should hydrate two rows.
- Click a non-`(none)` crosstab cell — should land on the query panel with the row's code + both attribute filters in place; the result count should equal the cell count.
- Click a `(none)` cell — nothing should happen.
- Drill once with `Text="trust"` already set; confirm Text survives the drill.

## Out-of-scope follow-ups

- Filter-chip rail UX redesign (Q1 (b)).
- Multi-value per attribute, e.g. `Region in {Urban, Suburban}` (Q2 (c)).
- "Attribute is missing" filter — would unlock click-to-drill on `(none)` cells.
- OR semantics across rows.
