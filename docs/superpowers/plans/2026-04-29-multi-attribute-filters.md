# Multi-Attribute Filter Model + Crosstab Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-slot analyze attribute filter with an array of `(attributeId, value)` pairs and re-enable click-to-drill on crosstab cells via a smart-merge handler.

**Architecture:** Pure helper modules (`excerptFilters`, `queryDefinition`) for the testable logic, with `App.tsx` wiring the new state, the multi-row filter UI, and the cell click handler. `CrosstabsView` regains an `onCellSelect` prop. No DB migration — `fieldnote_queries.definition` is `jsonb` and `normalizeQueryDefinition` upgrades legacy payloads on read.

**Tech Stack:** React + TypeScript + Vite, vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-04-29-multi-attribute-filters-design.md`

---

## File Structure

**Create:**
- `src/analyze/excerptFilters.ts` — pure `excerptMatchesAttributeFilters()` helper.
- `src/analyze/__tests__/excerptFilters.test.ts` — 7 unit tests.
- `src/analyze/queryDefinition.ts` — `QueryDefinition` type, `normalizeQueryDefinition()`, re-exported into `App.tsx`.
- `src/analyze/__tests__/queryDefinition.test.ts` — 6 unit tests.

**Modify:**
- `src/App.tsx` — drop `QueryDefinition` and `normalizeQueryDefinition` definitions (now imported from `queryDefinition.ts`), replace `queryAttributeId`/`queryAttributeValue` state with `queryAttributes` array, swap intersection logic to use `excerptMatchesAttributeFilters`, update summary chips, replace single-row attribute UI with multi-row UI + add/delete controls, add `handleCrosstabCellSelect` and pass it to `CrosstabsView`.
- `src/analyze/CrosstabsView.tsx` — add optional `onCellSelect` prop and wire it on non-`(none)` cells.
- `src/App.css` — minor styling for the per-row delete button and the "Add attribute filter" button.
- `handoff.md` — mark crosstab click-to-drill landed and remove the multi-attribute follow-up bullet.

---

## Task 1: `excerptFilters.ts` helper (TDD)

**Files:**
- Create: `src/analyze/excerptFilters.ts`
- Create: `src/analyze/__tests__/excerptFilters.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/analyze/__tests__/excerptFilters.test.ts`:

```ts
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
    // case A has no 'cohort' attribute
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'cohort', value: 'pilot' }], 'A', baseAttrs),
    ).toBe(false)
  })

  it('trims whitespace on the stored value before comparison', () => {
    // case B has region = '  Suburban  '
    expect(
      excerptMatchesAttributeFilters([{ attributeId: 'region', value: 'Suburban' }], 'B', baseAttrs),
    ).toBe(true)
  })

  it('ignores incomplete rows (empty attributeId or empty value)', () => {
    const filters = [
      { attributeId: '',       value: 'urban'  }, // incomplete: no attribute picked
      { attributeId: 'gender', value: ''       }, // incomplete: no value picked
    ]
    // both rows are incomplete → behaves like an empty filter list
    expect(excerptMatchesAttributeFilters(filters, 'A', baseAttrs)).toBe(true)
    expect(excerptMatchesAttributeFilters(filters, undefined, baseAttrs)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyze/__tests__/excerptFilters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/analyze/excerptFilters.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyze/__tests__/excerptFilters.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/analyze/excerptFilters.ts src/analyze/__tests__/excerptFilters.test.ts
git commit -m "feat(analyze): add excerptMatchesAttributeFilters helper"
```

---

## Task 2: Extract & migrate `normalizeQueryDefinition` (TDD)

**Files:**
- Create: `src/analyze/queryDefinition.ts`
- Create: `src/analyze/__tests__/queryDefinition.test.ts`
- Modify: `src/App.tsx` (drop the inline `QueryDefinition` type and `normalizeQueryDefinition`; import them).

- [ ] **Step 1: Write the failing test file**

Create `src/analyze/__tests__/queryDefinition.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyze/__tests__/queryDefinition.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/analyze/queryDefinition.ts`**

```ts
import {
  type AnalyzeViewState,
  deserialize as deserializeAnalyzeView,
} from './analyzeViewState'

export type AttributeFilter = { attributeId: string; value: string }

export type QueryDefinition = {
  text: string
  codeId: string
  caseId: string
  attributes: AttributeFilter[]
  analyzeView?: AnalyzeViewState
}

// Inputs may be the new shape, the legacy shape (attributeId/attributeValue), or
// arbitrary jsonb from older saved queries. Always returns a clean QueryDefinition.
type DefinitionInput =
  & Partial<QueryDefinition>
  & Partial<{ attributeId: unknown; attributeValue: unknown }>
  & { analyzeView?: unknown }

function isAttributeFilter(value: unknown): value is AttributeFilter {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AttributeFilter).attributeId === 'string' &&
    typeof (value as AttributeFilter).value === 'string' &&
    (value as AttributeFilter).attributeId.length > 0
  )
}

export function normalizeQueryDefinition(definition?: DefinitionInput | null): QueryDefinition {
  const text = typeof definition?.text === 'string' ? definition.text : ''
  const codeId = typeof definition?.codeId === 'string' ? definition.codeId : ''
  const caseId = typeof definition?.caseId === 'string' ? definition.caseId : ''
  const analyzeView = deserializeAnalyzeView(
    definition ? { analyzeView: (definition as { analyzeView?: unknown }).analyzeView } : undefined,
  )

  let attributes: AttributeFilter[]
  if (Array.isArray(definition?.attributes)) {
    attributes = definition!.attributes.filter(isAttributeFilter)
  } else if (
    typeof definition?.attributeId === 'string' &&
    definition.attributeId.length > 0
  ) {
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyze/__tests__/queryDefinition.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Replace the inline definition in `App.tsx`**

In `src/App.tsx`, find the existing `QueryDefinition` type (around line 83):

```ts
type QueryDefinition = {
  text: string
  codeId: string
  caseId: string
  attributeId: string
  attributeValue: string
  analyzeView?: AnalyzeViewState
}
```

Delete that block.

Find the existing `normalizeQueryDefinition` function (around line 450):

```ts
function normalizeQueryDefinition(definition?: Partial<QueryDefinition> | null): QueryDefinition {
  return {
    text: definition?.text ?? '',
    codeId: definition?.codeId ?? '',
    caseId: definition?.caseId ?? '',
    attributeId: definition?.attributeId ?? '',
    attributeValue: definition?.attributeValue ?? '',
    analyzeView: deserializeAnalyzeView(
      definition ? (definition as { analyzeView?: unknown }) : undefined,
    ),
  }
}
```

Delete that block.

Add to the imports at the top of the file (under the existing `./analyze/...` imports):

```ts
import { normalizeQueryDefinition, type QueryDefinition } from './analyze/queryDefinition'
```

Note: this commit will not yet compile because the rest of `App.tsx` still references `attributeId`/`attributeValue` on the old shape — that's OK; Task 3 fixes the consumers in the same change-set. To keep this commit green, do the rest of Task 3 in the same commit. **Commit only after Task 3 step 5 passes.**

---

## Task 3: Replace single-attribute state and UI in `App.tsx` (combined commit with Task 2)

**Files:**
- Modify: `src/App.tsx`

This task is a coordinated change across ~7 spots in `App.tsx`. Apply each edit in order. Build/lint/test only at the end.

- [ ] **Step 1: Replace the state declarations**

Find (around line 770):

```ts
const [queryAttributeId, setQueryAttributeId] = useState('')
const [queryAttributeValue, setQueryAttributeValue] = useState('')
```

Replace with:

```ts
const [queryAttributes, setQueryAttributes] = useState<AttributeFilter[]>([])
```

Add to the imports next to `normalizeQueryDefinition`:

```ts
import {
  normalizeQueryDefinition,
  type AttributeFilter,
  type QueryDefinition,
} from './analyze/queryDefinition'
```

- [ ] **Step 2: Update `currentQueryDefinition`**

Find (around line 824):

```ts
const currentQueryDefinition: QueryDefinition = {
  text: queryText,
  codeId: queryCodeId,
  caseId: queryCaseId,
  attributeId: queryAttributeId,
  attributeValue: queryAttributeValue,
  analyzeView: serializeAnalyzeView(analyzeView),
}
```

Replace with:

```ts
const currentQueryDefinition: QueryDefinition = {
  text: queryText,
  codeId: queryCodeId,
  caseId: queryCaseId,
  attributes: queryAttributes,
  analyzeView: serializeAnalyzeView(analyzeView),
}
```

- [ ] **Step 3: Replace `queryAttributeOptions` with a per-row helper**

Find (around line 849):

```ts
const queryAttributeOptions = useMemo(
  () =>
    Array.from(
      new Set(
        attributeValues
          .filter((attributeValue) => attributeValue.attributeId === queryAttributeId && attributeValue.value.trim())
          .map((attributeValue) => attributeValue.value),
      ),
    ).sort(),
  [attributeValues, queryAttributeId]
)
```

Replace with a function (so it can be called per row):

```ts
const valuesForAttribute = useMemo(() => {
  const cache = new Map<string, string[]>()
  return (attributeId: string): string[] => {
    if (!attributeId) return []
    const cached = cache.get(attributeId)
    if (cached) return cached
    const values = Array.from(
      new Set(
        attributeValues
          .filter((av) => av.attributeId === attributeId && av.value.trim())
          .map((av) => av.value),
      ),
    ).sort()
    cache.set(attributeId, values)
    return values
  }
}, [attributeValues])
```

- [ ] **Step 4: Update the analyze intersection useMemo**

Find (around line 1330–1345):

```ts
      if (queryAttributeId) {
        if (!linkedCase) return false
        const value = attributeValues.find((item) => item.caseId === linkedCase.id && item.attributeId === queryAttributeId)?.value.trim() ?? ''
        if (value === '') return false
        if (queryAttributeValue && value !== queryAttributeValue) return false
      }
```

Replace with a single helper call:

```ts
      if (!excerptMatchesAttributeFilters(queryAttributes, linkedCase?.id, attributeValues)) return false
```

Update the dep array of the useMemo to swap `queryAttributeId, queryAttributeValue` for `queryAttributes`. The full dep list becomes:

```ts
}, [attributeValues, caseBySourceId, codes, excerpts, queryAttributes, queryCaseId, queryCodeId, queryText, sourceById])
```

Add to the imports near the top of the file:

```ts
import { excerptMatchesAttributeFilters } from './analyze/excerptFilters'
```

- [ ] **Step 5: Update the summary chip rendering**

Find (around line 1516–1525) — the `activeQueryFilters` array literal that's `.filter(Boolean)`-ed:

```ts
const activeQueryFilters = [
  queryText.trim() ? `Text contains "${queryText.trim()}"` : '',
  queryCodeId ? `Code: ${codes.find((code) => code.id === queryCodeId)?.name ?? 'Unknown code'}` : '',
  queryCaseId ? `Case: ${cases.find((item) => item.id === queryCaseId)?.name ?? 'Unknown case'}` : '',
  queryAttributeId
    ? `Attribute: ${attributes.find((attribute) => attribute.id === queryAttributeId)?.name ?? 'Unknown attribute'}${
        queryAttributeValue ? ` = ${queryAttributeValue}` : ''
      }`
    : '',
].filter(Boolean)
```

Replace with:

```ts
const activeQueryFilters = [
  queryText.trim() ? `Text contains "${queryText.trim()}"` : '',
  queryCodeId ? `Code: ${codes.find((code) => code.id === queryCodeId)?.name ?? 'Unknown code'}` : '',
  queryCaseId ? `Case: ${cases.find((item) => item.id === queryCaseId)?.name ?? 'Unknown case'}` : '',
  ...queryAttributes
    .filter((f) => f.attributeId && f.value)
    .map((f) => {
      const name = attributes.find((a) => a.id === f.attributeId)?.name ?? 'Unknown attribute'
      return `${name} = ${f.value}`
    }),
].filter(Boolean)
```

The spread emits `0..N` strings; each is non-empty so the surrounding `.filter(Boolean)` is harmless.

- [ ] **Step 6: Update `applyQueryDefinition`**

Find (around line 1885):

```ts
function applyQueryDefinition(definition: QueryDefinition) {
  setQueryText(definition.text)
  setQueryCodeId(definition.codeId)
  setQueryCaseId(definition.caseId)
  setQueryAttributeId(definition.attributeId)
  setQueryAttributeValue(definition.attributeValue)
  setAnalyzeView(definition.analyzeView ?? DEFAULT_ANALYZE_VIEW)
}
```

Replace with:

```ts
function applyQueryDefinition(definition: QueryDefinition) {
  setQueryText(definition.text)
  setQueryCodeId(definition.codeId)
  setQueryCaseId(definition.caseId)
  setQueryAttributes(definition.attributes)
  setAnalyzeView(definition.analyzeView ?? DEFAULT_ANALYZE_VIEW)
}
```

(`clearQueryFilters` continues to call `applyQueryDefinition(normalizeQueryDefinition())` — no edit needed there because the helper now returns `attributes: []`.)

- [ ] **Step 7: Replace the single-row Attribute/Value UI with a multi-row stack**

Find the UI block (around line 3034):

```tsx
<label className="property-field">
  <span>Attribute</span>
  <select
    value={queryAttributeId}
    onChange={(event) => {
      setQueryAttributeId(event.target.value)
      setQueryAttributeValue('')
    }}
  >
    <option value="">Any attribute</option>
    {attributes.map((attribute) => (
      <option key={attribute.id} value={attribute.id}>
        {attribute.name}
      </option>
    ))}
  </select>
</label>
<label className="property-field">
  <span>Value</span>
  <select value={queryAttributeValue} disabled={!queryAttributeId} onChange={(event) => setQueryAttributeValue(event.target.value)}>
    <option value="">Any filled value</option>
    {queryAttributeOptions.map((value) => (
      <option key={value} value={value}>
        {value}
      </option>
    ))}
  </select>
</label>
```

Replace the *entire two-label block* with:

```tsx
<div className="property-field property-field-stack">
  <span>Attributes</span>
  {queryAttributes.length === 0 && (
    <div className="attribute-filter-empty">No attribute filters.</div>
  )}
  {queryAttributes.map((row, index) => {
    const usedElsewhere = new Set(
      queryAttributes.filter((_, i) => i !== index).map((r) => r.attributeId).filter(Boolean),
    )
    const valueOptions = valuesForAttribute(row.attributeId)
    return (
      <div key={index} className="attribute-filter-row">
        <select
          value={row.attributeId}
          onChange={(event) => {
            const nextId = event.target.value
            setQueryAttributes((current) =>
              current.map((r, i) => (i === index ? { attributeId: nextId, value: '' } : r)),
            )
          }}
        >
          <option value="">— pick attribute —</option>
          {attributes
            .filter((a) => a.id === row.attributeId || !usedElsewhere.has(a.id))
            .map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
        </select>
        <select
          value={row.value}
          disabled={!row.attributeId}
          onChange={(event) => {
            const nextValue = event.target.value
            setQueryAttributes((current) =>
              current.map((r, i) => (i === index ? { ...r, value: nextValue } : r)),
            )
          }}
        >
          <option value="">— pick value —</option>
          {valueOptions.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
        <button
          type="button"
          className="attribute-filter-delete"
          aria-label="Remove this attribute filter"
          onClick={() => {
            setQueryAttributes((current) => current.filter((_, i) => i !== index))
          }}
        >
          ×
        </button>
      </div>
    )
  })}
  <button
    type="button"
    className="secondary-button attribute-filter-add"
    disabled={queryAttributes.length >= attributes.length}
    onClick={() => {
      setQueryAttributes((current) => [...current, { attributeId: '', value: '' }])
    }}
  >
    + Add attribute filter
  </button>
</div>
```

- [ ] **Step 8: Build, lint, type-check, run tests**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: all clean. Tests: previous count + 8 (excerptFilters) + 7 (queryDefinition) = 52 pass.

If lint complains about unused imports, remove them. If TypeScript complains about the `currentQueryDefinition` literal missing `attributeId`/`attributeValue`, that's the old type leaking — confirm the import in Task 2 step 5 is in place.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/analyze/queryDefinition.ts src/analyze/__tests__/queryDefinition.test.ts
git commit -m "feat(analyze): multi-attribute filter model in query builder"
```

(Yes — Task 2's source files are committed here, since they need Task 3's `App.tsx` consumers to compile.)

---

## Task 4: Add `onCellSelect` to `CrosstabsView`

**Files:**
- Modify: `src/analyze/CrosstabsView.tsx`

- [ ] **Step 1: Add the optional prop and wire the cell `onClick`**

In `src/analyze/CrosstabsView.tsx`, find the `Props` type (around line 15):

```ts
type Props = {
  attributes: AttributeOption[]
  attr1Id: string | null
  attr2Id: string | null
  percentMode: CrosstabPercentMode
  topNRows: number
  topNCols: number
  result: CrosstabResult | null
  onAttr1Change: (id: string | null) => void
  onAttr2Change: (id: string | null) => void
  onPercentModeChange: (mode: CrosstabPercentMode) => void
  onTopNRowsChange: (n: number) => void
  onTopNColsChange: (n: number) => void
  onExportCsv?: () => void
}
```

Add a new optional callback:

```ts
  onCellSelect?: (rowCodeId: string, col1Value: string, col2Value: string) => void
```

Add `CROSSTAB_NONE` to the existing `crosstabs` import:

```ts
import { CROSSTAB_NONE, type CrosstabResult } from './crosstabs'
```

Destructure `onCellSelect` in the component signature alongside the other props:

```ts
export function CrosstabsView({
  attributes,
  attr1Id, attr2Id, percentMode, topNRows, topNCols,
  result,
  onAttr1Change, onAttr2Change, onPercentModeChange,
  onTopNRowsChange, onTopNColsChange,
  onExportCsv,
  onCellSelect,
}: Props) {
```

- [ ] **Step 2: Wire the cell click**

Find the data cell render block:

```tsx
{result!.cols.map((col, colIdx) => {
  // cells is dense row-major (rows outer, cols inner) per buildCrosstab
  const cell = result!.cells[rowIdx * colCount + colIdx]
  const count = cell?.count ?? 0
  const colTotal = totalsByCol.get(col.key) ?? 0
  const denom = percentMode === 'row' ? rowTotal : percentMode === 'col' ? colTotal : 0
  const text = format(count, denom, percentMode)
  return (
    <td key={col.key}>{text}</td>
  )
})}
```

Replace the `<td>` line so it reads:

```tsx
{result!.cols.map((col, colIdx) => {
  // cells is dense row-major (rows outer, cols inner) per buildCrosstab
  const cell = result!.cells[rowIdx * colCount + colIdx]
  const count = cell?.count ?? 0
  const colTotal = totalsByCol.get(col.key) ?? 0
  const denom = percentMode === 'row' ? rowTotal : percentMode === 'col' ? colTotal : 0
  const text = format(count, denom, percentMode)
  const isNoneCell = col.col1 === CROSSTAB_NONE || col.col2 === CROSSTAB_NONE
  const drillable = !!onCellSelect && !isNoneCell
  return (
    <td
      key={col.key}
      onClick={drillable ? () => onCellSelect!(row.id, col.col1, col.col2) : undefined}
      style={drillable ? { cursor: 'pointer' } : undefined}
      title={isNoneCell ? 'Filtering on (none) is not supported yet.' : undefined}
    >
      {text}
    </td>
  )
})}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/analyze/CrosstabsView.tsx
git commit -m "feat(analyze): re-add onCellSelect to CrosstabsView"
```

---

## Task 5: Wire smart-merge cell handler in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the handler near the other crosstab logic**

Find the `crosstabResult` useMemo (around line 1483). Immediately after its closing dep array, add:

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

- [ ] **Step 2: Pass the handler to `CrosstabsView`**

Find the `<CrosstabsView ... />` mount (around line 3183). Add the prop alongside the existing callbacks:

```tsx
onCellSelect={handleCrosstabCellSelect}
```

Place it on its own line in the JSX, e.g. just before `onExportCsv`.

- [ ] **Step 3: Build, lint, test**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: all clean. 52 tests pass.

- [ ] **Step 4: Manual sanity check**

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`. Sign in to a project that has cases with at least two attributes set across multiple cases. Steps:

1. Add a Code filter (e.g. "Trust") and an attribute filter (e.g. "Region = Urban").
2. Note the result count in the analyze panel.
3. Switch to Crosstabs. Pick the same two attributes used in step 1 (and one other).
4. Click a non-`(none)` cell whose count is non-zero.
5. Verify: panel switches to "Query results"; the row's code is selected; the two attribute rows are filled with the cell's values; the existing Code filter has been replaced (not appended); the Text/Case filters from step 1 are preserved.
6. Verify the result count matches the cell count.
7. Click a `(none)` cell — nothing should happen.

Stop the dev server (Ctrl-C) when done.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(analyze): wire crosstab cell drill-down with smart merge"
```

---

## Task 6: CSS for the multi-row filter UI

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Append the new styles**

Append to `src/App.css`:

```css
/* Multi-attribute filter rows in the analyze query builder */
.property-field.property-field-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.property-field.property-field-stack > span {
  font-weight: 500;
}
.attribute-filter-empty {
  font-size: 12px;
  color: #6f797a;
  font-style: italic;
}
.attribute-filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 6px;
  align-items: center;
}
.attribute-filter-row select {
  padding: 4px 6px;
  border: 1px solid #d6d8da;
  border-radius: 4px;
  background: #ffffff;
}
.attribute-filter-delete {
  width: 28px;
  height: 28px;
  border: 1px solid #d6d8da;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.attribute-filter-delete:hover {
  background: #f4f5f7;
}
.attribute-filter-add {
  align-self: flex-start;
  font-size: 12px;
}
.attribute-filter-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Build to confirm CSS parses**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "style(analyze): multi-row attribute filter UI"
```

---

## Task 7: Update `handoff.md` and final verification

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Mark drill-down implemented and remove the follow-up**

In `handoff.md`, find the line in "## Current Known Issues":

```md
- Analyze is first-pass only: it has useful filters, saved queries, basic matrix coding, word frequency, code co-occurrence, and crosstabs, but no stored query result snapshots yet, and the crosstab cells are display-only until multi-attribute filtering lands.
```

Replace with:

```md
- Analyze is first-pass only: it has useful filters, saved queries, matrix coding, word frequency, code co-occurrence, and crosstabs (with cell drill-down), but no stored query result snapshots yet.
```

In the "Still needed" list, find:

```md
- Crosstab cell drill-down: requires extending the analyze filter model to multi-attribute filters (currently one slot) so a click can apply both `attr1 = v1` and `attr2 = v2` plus the row's code.
```

Delete that line.

In the "Implemented" list, append:

```md
- Replaced the single attribute filter slot with an array of `(attributeId, value)` filters AND'd together; legacy saved queries auto-migrate on read. Crosstab cells now drill into the query view with a smart merge that preserves text/case filters and replaces conflicting code/attribute filters so the drilled query result count matches the cell count.
```

In the "## Required Next Step" section, find:

```md
Next implementation should pick up M6 Report mode: report preview / formatted Word/PDF outputs, reusing `src/analyze/exportImage.ts`. Crosstab cells are display-only in v1; adding click-to-drill requires extending the analyze filter model to multiple attribute filters (and applying the row's code at the same time) — that work is a clean, scoped follow-up.
```

Replace with:

```md
Next implementation should pick up M6 Report mode: report preview / formatted Word/PDF outputs, reusing `src/analyze/exportImage.ts`.
```

- [ ] **Step 2: Run the full test suite + build**

```bash
npx vitest run
npm run build
```

Expected: clean. 52 tests pass.

- [ ] **Step 3: Commit and push**

```bash
git add handoff.md
git commit -m "docs: mark crosstab drill-down + multi-attribute filters shipped"
git push origin main
```

- [ ] **Step 4: Smoke-test on prod**

Open https://fieldnote-seven.vercel.app once Vercel finishes the build. Repeat the manual checks from Task 5 step 4 against a real project.

---

## Self-Review

- **Spec coverage:**
  - Data-model change → Task 2.
  - Legacy migration → Task 2.
  - State swap, intersection, summary chips → Task 3.
  - Multi-row UI + add/delete + dedup-by-attribute → Task 3 step 7 + Task 6 CSS.
  - `excerptMatchesAttributeFilters` helper → Task 1.
  - `onCellSelect` re-added on CrosstabsView, `(none)` cells skipped → Task 4.
  - Smart-merge handler → Task 5.
  - Tests for both helpers → Tasks 1 & 2.
  - Manual verification → Task 5 step 4.
  - Handoff update → Task 7.

- **Placeholders:** none. Every code block is concrete.

- **Type consistency:** `AttributeFilter` is defined in two files (`excerptFilters.ts` and `queryDefinition.ts`) with identical shape; both are exported. App.tsx imports from `queryDefinition.ts` (the canonical home). The shape `{ attributeId: string; value: string }` is consistent in every code block. `QueryDefinition.attributes` is the array; `queryAttributes` is the matching state. `handleCrosstabCellSelect` reads `analyzeView.crosstab.attr1Id`/`attr2Id` matching the field names defined in Task 1 of the M5.2 plan.
