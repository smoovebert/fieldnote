# M6 — Report Mode Design

Status: approved 2026-04-29. Ready for implementation plan.

## Goal

Report mode becomes a single comprehensive research report. The main pane shows a live HTML preview of the assembled report. Two primary actions in the topbar — `Export PDF` and `Export Word` — produce formatted, downloadable files from the same data model. The existing 6 raw-data exports move to the sidebar as a secondary "Raw data" cluster with CSV/XLSX format selection.

## Non-goals (v1)

- Per-section toggles or custom report builder.
- Embedded charts from Analyze (matrix / word frequency / co-occurrence images). Defer.
- Per-code "show all excerpts" view. Sample cap of 3 per code is fixed.
- Cover-page customization (logos, alt titles). Uses project title only.
- Multiple themes / styling presets. Single opinionated visual treatment.
- Server-side rendering — all client-side.

## Sections (fixed for v1)

1. **Cover** — project title, generation date (ISO YYYY-MM-DD), one-line summary stats: `{N} sources · {N} codes · {N} coded references · {N} cases`.
2. **Project memo** — the body of the project-linked memo. Section skipped if no project memo or its body is empty.
3. **Codebook** — every code with its description and reference count. Hierarchy preserved via indentation (one level — child codes prefixed `→ ` and indented). Sorted top-level codes alphabetically; children grouped under their parent. Skipped if codes is empty.
4. **Sample excerpts per code** — for each code that has at least one referencing excerpt, up to 3 sample excerpts. Per code: heading is the code name; the code's memo (if any) appears below the heading as flowing prose; samples render as styled pull-quotes with source attribution underneath. Sample selection: take the first 3 excerpts in storage order. Skipped if no codes have references.
5. **Cases** — each case profile: case name as a heading, description as flowing prose, attribute key/value pairs in a two-column block, linked sources as a bulleted list. Skipped if cases is empty.
6. **Source memos** — every source that has a non-empty memo body. Each entry: source title as a sub-heading, memo body as flowing prose. Skipped if no source memos.

Empty sections are silently skipped — no awkward "No data" placeholders. The cover stat line always renders even with zero counts.

## Architecture

### Pure data builder

`src/report/buildReport.ts`:

```ts
type ReportModel = {
  cover: { title: string; dateIso: string; counts: { sources: number; codes: number; references: number; cases: number } }
  projectMemo: string | null
  codebook: Array<{ id: string; name: string; description: string; refCount: number; depth: 0 | 1 }>
  sampleExcerpts: Array<{ code: { id: string; name: string }; codeMemo: string | null; samples: Array<{ excerptId: string; sourceTitle: string; text: string; note: string }> }>
  cases: Array<{ id: string; name: string; description: string; attributes: Array<{ name: string; value: string }>; sources: Array<{ id: string; title: string }> }>
  sourceMemos: Array<{ sourceId: string; sourceTitle: string; body: string }>
}

export function buildReport(input: BuildReportInput): ReportModel
```

`BuildReportInput` accepts the existing domain types from `src/lib/types.ts` plus `attributes`, `attributeValues`, `memos`, `projectTitle`. Pure — no React, no DOM, no async, deterministic except for the date which is passed as a parameter (default `new Date()`) so tests can pin it.

The 3-excerpts-per-code cap, the indentation depth, and the section-skip rules are encapsulated in this builder. Renderers (HTML preview, PDF, Word) all consume `ReportModel`; behavior changes happen here.

### Preview component

`src/report/ReportPreview.tsx` — pure presentational React component that renders a `ReportModel` as styled HTML inside Report mode's main pane.

- Body type: Newsreader (matches Code-mode reader for visual consistency across reading surfaces).
- Headings: Inter Tight (matches the rest of the app's UI).
- Generous left/right padding; max-width on the inner column matches the `--reader-measure` used in Code mode.
- Section endings include a `page-break-after: always` print rule so browser print and PDF render separate pages per section.
- Pull-quote styling for sample excerpts: tinted left border using the code's `color` (the same `color-mix` 22% tint used by marker highlights).
- Two-column attribute key/value blocks for cases.

The component is presentational only — no state, no side effects, no exports. Receives the model and renders it.

### PDF export

`src/report/exportPdf.ts`:

```ts
export async function exportReportPdf(model: ReportModel, projectTitle: string): Promise<void>
```

Uses `jspdf` (~50KB gzipped, dynamic import so it doesn't ship in the main bundle until first use). Walks the `ReportModel` and emits programmatic text + tables — selectable text in the output, multi-page natively, no rasterization.

Layout: Letter page, 0.75in margins, 11pt body, 14pt section headings, page breaks at section boundaries. The PDF is **not pixel-identical to the HTML preview** — both look like a professional report, neither matches the other byte-for-byte. Pixel-perfect mirror would require rasterizing the HTML which costs selectable text.

Filename: `fieldnote-${slugifiedTitle}-${dateIso}.pdf`. Downloaded via the existing `downloadBlob` helper from `src/analyze/exportImage.ts`.

### Word export

`src/report/exportDocx.ts`:

```ts
export async function exportReportDocx(model: ReportModel, projectTitle: string): Promise<void>
```

Uses `docx` (~150KB gzipped, dynamic import). Walks the same `ReportModel` and emits the package's `Document` / `Paragraph` / `HeadingLevel.HEADING_1`/`HEADING_2` / `Table` primitives. Output is an editable .docx that opens cleanly in Word, Google Docs, and Pages.

Filename: `fieldnote-${slugifiedTitle}-${dateIso}.docx`. Downloaded via `downloadBlob`.

### App.tsx wiring

In Report mode:

- Main pane: `<ReportPreview model={reportModel} />`. The current grid of `.report-card` buttons is removed from the main pane.
- `reportModel` is computed via `useMemo` from the project state.
- Topbar's right-side tools cluster gets two primary action buttons (Code-mode-style):
  - `Export PDF` → calls `exportReportPdf(reportModel, projectTitle)`.
  - `Export Word` → calls `exportReportDocx(reportModel, projectTitle)`.
- Sidebar in Report mode gets a new "Raw data" section listing the 6 existing raw exports as compact `.fn-sb-source`-style rows (using the existing handlers — `exportCsv`, `exportCodebookCsv`, `exportCaseSheetCsv`, `exportCaseExcerptCsv`, `exportAnalyzeCsv`, `exportMemosCsv`). A CSV/XLSX segmented control determines whether those handlers download `.csv` files or matching `.xlsx` workbooks.

The earlier hide-list-view-in-Report decision is reversed for this phase — the sidebar now has Raw-data content. The mode-aware sidebar logic is adjusted accordingly.

## Dependencies

- `jspdf` (^2.5+).
- `docx` (^8+).

Both lazy-loaded — `import('jspdf')` inside `exportReportPdf` so they don't ship in the main bundle. Initial bundle size unchanged; first export click loads the library on demand.

## Files

**Create:**
- `src/report/buildReport.ts` — data builder.
- `src/report/__tests__/buildReport.test.ts` — unit tests.
- `src/report/ReportPreview.tsx` — preview component.
- `src/report/ReportPreview.css` — scoped styles.
- `src/report/exportPdf.ts` — PDF exporter.
- `src/report/exportDocx.ts` — Word exporter.

**Modify:**
- `src/App.tsx` — Report-mode main pane swap, topbar export buttons, sidebar Raw-data section.
- `src/App.css` — minor: ensure topbar export buttons render correctly in Report mode (likely no change since they reuse existing primary-button styling).
- `package.json` — add `jspdf` and `docx`.

## Testing

**Unit (`src/report/__tests__/buildReport.test.ts`):**

- Empty project → cover renders zero counts; all other sections skipped.
- Project with sources, no codes → cover renders source count; codebook + samples + cases skipped; source memos render only for sources with memo bodies.
- Project with full data → all six sections present.
- Codebook hierarchy → top-level + child codes correctly depthed (0 / 1).
- Sample excerpts cap → code with 5 references emits 3 samples; code with 0 references is omitted from samples section.
- Source memos → empty memo bodies are skipped.
- Stat line counts match input data.

**Manual:**

1. Sign in to a project with sources, codes, excerpts, cases, attributes, memos.
2. Switch to Report mode → preview renders below the topbar; sections appear cleanly; no awkward placeholders for empty sub-data.
3. Click `Export PDF` → file downloads, opens in any PDF reader, sections present and paginated, text is selectable, code names + excerpt text are in selectable text (not images).
4. Click `Export Word` → file downloads, opens in Word/Google Docs/Pages as an editable doc; section headings styled as Word heading levels.
5. Sidebar `Raw data` section: each of the 6 raw-data rows works in both CSV and XLSX modes.

**No new component tests.** Preview is presentational; data is tested in the builder.

## Out-of-scope follow-ups

- Embedded Analyze charts in a "Methodology snapshot" section.
- Per-section toggles / custom report builder UI.
- Cover page customization.
- Markdown / LaTeX exporters (would slot in alongside PDF/Word using the same `ReportModel`).
- Linked references — the report has prose, not in-text citations linking back to specific excerpts in the app.
