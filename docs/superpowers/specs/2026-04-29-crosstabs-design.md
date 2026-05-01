# M5.2 Crosstabs — Design

Status: approved 2026-04-29. Ready for implementation plan.

## Goal

Add a Crosstabs analyze surface that shows **codes × the cartesian product of two attribute values**, with totals, percentages, and CSV export. Closes the M5.2 milestone in `handoff.md`.

## Non-goals (v1)

- More than two attributes per crosstab. Side-by-side multi-attribute comparison is a separate future view.
- Heatmap or chart views — table only.
- Grand-total percentage mode (only Count / Row % / Col %).
- Column truncation by anything other than total count.

## User-facing shape

A new top-level Analyze surface, sibling to Matrix coding / Word frequency / Co-occurrence.

**Toolbar**

- Attribute picker 1 (`attr1Id`), required.
- Attribute picker 2 (`attr2Id`), required.
- Percent mode toggle: **Count / Row % / Col %**.
- Top-N row control (codes, default 30, max 30).
- Top-N column control (cartesian-product columns, default 40, max 40).
- CSV export button.

**Table**

- Rows: codes.
- Columns: each unique pair of attribute values that occurs in the data, formatted as `${attr1Value} / ${attr2Value}`.
- Right-most "Total" column (row totals).
- Bottom "Total" row (column totals).
- Bottom-right cell: grand total.
- Empty cells render as `0` (or `0%` in percentage modes), never blank.

**Interaction**

- Cells are **display-only in v1** — there is no click-to-drill. Drilling correctly requires three filter chips at once (the row's code, `attr1 = v1`, and `attr2 = v2`), and the existing analyze filter model holds only a single attribute filter and was not designed to accept three coordinated chips from one click. Adding click-to-drill is a follow-up that depends on extending the analyze filter model to multi-attribute filters.
- Toolbar percent mode switches the cell rendering only; underlying counts are unchanged.

## Cell semantics

A cell at *(code C, attr1 = v1, attr2 = v2)* counts the **number of coded references** where:

1. The reference is tagged with code `C`, AND
2. The reference's source is linked to a case whose attribute values include `attr1 = v1` AND `attr2 = v2`, AND
3. The reference passes the currently active analyze filters (text search, code filters, case filters, attribute/attribute-value filters).

Multi-coded references are counted once per matching code (matches the existing Matrix view semantic).

### Missing attribute values

If a case has no value for `attr1` (or `attr2`), references from sources linked to that case are bucketed into a `(none)` value for that attribute. The `(none)` value participates in totals but is not clickable for drill-down (see Interaction note above).

If a source has no linked case at all, its references are excluded from the crosstab. (A source with no case has no attribute values; including it would require an additional `(no case)` semantic that we don't need yet.)

### Percentages

- **Row %:** cell / row total. Each row's non-total cells sum to 100 %.
- **Col %:** cell / col total. Each column's non-total cells sum to 100 %.
- Totals render as `100 %` in their own row/column when in percent mode. Grand total cell is always the raw count.

## Architecture

### Files

- New: `src/analyze/CrosstabsView.tsx` — component, follows `MatrixView` shape.
- New: `src/analyze/crosstabs.ts` — `buildCrosstabCells()` helper plus types. Lives alongside other analyze utilities so `App.tsx` does not grow further.
- New: `src/analyze/__tests__/crosstabs.test.ts` — unit tests for the builder.
- Modified: `src/analyze/analyzeViewState.ts` — add `'crosstab'` to analyze view union, add `CrosstabConfig`, add `TOP_N_BOUNDS.crosstabRows` (30) and `crosstabCols` (40).
- Modified: `src/App.tsx` — left-rail entry under Analyze, switch case in the analyze panel, hydrate/persist crosstab config, autosave dependency, drill-down wiring, CSV export wiring.
- Modified: `src/App.css` — totals row/column styling (bold, subtle border) if the existing `.analyze-table` rules don't already cover it.

### Builder contract

```ts
type CrosstabBuilderInput = {
  excerpts: Excerpt[]            // already filtered by active analyze filters
  codes: Code[]
  cases: Case[]
  attributeValues: AttributeValue[]   // passed alongside cases — the app stores them in a separate array
  attr1Id: string
  attr2Id: string
  topNRows: number
  topNCols: number
}

type CrosstabCell = {
  rowId: string                  // code id
  rowLabel: string               // code name
  col1Value: string              // attr1 value (or '(none)')
  col2Value: string              // attr2 value (or '(none)')
  count: number
}

type CrosstabResult = {
  rows: { id: string; label: string }[]      // truncated to topNRows by row total desc
  cols: { col1: string; col2: string; key: string }[]  // truncated to topNCols by col total desc
  cells: CrosstabCell[]                       // dense — every (row, col) pair, count may be 0
  rowTotals: Map<string, number>              // by rowId
  colTotals: Map<string, number>              // by composite key
  grandTotal: number
  // diagnostics for soft-cap banner
  totalRowsBeforeTruncation: number
  totalColsBeforeTruncation: number
}
```

The composite column key is `${col1Value}${SEP}${col2Value}` where SEP is U+001F (Unit Separator, ASCII control char). U+001F was chosen because text inputs cannot produce it — the collision class is closed without needing input validation. (An earlier draft used U+2225/∥ and proposed rejecting that value from attribute inputs; that approach was abandoned in favor of the unforgeable separator.)

### State

In `App.tsx`:

```ts
const [crosstabConfig, setCrosstabConfig] = useState<CrosstabConfig>({
  attr1Id: null,
  attr2Id: null,
  percentMode: 'count',
})
const [crosstabTopNRows, setCrosstabTopNRows] = useState(30)
const [crosstabTopNCols, setCrosstabTopNCols] = useState(40)
```

Crosstab cells are derived via `useMemo` from filtered excerpts + cases + the two attribute IDs.

### Saved queries

- `definition.crosstab: CrosstabConfig` is added to the saved-query schema.
- Legacy queries with no `crosstab` deserialize with `{ attr1Id: null, attr2Id: null, percentMode: 'count' }`.
- Saving a query while on the Crosstab view persists the current config; opening such a query restores it.
- No DB migration needed — `fieldnote_queries.definition` is `jsonb`.

### CSV export

Long-form, one row per non-zero cell:

```
Code, <Attr1Name>, <Attr2Name>, Count
```

`<Attr1Name>` / `<Attr2Name>` are the attribute display names looked up at export time. `(none)` is written as the literal string `(none)`. CSV export is gated on a non-empty result set.

### Soft cap behaviour

If `totalColsBeforeTruncation > topNCols`, render a soft-cap banner above the table:

> Showing the top {topNCols} of {totalColsBeforeTruncation} attribute combinations. Adjust the column cap or narrow filters to see more.

Same pattern as the existing network-graph soft cap.

## Testing

Unit tests in `__tests__/crosstabs.test.ts`:

1. Empty inputs → empty result.
2. Single excerpt with both attribute values present → 1 row, 1 col, count 1.
3. Multi-coded reference → contributes to each of its codes' rows.
4. Case missing `attr1` → bucketed into `(none) / v2`.
5. Case missing both attributes → bucketed into `(none) / (none)`.
6. Source without a case → excluded.
7. Filter intersection — excerpts already excluded by upstream filters do not appear (caller-side responsibility, but confirm builder does not re-include them).
8. Top-N truncation — when more rows/cols exist than the cap, truncated by total count desc, and `totalRowsBeforeTruncation` / `totalColsBeforeTruncation` reflect pre-truncation counts.
9. Row total + column total + grand total math.

Manual / visual checks in dev:

- Toggle Count → Row % → Col % updates cells; totals stay in sync.
- Click a cell adds the two filter chips.
- Save a query on Crosstab view, switch to Matrix, reopen the saved query — config restored.
- CSV export opens cleanly in Excel; `(none)` survives as a literal value.

## Out of scope follow-ups

- Heatmap of crosstab counts (would need single-value-per-cell, so percent toggle would have to choose).
- 3+ attribute crosstabs.
- **Click-to-drill on a cell**, which requires extending the analyze filter model to hold a second attribute filter (and applying the row code at the same time). This is the natural follow-up once the filter model is multi-attribute.
- Coded-excerpt query result snapshots shipped later in M5.3. Crosstab snapshots remain a follow-up via the existing `result_kind` discriminator.
