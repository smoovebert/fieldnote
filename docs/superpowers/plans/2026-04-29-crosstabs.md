# M5.2 Crosstabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Crosstabs analyze surface that shows codes × the cartesian product of two attribute values, with totals, percentages, and CSV export.

**Architecture:** New presentational component `CrosstabsView.tsx` plus a pure helper module `crosstabs.ts` (testable in isolation). State and wiring live in `App.tsx`, following the same pattern used for the existing Matrix coding panel. View metadata + saved-query roundtrip live in `analyzeViewState.ts`.

**Tech Stack:** React + TypeScript + Vite, Vitest for unit tests, lucide-react for icons.

**Spec:** `docs/superpowers/specs/2026-04-29-crosstabs-design.md`

---

## File Structure

**Create:**
- `src/analyze/crosstabs.ts` — pure builder + CSV-row helper. ~150 lines.
- `src/analyze/CrosstabsView.tsx` — presentational component (toolbar + table). ~180 lines.
- `src/analyze/__tests__/crosstabs.test.ts` — unit tests for the builder.

**Modify:**
- `src/analyze/analyzeViewState.ts` — add `'crosstab'` to view union, `CrosstabConfig` type, defaults, bounds, serialize/deserialize.
- `src/analyze/__tests__/analyzeViewState.test.ts` — extend existing roundtrip tests.
- `src/App.tsx` — `AnalyzePanel` union, state, sidebar button, CrosstabsView mount, drill-down handler, CSV export wiring, saved-query persistence/hydration.
- `src/App.css` — totals row/column styling on `.analyze-table`.
- `handoff.md` — flip M5.2 from "still needed" to "implemented"; add to recent commits list mentally (single line).

---

## Task 1: Extend `analyzeViewState.ts` for crosstabs

**Files:**
- Modify: `src/analyze/analyzeViewState.ts`
- Modify: `src/analyze/__tests__/analyzeViewState.test.ts`

- [ ] **Step 1: Read the existing test file to confirm assertion style**

Run: `cat src/analyze/__tests__/analyzeViewState.test.ts | head -60`

You should see roundtrip tests using `serialize` and `deserialize`. Match their style.

- [ ] **Step 2: Add a failing test for crosstab defaults + roundtrip**

Append to `src/analyze/__tests__/analyzeViewState.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ANALYZE_VIEW,
  TOP_N_BOUNDS,
  deserialize,
  serialize,
} from '../analyzeViewState'

describe('analyzeViewState — crosstab', () => {
  it('exposes crosstab defaults', () => {
    expect(DEFAULT_ANALYZE_VIEW.crosstab).toEqual({
      attr1Id: null,
      attr2Id: null,
      percentMode: 'count',
      topNRows: 30,
      topNCols: 40,
    })
  })

  it('exposes crosstab top-N bounds', () => {
    expect(TOP_N_BOUNDS.crosstabRows).toEqual({ min: 5, max: 30 })
    expect(TOP_N_BOUNDS.crosstabCols).toEqual({ min: 5, max: 40 })
  })

  it('roundtrips a crosstab config through serialize/deserialize', () => {
    const state = {
      ...DEFAULT_ANALYZE_VIEW,
      crosstab: {
        attr1Id: 'attr-a',
        attr2Id: 'attr-b',
        percentMode: 'row' as const,
        topNRows: 25,
        topNCols: 35,
      },
    }
    expect(deserialize({ analyzeView: serialize(state) })).toEqual(state)
  })

  it('falls back to defaults when crosstab is missing or malformed', () => {
    const result = deserialize({ analyzeView: { crosstab: 'nope' } })
    expect(result.crosstab).toEqual(DEFAULT_ANALYZE_VIEW.crosstab)
  })

  it('clamps crosstab topN values within bounds', () => {
    const result = deserialize({
      analyzeView: {
        crosstab: { attr1Id: null, attr2Id: null, percentMode: 'count', topNRows: 999, topNCols: 1 },
      },
    })
    expect(result.crosstab.topNRows).toBe(TOP_N_BOUNDS.crosstabRows.max)
    expect(result.crosstab.topNCols).toBe(TOP_N_BOUNDS.crosstabCols.min)
  })

  it('rejects unknown percentMode and falls back to count', () => {
    const result = deserialize({
      analyzeView: {
        crosstab: { attr1Id: null, attr2Id: null, percentMode: 'bogus', topNRows: 30, topNCols: 40 },
      },
    })
    expect(result.crosstab.percentMode).toBe('count')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/analyze/__tests__/analyzeViewState.test.ts`
Expected: FAIL on `crosstab` properties not existing.

- [ ] **Step 4: Update `src/analyze/analyzeViewState.ts`**

Replace the entire file with:

```ts
export type WordFreqView = 'bar' | 'cloud' | 'table'
export type CooccurView  = 'heatmap' | 'network' | 'table'
export type MatrixView   = 'heatmap' | 'bars' | 'table'
export type CrosstabPercentMode = 'count' | 'row' | 'col'

export type CrosstabConfig = {
  attr1Id: string | null
  attr2Id: string | null
  percentMode: CrosstabPercentMode
  topNRows: number
  topNCols: number
}

export type AnalyzeViewState = {
  wordFreq: { view: WordFreqView; topN: number }
  cooccur:  { view: CooccurView;  topN: number }
  matrix:   { view: MatrixView;   topNRows: number; topNCols: number }
  crosstab: CrosstabConfig
}

export const DEFAULT_ANALYZE_VIEW: AnalyzeViewState = {
  wordFreq: { view: 'bar',     topN: 25 },
  cooccur:  { view: 'heatmap', topN: 30 },
  matrix:   { view: 'heatmap', topNRows: 30, topNCols: 30 },
  crosstab: { attr1Id: null, attr2Id: null, percentMode: 'count', topNRows: 30, topNCols: 40 },
}

export const TOP_N_BOUNDS = {
  wordFreq:      { min: 5, max: 200 },
  cooccur:       { min: 5, max: 100 },
  matrixRows:    { min: 5, max: 50  },
  matrixCols:    { min: 5, max: 50  },
  crosstabRows:  { min: 5, max: 30  },
  crosstabCols:  { min: 5, max: 40  },
} as const

export function serialize(state: AnalyzeViewState): AnalyzeViewState {
  return {
    wordFreq: { view: state.wordFreq.view, topN: state.wordFreq.topN },
    cooccur:  { view: state.cooccur.view,  topN: state.cooccur.topN  },
    matrix:   {
      view: state.matrix.view,
      topNRows: state.matrix.topNRows,
      topNCols: state.matrix.topNCols,
    },
    crosstab: {
      attr1Id: state.crosstab.attr1Id,
      attr2Id: state.crosstab.attr2Id,
      percentMode: state.crosstab.percentMode,
      topNRows: state.crosstab.topNRows,
      topNCols: state.crosstab.topNCols,
    },
  }
}

export function clampTopN(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}

const WORD_FREQ_VIEWS: WordFreqView[] = ['bar', 'cloud', 'table']
const COOCCUR_VIEWS:   CooccurView[]  = ['heatmap', 'network', 'table']
const MATRIX_VIEWS:    MatrixView[]   = ['heatmap', 'bars', 'table']
const PERCENT_MODES:   CrosstabPercentMode[] = ['count', 'row', 'col']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickView<T extends string>(raw: unknown, allowed: T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as string[]).includes(raw) ? (raw as T) : fallback
}

function pickStringOrNull(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export function deserialize(definition: { analyzeView?: unknown } | undefined): AnalyzeViewState {
  if (!definition) return DEFAULT_ANALYZE_VIEW
  const raw = (definition as { analyzeView?: unknown }).analyzeView
  if (raw === undefined) return DEFAULT_ANALYZE_VIEW
  if (!isPlainObject(raw)) {
    console.warn('[analyzeViewState] analyzeView is not an object; using defaults', raw)
    return DEFAULT_ANALYZE_VIEW
  }

  const wf = isPlainObject(raw.wordFreq) ? raw.wordFreq : {}
  const co = isPlainObject(raw.cooccur)  ? raw.cooccur  : {}
  const mx = isPlainObject(raw.matrix)   ? raw.matrix   : {}
  const ct = isPlainObject(raw.crosstab) ? raw.crosstab : {}

  return {
    wordFreq: {
      view: pickView(wf.view, WORD_FREQ_VIEWS, DEFAULT_ANALYZE_VIEW.wordFreq.view),
      topN: clampTopN(
        typeof wf.topN === 'number' ? wf.topN : DEFAULT_ANALYZE_VIEW.wordFreq.topN,
        TOP_N_BOUNDS.wordFreq.min,
        TOP_N_BOUNDS.wordFreq.max,
      ),
    },
    cooccur: {
      view: pickView(co.view, COOCCUR_VIEWS, DEFAULT_ANALYZE_VIEW.cooccur.view),
      topN: clampTopN(
        typeof co.topN === 'number' ? co.topN : DEFAULT_ANALYZE_VIEW.cooccur.topN,
        TOP_N_BOUNDS.cooccur.min,
        TOP_N_BOUNDS.cooccur.max,
      ),
    },
    matrix: {
      view: pickView(mx.view, MATRIX_VIEWS, DEFAULT_ANALYZE_VIEW.matrix.view),
      topNRows: clampTopN(
        typeof mx.topNRows === 'number' ? mx.topNRows : DEFAULT_ANALYZE_VIEW.matrix.topNRows,
        TOP_N_BOUNDS.matrixRows.min,
        TOP_N_BOUNDS.matrixRows.max,
      ),
      topNCols: clampTopN(
        typeof mx.topNCols === 'number' ? mx.topNCols : DEFAULT_ANALYZE_VIEW.matrix.topNCols,
        TOP_N_BOUNDS.matrixCols.min,
        TOP_N_BOUNDS.matrixCols.max,
      ),
    },
    crosstab: {
      attr1Id: pickStringOrNull(ct.attr1Id),
      attr2Id: pickStringOrNull(ct.attr2Id),
      percentMode: pickView(ct.percentMode, PERCENT_MODES, DEFAULT_ANALYZE_VIEW.crosstab.percentMode),
      topNRows: clampTopN(
        typeof ct.topNRows === 'number' ? ct.topNRows : DEFAULT_ANALYZE_VIEW.crosstab.topNRows,
        TOP_N_BOUNDS.crosstabRows.min,
        TOP_N_BOUNDS.crosstabRows.max,
      ),
      topNCols: clampTopN(
        typeof ct.topNCols === 'number' ? ct.topNCols : DEFAULT_ANALYZE_VIEW.crosstab.topNCols,
        TOP_N_BOUNDS.crosstabCols.min,
        TOP_N_BOUNDS.crosstabCols.max,
      ),
    },
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/analyze/__tests__/analyzeViewState.test.ts`
Expected: PASS for all crosstab tests; existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/analyze/analyzeViewState.ts src/analyze/__tests__/analyzeViewState.test.ts
git commit -m "feat(analyze): add crosstab config to analyzeViewState"
```

---

## Task 2: Build the `crosstabs.ts` core helper (TDD)

**Files:**
- Create: `src/analyze/crosstabs.ts`
- Create: `src/analyze/__tests__/crosstabs.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/analyze/__tests__/crosstabs.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildCrosstab,
  crosstabCsvRows,
  CROSSTAB_NONE,
  CROSSTAB_COL_KEY_SEPARATOR,
} from '../crosstabs'

type T = {
  excerpts: { id: string; codeIds: string[]; sourceId: string }[]
  codes: { id: string; name: string }[]
  cases: { id: string; sourceIds: string[] }[]
  attributeValues: { caseId: string; attributeId: string; value: string }[]
}

const fixture: T = {
  excerpts: [
    { id: 'e1', codeIds: ['c1'],         sourceId: 's1' }, // case A → urban + female
    { id: 'e2', codeIds: ['c1', 'c2'],   sourceId: 's2' }, // case B → urban + male
    { id: 'e3', codeIds: ['c2'],         sourceId: 's3' }, // case C → no urban (none) + female
    { id: 'e4', codeIds: ['c1'],         sourceId: 's4' }, // case D → no values at all
    { id: 'e5', codeIds: ['c1'],         sourceId: 's5' }, // no case at all → excluded
  ],
  codes: [
    { id: 'c1', name: 'Trust' },
    { id: 'c2', name: 'Risk' },
  ],
  cases: [
    { id: 'A', sourceIds: ['s1'] },
    { id: 'B', sourceIds: ['s2'] },
    { id: 'C', sourceIds: ['s3'] },
    { id: 'D', sourceIds: ['s4'] },
  ],
  attributeValues: [
    { caseId: 'A', attributeId: 'region', value: 'urban'  },
    { caseId: 'A', attributeId: 'gender', value: 'female' },
    { caseId: 'B', attributeId: 'region', value: 'urban'  },
    { caseId: 'B', attributeId: 'gender', value: 'male'   },
    { caseId: 'C', attributeId: 'gender', value: 'female' },
    // C has no region, D has nothing
  ],
}

function build(opts: Partial<{ topNRows: number; topNCols: number }> = {}) {
  return buildCrosstab({
    ...fixture,
    attr1Id: 'region',
    attr2Id: 'gender',
    topNRows: opts.topNRows ?? 30,
    topNCols: opts.topNCols ?? 40,
  })
}

describe('buildCrosstab', () => {
  it('returns empty result for empty inputs', () => {
    const result = buildCrosstab({
      excerpts: [], codes: [], cases: [], attributeValues: [],
      attr1Id: 'a', attr2Id: 'b', topNRows: 30, topNCols: 40,
    })
    expect(result.rows).toEqual([])
    expect(result.cols).toEqual([])
    expect(result.cells).toEqual([])
    expect(result.grandTotal).toBe(0)
  })

  it('counts a single coded reference once per matching code', () => {
    const result = build()
    // e2 has codes c1 + c2, both contribute to the (urban, male) column
    const c1Male = result.cells.find(
      (c) => c.rowId === 'c1' && c.col1Value === 'urban' && c.col2Value === 'male',
    )
    const c2Male = result.cells.find(
      (c) => c.rowId === 'c2' && c.col1Value === 'urban' && c.col2Value === 'male',
    )
    expect(c1Male?.count).toBe(1)
    expect(c2Male?.count).toBe(1)
  })

  it('buckets a missing attribute value as (none)', () => {
    const result = build()
    // case C: gender=female, region missing → e3 (code c2) → (none, female)
    const cell = result.cells.find(
      (c) => c.rowId === 'c2' && c.col1Value === CROSSTAB_NONE && c.col2Value === 'female',
    )
    expect(cell?.count).toBe(1)
  })

  it('buckets both-missing as (none, none)', () => {
    const result = build()
    // case D: no values → e4 (code c1) → (none, none)
    const cell = result.cells.find(
      (c) => c.rowId === 'c1' && c.col1Value === CROSSTAB_NONE && c.col2Value === CROSSTAB_NONE,
    )
    expect(cell?.count).toBe(1)
  })

  it('excludes excerpts whose source has no case', () => {
    const result = build()
    expect(result.grandTotal).toBe(5) // e1(c1)+e2(c1)+e2(c2)+e3(c2)+e4(c1) = 5; e5 excluded
  })

  it('renders dense cells (every row × col), zero-filled', () => {
    const result = build()
    // 2 codes × however many cols = 2*cols cells
    expect(result.cells).toHaveLength(result.rows.length * result.cols.length)
  })

  it('computes row, column, and grand totals', () => {
    const result = build()
    const c1Total = result.rowTotals.get('c1')
    const c2Total = result.rowTotals.get('c2')
    expect(c1Total).toBe(3) // e1, e2, e4
    expect(c2Total).toBe(2) // e2, e3

    // (urban, male) col total = 2 (e2 contributes c1 and c2)
    const colKey = `urban${CROSSTAB_COL_KEY_SEPARATOR}male`
    expect(result.colTotals.get(colKey)).toBe(2)

    expect(result.grandTotal).toBe(5)
  })

  it('truncates rows by total count desc when over topNRows', () => {
    // synthesize: 3 codes, only 2 should remain when topNRows=2
    const result = buildCrosstab({
      ...fixture,
      codes: [
        { id: 'c1', name: 'Trust' },   // 3 refs
        { id: 'c2', name: 'Risk' },    // 2 refs
        { id: 'c3', name: 'Quiet' },   // 0 refs
      ],
      attr1Id: 'region', attr2Id: 'gender', topNRows: 2, topNCols: 40,
    })
    expect(result.rows.map((r) => r.id)).toEqual(['c1', 'c2'])
    expect(result.totalRowsBeforeTruncation).toBe(2) // c3 has 0 refs and is dropped before truncation
  })

  it('truncates columns by total count desc when over topNCols', () => {
    const result = build({ topNCols: 1 })
    expect(result.cols).toHaveLength(1)
    // urban/male has the highest column total (2), so it wins
    expect(result.cols[0].col1).toBe('urban')
    expect(result.cols[0].col2).toBe('male')
    expect(result.totalColsBeforeTruncation).toBeGreaterThan(1)
  })
})

describe('crosstabCsvRows', () => {
  it('emits one row per non-zero cell with the requested header', () => {
    const result = build()
    const rows = crosstabCsvRows(result, 'Region', 'Gender')
    expect(rows[0]).toEqual(['Code', 'Region', 'Gender', 'Count'])
    // every body row count > 0
    for (const row of rows.slice(1)) {
      expect(Number(row[3])).toBeGreaterThan(0)
    }
    // the grand total is the sum of all cell counts in the CSV body
    const sum = rows.slice(1).reduce((acc, r) => acc + Number(r[3]), 0)
    expect(sum).toBe(result.grandTotal)
  })

  it('writes (none) literally', () => {
    const result = build()
    const rows = crosstabCsvRows(result, 'Region', 'Gender')
    const hasNone = rows.some((r) => r.includes(CROSSTAB_NONE))
    expect(hasNone).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/analyze/__tests__/crosstabs.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/analyze/crosstabs.ts`**

```ts
// Pure helpers for the Crosstabs analyze surface.
// Inputs are intentionally duck-typed — the caller (App.tsx) passes its
// existing Excerpt/Code/Case/AttributeValue arrays directly.

export const CROSSTAB_NONE = '(none)'
export const CROSSTAB_COL_KEY_SEPARATOR = '∥' // ∥

export type CrosstabExcerpt   = { id: string; codeIds: string[]; sourceId: string }
export type CrosstabCode      = { id: string; name: string }
export type CrosstabCase      = { id: string; sourceIds: string[] }
export type CrosstabAttrValue = { caseId: string; attributeId: string; value: string }

export type CrosstabBuilderInput = {
  excerpts: CrosstabExcerpt[]      // already filtered upstream
  codes: CrosstabCode[]
  cases: CrosstabCase[]
  attributeValues: CrosstabAttrValue[]
  attr1Id: string
  attr2Id: string
  topNRows: number
  topNCols: number
}

export type CrosstabRow  = { id: string; label: string }
export type CrosstabCol  = { col1: string; col2: string; key: string }
export type CrosstabCell = {
  rowId: string
  rowLabel: string
  col1Value: string
  col2Value: string
  count: number
}

export type CrosstabResult = {
  rows: CrosstabRow[]
  cols: CrosstabCol[]
  cells: CrosstabCell[]                      // dense
  rowTotals: Map<string, number>             // by rowId
  colTotals: Map<string, number>             // by composite key
  grandTotal: number
  totalRowsBeforeTruncation: number
  totalColsBeforeTruncation: number
}

export function colKey(col1: string, col2: string): string {
  return `${col1}${CROSSTAB_COL_KEY_SEPARATOR}${col2}`
}

export function buildCrosstab(input: CrosstabBuilderInput): CrosstabResult {
  const {
    excerpts, codes, cases, attributeValues,
    attr1Id, attr2Id, topNRows, topNCols,
  } = input

  // sourceId → caseId (first case wins; sources usually link to one case)
  const caseBySource = new Map<string, string>()
  for (const c of cases) {
    for (const sid of c.sourceIds) {
      if (!caseBySource.has(sid)) caseBySource.set(sid, c.id)
    }
  }

  // (caseId, attributeId) → value
  const valueByCaseAttr = new Map<string, string>()
  for (const v of attributeValues) {
    if (v.value && v.value.trim()) {
      valueByCaseAttr.set(`${v.caseId}::${v.attributeId}`, v.value)
    }
  }

  const codeNameById = new Map(codes.map((c) => [c.id, c.name]))

  // Raw cell counts, before any truncation.
  type Bucket = { rowId: string; col1: string; col2: string; count: number }
  const buckets = new Map<string, Bucket>()
  let grandTotal = 0

  for (const exc of excerpts) {
    const caseId = caseBySource.get(exc.sourceId)
    if (!caseId) continue // source without a case — excluded per spec

    const v1 = valueByCaseAttr.get(`${caseId}::${attr1Id}`) ?? CROSSTAB_NONE
    const v2 = valueByCaseAttr.get(`${caseId}::${attr2Id}`) ?? CROSSTAB_NONE

    for (const codeId of exc.codeIds) {
      if (!codeNameById.has(codeId)) continue
      const k = `${codeId}${v1}${v2}`
      const b = buckets.get(k)
      if (b) b.count++
      else buckets.set(k, { rowId: codeId, col1: v1, col2: v2, count: 1 })
      grandTotal++
    }
  }

  // Aggregate row totals and column totals across all buckets.
  const rowTotalsAll = new Map<string, number>()
  const colTotalsAll = new Map<string, number>()
  const colMeta      = new Map<string, { col1: string; col2: string }>()

  for (const b of buckets.values()) {
    rowTotalsAll.set(b.rowId, (rowTotalsAll.get(b.rowId) ?? 0) + b.count)
    const ck = colKey(b.col1, b.col2)
    colTotalsAll.set(ck, (colTotalsAll.get(ck) ?? 0) + b.count)
    colMeta.set(ck, { col1: b.col1, col2: b.col2 })
  }

  const totalRowsBeforeTruncation = rowTotalsAll.size
  const totalColsBeforeTruncation = colTotalsAll.size

  // Pick top rows/cols by total desc, ties broken by label/key for determinism.
  const sortedRowIds = [...rowTotalsAll.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, topNRows))
    .map(([id]) => id)

  const sortedColKeys = [...colTotalsAll.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(0, topNCols))
    .map(([k]) => k)

  const rows: CrosstabRow[] = sortedRowIds.map((id) => ({
    id, label: codeNameById.get(id) ?? id,
  }))
  const cols: CrosstabCol[] = sortedColKeys.map((k) => {
    const meta = colMeta.get(k)!
    return { col1: meta.col1, col2: meta.col2, key: k }
  })

  // Dense cells — fill zeros for (row, col) without a bucket.
  const bucketByCell = new Map<string, number>()
  for (const b of buckets.values()) {
    bucketByCell.set(`${b.rowId}${colKey(b.col1, b.col2)}`, b.count)
  }

  const cells: CrosstabCell[] = []
  for (const row of rows) {
    for (const col of cols) {
      const count = bucketByCell.get(`${row.id}${col.key}`) ?? 0
      cells.push({
        rowId: row.id,
        rowLabel: row.label,
        col1Value: col.col1,
        col2Value: col.col2,
        count,
      })
    }
  }

  // Recompute row/col totals limited to the *visible* set so the table math closes.
  const rowTotals = new Map<string, number>()
  const colTotals = new Map<string, number>()
  for (const cell of cells) {
    rowTotals.set(cell.rowId, (rowTotals.get(cell.rowId) ?? 0) + cell.count)
    const ck = colKey(cell.col1Value, cell.col2Value)
    colTotals.set(ck, (colTotals.get(ck) ?? 0) + cell.count)
  }

  return {
    rows, cols, cells, rowTotals, colTotals, grandTotal,
    totalRowsBeforeTruncation, totalColsBeforeTruncation,
  }
}

export function crosstabCsvRows(
  result: CrosstabResult,
  attr1Name: string,
  attr2Name: string,
): string[][] {
  const header = ['Code', attr1Name, attr2Name, 'Count']
  const body: string[][] = []
  for (const cell of result.cells) {
    if (cell.count === 0) continue
    body.push([cell.rowLabel, cell.col1Value, cell.col2Value, String(cell.count)])
  }
  return [header, ...body]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/analyze/__tests__/crosstabs.test.ts`
Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analyze/crosstabs.ts src/analyze/__tests__/crosstabs.test.ts
git commit -m "feat(analyze): add crosstabs builder + CSV row helper"
```

---

## Task 3: Add `CrosstabsView` component

**Files:**
- Create: `src/analyze/CrosstabsView.tsx`

This task is presentational; we'll lean on manual verification + a build/lint check. (A full RTL test setup doesn't exist in this analyze module yet, and adding one for one component would be scope creep.)

- [ ] **Step 1: Create `src/analyze/CrosstabsView.tsx`**

```tsx
// src/analyze/CrosstabsView.tsx
import { useMemo } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControlDual } from './TopNControl'
import { type CrosstabResult } from './crosstabs'
import {
  TOP_N_BOUNDS,
  type CrosstabPercentMode,
} from './analyzeViewState'

type AttributeOption = { id: string; name: string }

type Props = {
  attributes: AttributeOption[]
  attr1Id: string | null
  attr2Id: string | null
  percentMode: CrosstabPercentMode
  topNRows: number
  topNCols: number
  result: CrosstabResult | null   // null when not enough config to compute
  onAttr1Change: (id: string | null) => void
  onAttr2Change: (id: string | null) => void
  onPercentModeChange: (mode: CrosstabPercentMode) => void
  onTopNRowsChange: (n: number) => void
  onTopNColsChange: (n: number) => void
  onExportCsv?: () => void
}

function format(count: number, total: number, mode: CrosstabPercentMode): string {
  if (mode === 'count') return String(count)
  if (total === 0) return '0%'
  const pct = (count / total) * 100
  return `${pct.toFixed(pct >= 10 || pct === 0 ? 0 : 1)}%`
}

export function CrosstabsView({
  attributes,
  attr1Id, attr2Id, percentMode, topNRows, topNCols,
  result,
  onAttr1Change, onAttr2Change, onPercentModeChange,
  onTopNRowsChange, onTopNColsChange,
  onExportCsv,
}: Props) {
  const isReady = result !== null && result.rows.length > 0 && result.cols.length > 0
  const totalsByRow = result?.rowTotals ?? new Map<string, number>()
  const totalsByCol = result?.colTotals ?? new Map<string, number>()
  const grand = result?.grandTotal ?? 0

  const colHeaderTotals = useMemo(() => {
    if (!result) return [] as number[]
    return result.cols.map((c) => totalsByCol.get(c.key) ?? 0)
  }, [result, totalsByCol])

  const softCap =
    result &&
    (result.totalRowsBeforeTruncation > result.rows.length ||
     result.totalColsBeforeTruncation > result.cols.length)

  return (
    <div className="analyze-view crosstabs-view">
      <div className="analyze-view-toolbar">
        <label className="crosstab-attr-picker">
          <span>Attribute 1</span>
          <select
            value={attr1Id ?? ''}
            onChange={(e) => onAttr1Change(e.target.value || null)}
          >
            <option value="">— pick —</option>
            {attributes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="crosstab-attr-picker">
          <span>Attribute 2</span>
          <select
            value={attr2Id ?? ''}
            onChange={(e) => onAttr2Change(e.target.value || null)}
          >
            <option value="">— pick —</option>
            {attributes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <ChartViewToggle<CrosstabPercentMode>
          value={percentMode}
          ariaLabel="Crosstab values"
          options={[
            { value: 'count', label: 'Count' },
            { value: 'row',   label: 'Row %' },
            { value: 'col',   label: 'Col %' },
          ]}
          onChange={onPercentModeChange}
        />

        <TopNControlDual
          rowsLabel="Rows"
          colsLabel="Cols"
          rows={topNRows}
          cols={topNCols}
          rowsMin={TOP_N_BOUNDS.crosstabRows.min}
          rowsMax={TOP_N_BOUNDS.crosstabRows.max}
          colsMin={TOP_N_BOUNDS.crosstabCols.min}
          colsMax={TOP_N_BOUNDS.crosstabCols.max}
          onRowsChange={onTopNRowsChange}
          onColsChange={onTopNColsChange}
        />

        {onExportCsv ? (
          <button type="button" onClick={onExportCsv} disabled={!isReady}>⤓ CSV</button>
        ) : null}
      </div>

      {softCap && result ? (
        <div className="soft-cap-banner">
          Showing top {result.rows.length} of {result.totalRowsBeforeTruncation} codes
          and top {result.cols.length} of {result.totalColsBeforeTruncation} attribute combinations.
          Adjust the caps or narrow filters to see more.
        </div>
      ) : null}

      <div className="analyze-view-surface">
        {!attr1Id || !attr2Id ? (
          <div className="analyze-empty">Pick two attributes to build a crosstab.</div>
        ) : !isReady ? (
          <div className="analyze-empty">No data for the chosen attributes within the active filters.</div>
        ) : (
          <table className="analyze-table crosstab-table">
            <thead>
              <tr>
                <th rowSpan={2} className="crosstab-row-header">Code</th>
                {result!.cols.map((c) => (
                  <th key={c.key}><div>{c.col1}</div><div>{c.col2}</div></th>
                ))}
                <th rowSpan={2} className="crosstab-total">Total</th>
              </tr>
              <tr>
                {result!.cols.map((c) => (
                  <th key={`${c.key}-total`} className="crosstab-col-total">{colHeaderTotals[result!.cols.indexOf(c)]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result!.rows.map((row) => {
                const rowTotal = totalsByRow.get(row.id) ?? 0
                return (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    {result!.cols.map((col) => {
                      const cell = result!.cells.find(
                        (c) => c.rowId === row.id && c.col1Value === col.col1 && c.col2Value === col.col2,
                      )
                      const count = cell?.count ?? 0
                      const colTotal = totalsByCol.get(col.key) ?? 0
                      const denom = percentMode === 'row' ? rowTotal : percentMode === 'col' ? colTotal : 0
                      const text = format(count, denom, percentMode)
                      return (
                        <td key={col.key}>{text}</td>
                      )
                    })}
                    <td className="crosstab-total">
                      {format(rowTotal, grand, percentMode === 'col' ? 'count' : percentMode === 'row' ? 'count' : 'count')}
                    </td>
                  </tr>
                )
              })}
              <tr className="crosstab-total-row">
                <td className="crosstab-total">Total</td>
                {result!.cols.map((col) => (
                  <td key={`${col.key}-foot`} className="crosstab-total">
                    {totalsByCol.get(col.key) ?? 0}
                  </td>
                ))}
                <td className="crosstab-total">{grand}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check the new file**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no new errors. (If existing errors appear that are unrelated, ignore them but note them.)

- [ ] **Step 3: Commit**

```bash
git add src/analyze/CrosstabsView.tsx
git commit -m "feat(analyze): add CrosstabsView component"
```

---

## Task 4: Wire the panel into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

This task touches several spots in `App.tsx`. Apply each edit precisely. Each sub-step ends with a build check.

- [ ] **Step 1: Extend `AnalyzePanel` and import the new pieces**

Edit `src/App.tsx`:

Find this line (around line 42):

```ts
type AnalyzePanel = 'query' | 'matrix' | 'frequency' | 'cooccurrence'
```

Replace with:

```ts
type AnalyzePanel = 'query' | 'matrix' | 'frequency' | 'cooccurrence' | 'crosstab'
```

Find the analyze imports block (search for `from './analyze/MatrixView'`). Add these imports right below the `MatrixView` import:

```ts
import { CrosstabsView } from './analyze/CrosstabsView'
import { buildCrosstab, crosstabCsvRows, type CrosstabResult } from './analyze/crosstabs'
```

- [ ] **Step 2: Add state for the crosstab config**

Find the state block that contains `const [matrixColumnMode, setMatrixColumnMode]` (around line 773). Right after `setMatrixAttributeId`'s declaration, add:

```ts
const [crosstabAttr1Id, setCrosstabAttr1Id] = useState<string | null>(null)
const [crosstabAttr2Id, setCrosstabAttr2Id] = useState<string | null>(null)
const [crosstabPercentMode, setCrosstabPercentMode] = useState<'count' | 'row' | 'col'>('count')
const [crosstabTopNRows, setCrosstabTopNRows] = useState<number>(30)
const [crosstabTopNCols, setCrosstabTopNCols] = useState<number>(40)
```

- [ ] **Step 3: Compute crosstab result via useMemo**

Find the `matrixCellInputs` `useMemo` (around line 1466). After its closing `[matrixResults]` dependency array, add a new memo:

```ts
const crosstabResult = useMemo<CrosstabResult | null>(() => {
  if (!crosstabAttr1Id || !crosstabAttr2Id) return null
  return buildCrosstab({
    excerpts: analyzeResults,
    codes,
    cases,
    attributeValues,
    attr1Id: crosstabAttr1Id,
    attr2Id: crosstabAttr2Id,
    topNRows: crosstabTopNRows,
    topNCols: crosstabTopNCols,
  })
}, [
  analyzeResults, codes, cases, attributeValues,
  crosstabAttr1Id, crosstabAttr2Id, crosstabTopNRows, crosstabTopNCols,
])
```

- [ ] **Step 4: Add the sidebar button**

Find the line with the matrix sidebar button (search for `analyzePanel === 'matrix' ? 'active' : ''`, around line 2961). Add a sibling button right after the cooccurrence button (search forward for `'cooccurrence'`):

```tsx
<button className={analyzePanel === 'crosstab' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('crosstab')}>Crosstabs</button>
```

- [ ] **Step 5: Mount CrosstabsView in the analyze panel**

Find the closing block of `analyzePanel === 'cooccurrence'` rendering. After it, add:

```tsx
{analyzePanel === 'crosstab' && (
  <div className="analyze-panel">
    <CrosstabsView
      attributes={attributes.map((a) => ({ id: a.id, name: a.name }))}
      attr1Id={crosstabAttr1Id}
      attr2Id={crosstabAttr2Id}
      percentMode={crosstabPercentMode}
      topNRows={crosstabTopNRows}
      topNCols={crosstabTopNCols}
      result={crosstabResult}
      onAttr1Change={setCrosstabAttr1Id}
      onAttr2Change={setCrosstabAttr2Id}
      onPercentModeChange={setCrosstabPercentMode}
      onTopNRowsChange={setCrosstabTopNRows}
      onTopNColsChange={setCrosstabTopNCols}
      onExportCsv={() => {
        if (!crosstabResult) return
        const a1 = attributes.find((a) => a.id === crosstabAttr1Id)?.name ?? 'Attribute 1'
        const a2 = attributes.find((a) => a.id === crosstabAttr2Id)?.name ?? 'Attribute 2'
        const rows = crosstabCsvRows(crosstabResult, a1, a2)
        downloadCsv(rows, 'fieldnote-crosstabs.csv')
      }}
    />
  </div>
)}
```

> Note on click-to-drill: dropped from v1 entirely. Drilling into a cell would need three coordinated chips (the row's code plus both attribute values), and the existing analyze filter model holds only one attribute filter. Cells are display-only. Drill-down ships later when the filter model goes multi-attribute.

- [ ] **Step 6: Persist + hydrate crosstab config in saved queries**

Find the `serializeAnalyzeView` call site (around line 829). The serialized payload picks state from current values; we need the crosstab block to use our new state. Locate the construction of `analyzeView` for autosave:

Search for `analyzeView: serializeAnalyzeView(analyzeView)`. The component-level `analyzeView` state already includes a `crosstab` slot (we added the type in Task 1). Update where `setAnalyzeView` is called from saved-query restoration so the crosstab slice flows through:

Find `setAnalyzeView(definition.analyzeView ?? DEFAULT_ANALYZE_VIEW)` (around line 1887). Right after it, add:

```ts
const ct = (definition.analyzeView ?? DEFAULT_ANALYZE_VIEW).crosstab
setCrosstabAttr1Id(ct.attr1Id)
setCrosstabAttr2Id(ct.attr2Id)
setCrosstabPercentMode(ct.percentMode)
setCrosstabTopNRows(ct.topNRows)
setCrosstabTopNCols(ct.topNCols)
```

Find where `analyzeView` is built for saving (search for `setAnalyzeView(`). The autosave path uses the current `analyzeView` state object — we need to mirror local crosstab state into it. Add a `useEffect` right after the crosstab `useMemo` (Task 4 step 3):

```ts
useEffect(() => {
  setAnalyzeView((prev) => ({
    ...prev,
    crosstab: {
      attr1Id: crosstabAttr1Id,
      attr2Id: crosstabAttr2Id,
      percentMode: crosstabPercentMode,
      topNRows: crosstabTopNRows,
      topNCols: crosstabTopNCols,
    },
  }))
}, [crosstabAttr1Id, crosstabAttr2Id, crosstabPercentMode, crosstabTopNRows, crosstabTopNCols])
```

- [ ] **Step 7: Build + lint**

Run: `npm run lint && npm run build`
Expected: no errors related to the new code. (Pre-existing warnings in unrelated files can be ignored — note them but don't fix them in this task.)

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(analyze): wire crosstabs panel into App"
```

---

## Task 5: CSS for totals and crosstab table

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Append crosstab styles**

Append to `src/App.css`:

```css
/* Crosstabs analyze view */
.crosstabs-view .crosstab-attr-picker {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  margin-right: 8px;
}
.crosstabs-view .crosstab-attr-picker select {
  padding: 4px 6px;
  border: 1px solid #d6d8da;
  border-radius: 4px;
  background: #ffffff;
}
.crosstab-table th .crosstab-col-total {
  font-weight: 500;
  color: #5b6366;
}
.crosstab-table .crosstab-total {
  font-weight: 600;
  background: #f4f5f7;
}
.crosstab-table .crosstab-total-row td {
  border-top: 2px solid #d6d8da;
}
.crosstab-table th.crosstab-row-header {
  background: #fafbfc;
}
```

- [ ] **Step 2: Visual sanity check in dev**

Run: `npm run dev`
Open `http://127.0.0.1:5173/`. Sign in, open a project that has cases with at least two attributes set on multiple cases. Click **Analyze → Crosstabs**. Pick two attributes. Confirm:

1. Table renders with row-header column "Code", composite column headers showing both values, totals on right and bottom, grand total in the corner.
2. Toggle Count → Row % → Col % updates cells; totals row stays as raw counts.
3. Cells are display-only (no cursor change, no click effect) — this is intentional in v1.
4. CSV export downloads `fieldnote-crosstabs.csv` and opens cleanly in a spreadsheet.
5. Save the current setup as a query, switch to Matrix coding, reopen the saved query — crosstab config is restored.

Stop the dev server with Ctrl-C when done.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "style(analyze): crosstab table totals + attribute pickers"
```

---

## Task 6: Update `handoff.md`

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Update the Analyze section**

In `handoff.md`, find the bullet list under "### Analyze" describing implemented surfaces. Add a new bullet:

```md
- Crosstabs is implemented as a first MVP pass: codes × the cartesian product of two attributes, with row/column totals and a Count / Row % / Col % toggle. Missing values bucket into a `(none)` value. CSV export uses long-form rows (one per non-zero cell).
```

In the "Still needed" list under "## Mode Shell Status", remove the line:

```md
- M5.2 (crosstabs): codes × N attribute groups, totals, percentages.
```

In the "## Required Next Step" section, replace the M5.2 mention with text that points the next implementer at M6 (Report mode) as the next milestone. Specifically, change:

```md
Next implementation should pick up either:
- Milestone B (M6 Report mode): report preview / formatted Word/PDF outputs, reusing `src/analyze/exportImage.ts`.
- Or M5.2 (crosstabs) before Milestone B if the analysis depth matters more than report depth right now.
```

To:

```md
Next implementation should pick up M6 Report mode: report preview / formatted Word/PDF outputs, reusing `src/analyze/exportImage.ts`. Crosstab cells are display-only in v1 — adding click-to-drill requires extending the analyze filter model to multiple attribute filters (and applying the row's code at the same time). That work is a clean, scoped follow-up.
```

- [ ] **Step 2: Commit**

```bash
git add handoff.md
git commit -m "docs: mark M5.2 crosstabs implemented in handoff"
```

---

## Task 7: Final verification + push

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests PASS, including the new crosstab tests and the extended analyzeViewState tests.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean production build.

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```

- [ ] **Step 4: Confirm Vercel auto-deploy**

Open https://fieldnote-seven.vercel.app once Vercel finishes the build. Smoke-test crosstabs in production.

---

## Self-Review

- **Spec coverage:** all sections of the spec map to a task: cell semantics + missing values → Task 2; percentages + totals + soft cap → Tasks 3–4; CSV export → Tasks 2 & 4; saved-query persistence → Task 4; tests → Task 2. Click-to-drill is intentionally out of scope per the spec (display-only cells in v1) — the follow-up is documented in the handoff update in Task 6.
- **Placeholders:** none. Every code block is concrete.
- **Type consistency:** `CrosstabPercentMode` is defined in Task 1 and reused unchanged in Tasks 3–4. `CrosstabResult` exported from `crosstabs.ts` is consumed by `CrosstabsView.tsx` and `App.tsx`. Helper names (`buildCrosstab`, `crosstabCsvRows`, `CROSSTAB_NONE`, `CROSSTAB_COL_KEY_SEPARATOR`) match between Task 2 and downstream tasks.
