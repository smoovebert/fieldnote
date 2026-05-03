# PDF page-anchored coding — design

**Status:** approved 2026-05-02. Implementation plan at `~/.claude/plans/snoopy-pondering-book.md`.

## Why

Fieldnote imports PDFs by extracting text via `pdfjs-dist`. The extractor inserts `--- Page N ---` markers between pages but the resulting string is treated as opaque content — the reader has no concept of pages, and excerpts coded against PDF sources cite by source title only.

Researchers can't do "page 3" citations. That's the single most common thing they want from a PDF in qualitative work, and it's the cheapest piece of the larger non-text-source-types thread (PDF, DOCX rich preview, audio/video, image regions).

This spec is the smallest correct step: a page-card reader for PDFs, page metadata on coded excerpts, page citations through every surface that today shows the source title.

## Design decisions

The brainstorm narrowed scope through six questions. Decisions made:

1. **Reader layout (Q1).** Pages render as a vertical stack of cards: `Page N of M` header per card, body underneath. One continuous scroll, just with card breaks. Picked over inline page markers (too subtle) and native PDF canvas render (too much UX rework for the wedge).

2. **Cross-page selections (Q2).** Forbidden. A coded excerpt lives on exactly one page. If the user drags across a page boundary, the selection is rejected with a hint. Picked over allowing page ranges (more bookkeeping, citation reads less cleanly) and auto-merging split sentences at import (fragile heuristics).

3. **Line numbering on PDF cards (Q3, revised).** Dropped entirely. PDFs don't carry stable line numbers; today's "lines" are an artifact of our reader's wrap width. Page is the only anchor. TXT/MD/DOCX keep the existing line-numbered reader. Citations read *"Interview 03, p. 5"* — no reader-line component.

4. **Beyond-page granularity (Q4).** Capture `charOffset: number` (offset into that page's text) silently at coding time. The citation in the report stays *"page N"*; navigation gets sharper because clicking an excerpt can scroll-and-highlight to the exact spot. Picked over page-only (loses click-to-jump precision) and visible paragraph numbers (mostly redundant with `charOffset`).

5. **Back-compat (Q5).** Parse on load, no migration, no backfill. New excerpts coded after this ships get `pageNumber` + `charOffset`. Existing excerpts keep `pageNumber: undefined` and cite by source title only until the user re-codes them. Picked over a one-time backfill (substring matches can be ambiguous) and forced re-import (annoying for projects with many PDFs).

6. **Page structure storage (Q6).** Derived at load with a pure parser; not stored. The `--- Page N ---` markers in `Source.content` are the source of truth. Picked over adding a `pages: jsonb` column (extra field to keep in sync; old sources need a fallback parser anyway).

## Data model

`Excerpt` gains two optional fields. Both undefined for non-PDF sources and for excerpts coded before this ships. No DB migration — `fieldnote_excerpts` already round-trips additional optional fields through the JSON layer.

```ts
export type Excerpt = {
  id: string
  codeIds: string[]
  sourceId: string
  sourceTitle: string
  text: string
  note: string
  pageNumber?: number   // 1-based; set only for PDF sources
  charOffset?: number   // 0-based offset into that page's text
}
```

No changes to `Source`, `SavedQuery`, `QueryResultSnapshot` (the snapshot's inner excerpt shape inherits from `Excerpt` and stays additive). Snapshots captured before this ships still load.

## Components

**Pure helpers (testable in isolation):**

- `src/lib/sourcePages.ts` — `parseSourcePages(content) → SourcePage[]`, `isPdfSource(content) → boolean`. Splits on the `--- Page N ---` markers; returns a single synthetic page for non-PDFs; returns `[]` for empty content; ignores malformed markers as text.
- `src/lib/excerptCitation.ts` — `formatExcerptCitation({ sourceTitle, pageNumber? }) → string`. Returns *"Source, p. N"* when `pageNumber` is set; *"Source"* otherwise.

**Reader (Code mode):**

- `src/modes/code/CodeDetail.tsx` branches on `isPdfSource(activeSource.content)`. PDF path renders `.pdf-pages` container with one `<section className="pdf-page" data-page={n}>` per parsed page; non-PDF path keeps the existing line-numbered transcript unchanged.
- Selection capture stays at the `<article>` level (existing `onMouseUp`/`onKeyUp`). New helpers `findPageForSelection` and `charOffsetWithinPage` walk the selection's anchor up to the surrounding `[data-page]` element and compute the offset.

**Coding flow:**

- `applyCodesToText` in `src/App.tsx` accepts an optional `pageInfo: { pageNumber, charOffset }` and writes it onto the new excerpt.
- The Code-mode reader's coding callsites (toolbar Code-selection button + quick-code menu Apply) compute `pageInfo` from the live selection. Cross-page selections are rejected with `setSelectionHint('Code one page at a time. Re-select within a single page.')` and the selection is cleared. Non-PDF sources omit `pageInfo`.

**Citation surfaces (every site swaps `excerpt.sourceTitle` for `formatExcerptCitation(excerpt)`):**

- Inspector "Coded excerpts" panel (`src/ReferenceList.tsx`).
- Header search results (Cmd+K, in `src/App.tsx` around line 3143).
- Refine references list and `referencesPreview` for the AI prompt input (`src/modes/refine/RefineDetail.tsx`).
- Report preview, PDF, and Word renderers' sample-excerpts and snapshot sections (`src/report/`).
- CSV/XLSX excerpt exports gain a `Page` column adjacent to `Source` (additive — existing spreadsheets keep parsing).

**Not changed:**

- AI prompt builders for `suggest_codes`, `draft_description`, `summarize_source`, `draft_memo` keep using bare `sourceTitle`. Page metadata isn't useful to the model and would just inflate token use.
- Saved-query persistence and the query filter shape — citations are a render concern, not a filter concern.

## Data flow

1. **Import** — unchanged. `readSourceFile` extracts PDF text and joins with `--- Page N ---` markers.
2. **Load project** — unchanged at the persistence layer.
3. **Open a PDF source in Code mode** — `CodeDetail.tsx` runs `parseSourcePages(activeSource.content)` (memoized per source content) and renders the page-card stack. Existing code highlights apply per page card.
4. **Code a selection** — handler computes `pageInfo` from the selection's anchor; if anchor and focus are in different pages, abort. Otherwise, `applyCodesToText(text, codeIds, label, pageInfo)` writes a new excerpt with `pageNumber` and `charOffset`. `setExcerpts` triggers autosave; the new excerpt persists like any other.
5. **Render any citation surface** — code calls `formatExcerptCitation(excerpt)` instead of reading `excerpt.sourceTitle` directly.
6. **Click an excerpt in the inspector** — handler scrolls the matching `[data-page]` card into view; if `charOffset` is set, finds the matching text node within the page and applies a transient highlight.

## Error handling

- **Import-time PDF extraction failure** — unchanged from today; the existing `readSourceFile` catch path applies.
- **Cross-page selection** — rejected with `setSelectionHint`. No partial excerpt created.
- **Selection that doesn't resolve to a page** (e.g. user clicks the page-card header gap) — `pageInfo` is `null`; existing behavior applies (excerpt without page metadata).
- **Stale `pageNumber` after a manual edit to `Source.content`** — out of scope. The reader doesn't currently support direct edits to source content; if it ever does, the page parser re-runs at next render.
- **Source with malformed or missing `--- Page N ---` markers** — `parseSourcePages` returns a single synthetic page (non-PDF behavior). Coding works; `pageNumber` defaults to `1`.

## Testing

Pure-function tests:

- `src/lib/__tests__/sourcePages.test.ts` — 1/2/many pages; missing markers; malformed markers; empty content.
- `src/lib/__tests__/excerptCitation.test.ts` — with and without `pageNumber`; missing source title.

Manual smoke test (verification section in the implementation plan):

- Code excerpts on multiple pages of a PDF; confirm `pageNumber` matches the card; confirm cross-page selection is rejected.
- Inspector, Cmd+K, Refine, Report (preview + PDF + Word), CSV all show `"Source, p. N"` for new excerpts and `"Source"` for pre-page excerpts.
- TXT/MD/DOCX sources unchanged.

## Out of scope

Listed explicitly so the implementation plan stays focused:

- Native PDF canvas render (the bigger UX rework — option C from the brainstorm).
- Preserving the original PDF binary in Supabase Storage.
- Backfilling `pageNumber` onto pre-existing excerpts (a small follow-up using the same parser if needed).
- Cross-page or page-range excerpts.
- Image regions, audio with transcript-linked playback, video.
- DOCX rich preview.
- Line-number derivation from PDF y-coordinates.
