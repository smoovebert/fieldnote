# Fieldnote M5.1 — Analyze Visualizations Design

- **Date:** 2026-04-29
- **Milestone:** M5 (Analysis depth) → sub-slice M5.1 (Visualizations)
- **Successors:** M5.2 (Crosstabs), M5.3 (Query result snapshots), Milestone B (M6 Report mode)
- **Status:** Design approved; awaiting implementation plan
- **Source plans:** `product-workflow-plan.md`, `data-model-plan.md` (Phase 4), `handoff.md`

## Why

The Fieldnote handoff names "crosstabs or analysis visualization scaffolding" as the next implementation pass for Analyze mode. Three analyses ship today (word frequency, code co-occurrence, matrix coding), all rendered as tables. Researchers can read the data but cannot *see* it. This slice adds rich visual layers to those existing analyses without changing the underlying computation, the schema, or the filter system.

The chosen direction is **rich charts** — each analysis gets two chart types plus the retained table view. "Analysis should be powerful" was the explicit framing. M5.2 (crosstabs) and M5.3 (saved query snapshots) follow as separate spec → plan → build cycles after this one ships.

## Scope

### In scope

- Two chart types per analysis, plus retained table view (3-way toggle).
- Per-analysis view state persisted on saved queries via `fieldnote_queries.definition.analyzeView` (no migration).
- PNG image export per chart, reusable by Milestone B (Report mode) for embedded charts in DOCX/PDF outputs.
- Top-N controls per chart and a soft-cap warning banner on the network view.
- Click-to-drill from any chart back into the existing filter system.
- New extracted modules under `src/analyze/` to avoid further bloating `App.tsx` (currently 3,645 lines).
- Vitest setup with unit tests for pure helpers (`analyzeViewState.ts`, `exportImage.ts`).

### Out of scope

- Crosstabs / advanced matrix coding (M5.2).
- Persisted `fieldnote_query_results` snapshots (M5.3).
- A dedicated `fieldnote_visualizations` table or first-class visualization objects.
- Print stylesheets for charts (Milestone B revisits).
- Animations / transitions when toggling views.
- Mobile or touch interaction optimizations.
- E2E tests, visual regression suites, multi-browser harnesses.
- Refactor of `App.tsx` beyond extracting the new viz code into modules.
- Internationalization of chart labels.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Tackle visualization slice first; crosstabs and snapshots follow as separate cycles | Charts make existing matrix and frequency outputs more legible — prerequisite for spotting where crosstabs add value. Snapshots earn their schema once usage patterns settle. |
| 2 | Each analysis gets two chart types: bar/cloud (word freq), heatmap/network (cooccur), heatmap/grouped-bars (matrix) | "Analysis should be powerful" — multiple cognitive views per analysis. |
| 3 | Single center surface, 3-way toggle (Table / Chart A / Chart B); no new tab, no permanent dual pane | Matches the handoff rule "deepen, don't widen." Matches the right-rail audit pattern of removing unrelated concepts from the work surface. |
| 4 | View state persisted on saved queries inside `fieldnote_queries.definition.analyzeView` JSON | No migration. Filter state already lives in `definition`. Researchers expect "back to where I left off" per analysis. |
| 5 | PNG export only; shared helper reusable in Milestone B for report-embedded charts | PNG covers ~95% of paste-into-doc use cases. Building it now de-risks Milestone B's report rendering integration. |
| 6 | Charts default for new queries; chart-A defaults are bar / heatmap / heatmap | Charts are the headline of M5.1 — tables-default would dilute the milestone's value. Heatmap > network at scale; heatmap is the canonical matrix-coding visual. |
| 7 | Top-N selectors per chart with soft warning on network past 20 codes; no hard caps elsewhere | Hard caps conflict with "powerful." Soft warnings teach without blocking. Heatmaps and bars degrade gracefully; network is the only one that breaks badly. |

## Architecture

### Module layout

All new code lives in `src/analyze/`. `App.tsx` imports a small surface and is otherwise untouched by chart logic.

```
src/analyze/
  ChartViewToggle.tsx      # 3-way segmented control (Table / Chart A / Chart B)
  TopNControl.tsx          # Stepper for the per-chart cap
  ExportImageButton.tsx    # PNG export, wraps a ref to the chart container
  WordFreqView.tsx         # switches Table / BarChart / WordCloud
  CooccurrenceView.tsx     # switches Table / Heatmap / NetworkGraph
  MatrixView.tsx           # switches Table / Heatmap / GroupedBars
  charts/
    BarChart.tsx           # Recharts wrapper
    Heatmap.tsx            # Recharts wrapper, shared by Cooccurrence and Matrix
    GroupedBars.tsx        # Recharts wrapper
    WordCloud.tsx          # react-wordcloud wrapper
    NetworkGraph.tsx       # react-force-graph-2d wrapper
  exportImage.ts           # html-to-image helper, returns PNG blob
  analyzeViewState.ts      # serialize / deserialize view+topN to query JSON
  __tests__/
    analyzeViewState.test.ts
    exportImage.test.ts
```

### Why this shape

- One file per *view* (analysis-level) and one per *chart primitive* — analyses can swap chart implementations without touching `App.tsx`.
- `Heatmap.tsx` is shared between Cooccurrence and Matrix views. Same data shape (rows × cols × intensity), one renderer, two callers.
- `analyzeViewState.ts` is pure and testable; it owns the persistence schema.
- `exportImage.ts` is pure (takes a ref, returns a blob). Milestone B can call it for report-embedded charts without a rebuild.

### Library choices

| Library | Use | Bundle (gzip est.) |
|---|---|---|
| `recharts` | Bars, heatmap (custom cell grid), grouped bars | ~85kb |
| `react-wordcloud` | Word cloud | ~30kb |
| `react-force-graph-2d` | Co-occurrence network | ~70kb |
| `html-to-image` | PNG export of DOM-based charts | ~20kb |

Estimates above are upper bounds (Recharts tree-shakes; only used chart types ship). Total bundle delta target: **≤250kb gzipped**, verified after `npm run build`. Reopen the design if measured delta exceeds this.

### App.tsx integration

`App.tsx` imports `WordFreqView`, `CooccurrenceView`, `MatrixView` and renders them where the existing analysis panels live. App.tsx holds session view state and merges persisted state on saved-query load. App.tsx never imports a chart library directly.

## Data Flow

### State layers

```
┌─────────────────────────────────────────────────────────────┐
│  Session state (App.tsx)                                    │
│    analyzeView = { wordFreq, cooccur, matrix }              │
└─────────────────────────────────────────────────────────────┘
            │                                  ▲
            │ Save query                       │ Load saved query
            ▼                                  │
┌─────────────────────────────────────────────────────────────┐
│  fieldnote_queries.definition (JSON, no migration)          │
│    { filters, analyzeView }                                 │
└─────────────────────────────────────────────────────────────┘
```

### Session state shape

```ts
type AnalyzeViewState = {
  wordFreq: { view: 'bar' | 'cloud' | 'table';        topN: number };
  cooccur:  { view: 'heatmap' | 'network' | 'table';  topN: number };
  matrix:   { view: 'heatmap' | 'bars' | 'table';
              topNRows: number; topNCols: number };
};
```

### Persistence rules

- `serialize(state)` returns the `analyzeView` sub-object that goes into `definition`.
- `deserialize(definition)` returns view state with safe defaults for any missing or malformed fields. **Never throws.** Logs `console.warn` on shape drift so we can spot regressions in production.
- `DEFAULT_ANALYZE_VIEW` is the single source of defaults: `bar / heatmap / heatmap` charts, top-N values per the UI section below.
- Toggling views does **not** mark the project dirty. Persistence happens only on explicit save/update of a saved query. Toggling is exploration, not authoring.

### Reading data

The three analyses already compute their result arrays client-side from the active filtered coded excerpts. Charts read those same arrays — no new computation, no new memoization layer. Filters drive both table and charts equivalently.

### Save/load semantics

- **Save query** → `serialize(state)` merged into `definition` alongside existing `filters`.
- **Load query** → `deserialize(definition)` merged into session state.
- **New / unsaved query** → session starts at `DEFAULT_ANALYZE_VIEW`.
- **Project reload** → toggle state resets unless user is reopening a saved query (by design).

## UI Behavior

### Toggle placement

Inside each analysis's center panel, top-right of the result area:

```
[ Word Frequency  ▾ ]                [Top: 25 ▾] [Bar | Cloud | Table] [⤓ PNG] [⤓ CSV]
─────────────────────────────────────────────────────────────────────────────────────
                              (chart or table renders below)
```

- Segmented control (three options is below the dropdown threshold).
- Bar leftmost (default), Table rightmost (researchers expect "raw view" on the right).
- Per-analysis — switching views in word frequency does not affect co-occurrence.

### Right rail under M5.1

No changes. Right rail keeps showing query summary, filters, and "Export active surface" — which now means PNG when chart is active, CSV when table is active. Rail audit is a separate later pass.

### Interactions per chart

| View | Hover | Click | Empty state |
|---|---|---|---|
| Bar (word freq) | Term, count, % of corpus | Filter to that term | "No terms yet — adjust filters" |
| Word cloud | Term, count | Filter to that term | "No terms yet — adjust filters" |
| Heatmap (cooccur) | Code A × Code B, pair count, sample excerpt | Filter to those two codes | "No co-occurring codes yet" |
| Network (cooccur) | Node: code, total connections; Edge: pair count | Filter to that code | "Network needs ≥ 2 connected codes" |
| Heatmap (matrix) | Code × case/attr, excerpt count, sample excerpt | Drill into subset | "Matrix needs cases or attribute values — go to Classify mode" |
| Grouped bars (matrix) | Code, case/attr, count | Drill into subset | Same as above |

Click-to-drill always adds a filter chip in the existing query system, removable via the existing chip-removal interaction.

### Top-N defaults

| Chart | Default | Min | Max |
|---|---|---|---|
| Word freq bar/cloud | 25 | 5 | 200 |
| Co-occurrence | 30 codes | 5 | 100 |
| Matrix | 30 rows × 30 cols | 5 each | 50 each |

### Network soft cap

When code count exceeds 20, the network view shows above the chart:

> *"Showing top 20 of N codes. Network view becomes hard to read past 20 — switch to Heatmap to see all data, or use filters to narrow."* `[Switch to Heatmap]`

Banner CTA flips the toggle to Heatmap in place. The network chart still renders the truncated top-N underneath.

### Loading state

All three analyses compute synchronously from filtered excerpts — no async loading. Charts render instantly. The only async work is PNG export, which shows an inline "Exporting…" state on the export button.

### Error fallback

Any unhandled chart error in any analysis falls back to the table view with banner:

> *"Chart unavailable — showing data table."*

Researchers always have a path forward.

### Color & accessibility

- Heatmaps: single-hue gradient (ColorBrewer Blues or Greens). No red-green.
- Categorical (network nodes, grouped bars): Tableau 10 palette.
- Tooltips and legends always rendered. Color is never the only cue.
- Heatmap cells include numeric labels above ~12px cell width.

## Library Risk & Spike

React 19 is recent (released late 2024). `react-wordcloud` and `react-force-graph-2d` are smaller-maintainer projects whose React 19 peer-dep support is empirical, not documented.

### Spike step (before plan-writing)

1. Install each candidate against React 19 in a throwaway branch.
2. Render a smoke chart with fixture data.
3. Verify no peer-dep warnings or runtime errors.
4. If any fail, swap to alternates:
   - `react-wordcloud` → `@visx/wordcloud` (React-version-agnostic, slightly more wiring).
   - `react-force-graph-2d` → `vis-network` or a small custom d3-force component.

Spike outcome documented in the implementation plan; library choices are provisional until the spike passes.

## Edge Cases

| Scenario | Behavior |
|---|---|
| Filtered excerpts → empty | Empty state per chart; export buttons disabled |
| Word freq with 1 source, 1 sentence | Bar shows ≤5 bars; cloud renders; both fine |
| Co-occurrence: only 1 code applied | Network shows single node + soft message; heatmap shows 1×1 cell |
| Co-occurrence: no co-occurring pairs | Heatmap is empty grid; network shows isolated nodes only |
| Matrix: no cases AND no attributes | Empty state with deep link to Classify mode |
| Matrix: cases exist but no codes applied | Empty grid + "No coded references in scope yet" |
| Top-N exceeds available items | Stepper clamps silently; no error |
| User toggles to Network past soft cap | Banner shown, chart still renders truncated top-N |
| User saves query while chart is empty | Saved query stores view choice anyway; consistent on reopen |
| Saved query made before this slice | `deserialize` returns `DEFAULT_ANALYZE_VIEW`; loads cleanly |

## PNG Export Path

- Each chart wrapper accepts an optional `containerRef`.
- `ExportImageButton` calls `htmlToImage.toPng(ref.current, { pixelRatio: 2 })` for retina-quality output.
- Filename format: `fieldnote-{analysis}-{viewType}-{ISO-date}.png`, e.g. `fieldnote-cooccurrence-heatmap-2026-04-29.png`.
- Word cloud and network graph render to `<canvas>` natively — those wrappers expose the canvas directly and call `canvas.toBlob` instead of html-to-image (faster, lossless).

### Export failure modes

- `html-to-image` failure: catch, show inline toast *"Couldn't export this chart. Try another view."*, no destructive action.
- Tainted canvas (shouldn't happen with in-app rendering): same toast.
- Export button disabled while empty state is showing.

## Performance Ceilings

- Heatmap: pure DOM/SVG cells. Tested mentally up to 50 × 50 = 2,500 cells — Recharts handles this. Past that, switch to canvas (out of scope; flagged as future work if hit).
- Network: react-force-graph-2d caps comfortably around 50 nodes with edges. Soft cap at 20 codes keeps us well below.
- Word cloud: d3-cloud is O(n²) on layout iterations. 100-term cap on stepper is the natural ceiling.

## Testing & Verification

### Unit tests (Vitest, new dev dependency)

```
src/analyze/__tests__/
  analyzeViewState.test.ts
    - serialize() round-trips through deserialize()
    - deserialize(undefined)            → DEFAULT_ANALYZE_VIEW
    - deserialize({})                   → DEFAULT_ANALYZE_VIEW
    - deserialize(legacy query JSON)    → DEFAULT_ANALYZE_VIEW
    - deserialize(partial analyzeView)  → fills missing keys
    - deserialize(malformed shape)      → DEFAULT_ANALYZE_VIEW + console.warn
    - clampTopN respects min/max bounds
  exportImage.test.ts
    - buildExportFilename returns expected string
    - error path returns null, doesn't throw
```

### Quality gates

- `npm run lint` passes with no new warnings.
- `npm run build` passes; bundle-size delta documented in the implementation plan.
- `npx vitest run` passes.

### Manual checklist (run on `npm run dev`, then again on production after deploy)

```
[ ] Word frequency: bar chart renders with seed data
[ ] Word frequency: word cloud renders, no overflow
[ ] Word frequency: table renders (regression check)
[ ] Co-occurrence: heatmap renders with hover tooltip
[ ] Co-occurrence: network renders, drag node works
[ ] Co-occurrence: table renders (regression check)
[ ] Matrix: heatmap renders for codes × cases
[ ] Matrix: heatmap renders for codes × attribute values
[ ] Matrix: grouped bars renders
[ ] Matrix: table renders (regression check)
[ ] Toggle persists view across page reload of a saved query
[ ] Toggle does NOT mark project dirty (autosave doesn't fire)
[ ] PNG export downloads valid file for each chart variant
[ ] Empty state shows for each analysis when filters return nothing
[ ] Network soft-cap banner appears at 21+ codes; "Switch to Heatmap" works
[ ] Click-to-drill on each chart adds the expected filter
[ ] Click-to-drill is reversible via existing filter chip removal
[ ] Existing CSV export still works alongside new PNG export
[ ] Saved queries created BEFORE this slice still load with default views
[ ] Lint + build + tests all green
```

### Production smoke

After `npx vercel deploy --prod -y`, run the manual checklist against `https://fieldnote-seven.vercel.app` with a real project.

## Done Definition

- All checklist items pass on production deploy.
- No new ESLint warnings.
- Bundle delta documented in the implementation plan.
- `data-model-plan.md` updated to document the `analyzeView` JSON shape under Phase 4.
- `handoff.md` updated to reflect M5.1 shipped with link to next slice (M5.2 crosstabs).

## Future Slices Anticipated By This Design

- **M5.2 (Crosstabs):** Reuses `ChartViewToggle`, `TopNControl`, `Heatmap`, and `GroupedBars` primitives. The matrix view's existing data shape (rows × cols × intensity) is the foundation for richer cross-tabulation.
- **M5.3 (Query result snapshots):** Adds `fieldnote_query_results` table; saved query reload behavior already established here extends naturally to "load a snapshot" semantics.
- **Milestone B (Report mode):** Calls `exportImage.ts` directly to embed charts in DOCX/PDF outputs. Renderer ships here; report mode wires it.
- **Eventually `fieldnote_visualizations`:** When viz configs need to be first-class objects (named, shareable, multiple per query). Current design defers this — one JSON field per saved query is sufficient until then.
