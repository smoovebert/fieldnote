# Phase 3b — Reader / Detail-View Migration Design

Status: approved 2026-04-29. Ready for implementation plan.

## Goal

Migrate the shared detail-view container + topbar to the new aesthetic, and restyle Code mode's transcript reader. Code mode's reader becomes a 64ch constrained Newsreader column with line numbers in a mono gutter, soft marker highlights using the bundle's gradient-band approach for multi-coded segments, plus a topbar / active-codes-bar split. Other modes' detail-view interiors are explicitly out of scope.

## Non-goals

- Per-mode polish: Organize source register, Refine code-edit, Classify case sheet, Analyze panels, Report exports — Phase 3d.
- Inspector / right rail restyle — Phase 3c.
- Speaker (Q/A) parsing in transcripts — feature work, not styling.
- Migrating existing user code colors to the bundle palette — preserved as-is per Q3b(iii).
- Dark-mode toggle UI — Phase 3e.

## Activation

All new rules are scoped under `.app-shell[data-shell="new"]`. The attribute is already set on `.app-shell` from Phase 3a. This phase extends the active scope; no new activation switch.

## Detail-view shell (shared across all modes)

`.detail-view` container restyle:

- Background: `var(--paper)`.
- Color: `var(--ink)`.
- Type: `font-family: var(--font-ui)` (Inter Tight) with the same antialiasing and feature-settings already in effect on the shell root.
- Hairlines: `1px solid var(--rule)` for borders, `var(--rule-soft)` for subtle internal dividers.

Other modes' interior content (Organize source register, Refine code-edit, Classify case sheet, Analyze, Report) inherits the new paper background and Inter Tight type but keeps its existing inner markup and styling. Each will get a polish pass in 3d.

## Detail-toolbar (shared across all modes)

The header at the top of the detail-view becomes:

```
[ Detail View eyebrow ]   [ DetailTitle (crumbs/source title) ]   [ Search ⌘K ]   [ Code selection (Code mode only) ]
```

- Eyebrow "Detail View" stays on the left, restyled with `font: var(--t-label)`, tracked uppercase, `--ink-3`.
- `DetailTitle` (existing element) retains its current behavior — it shows the active source title in Code mode, project title in Organize, etc.
- Search box restyles to `paper` background, `--rule` border, `--ink` text. Mono `⌘K` hint badge in `--ink-3`.
- **In Code mode only**: the "Code selection" primary button moves into the topbar's right side. CSS shows it via `.detail-toolbar .toolbar-code-action` and the JSX renders it conditional on `activeView === 'code'`.

## Code mode — active-codes-bar (new bar between topbar and reader)

```
[ Active codes title (e.g. "Access barriers") ]   ←   [ selection hint text underneath the title ]   |   [ Quick menu toggle (right) ]
```

- Title `font: var(--t-title)`, `--ink`.
- Hint `font: var(--t-ui-sm)`, `--ink-3`.
- Quick menu toggle stays as a checkbox+label, restyled.
- Background: `var(--paper)` (no separate panel surface).
- Bottom hairline: `1px solid var(--rule-soft)` separates the bar from the reader below.

The current `document-actions` div is replaced by this bar. The Code selection button is gone from this bar — it lives in the topbar now.

## Code mode — reader column

### Layout

- The detail-view's main content area centers a fixed-max-width reader column.
- Max-width: `var(--reader-measure)` (= 64ch).
- Padding: `var(--reader-pad-y) var(--reader-pad-x)` (= 56px / 56px).
- Outside the constrained column: `var(--paper)` background continues; no panel chrome.

### Metadata strip (per Q2c)

Sits inside the constrained column, immediately above the transcript:

```
{caseName || sourceKind} · {wordCount.toLocaleString()} words · {refCount} codes applied
```

- `font: var(--t-meta)`, `--ink-3`.
- Numbers use `font-feature-settings: "tnum", "zero"`.
- Separator: middle dot (`·`).
- Hidden if word count and ref count are both zero (e.g. fresh empty source).

### Typography

- Transcript text: `font: var(--t-reader)` (= `18px / 1.7 var(--font-reader)` — Newsreader, line-height 1.7).
- Color: `var(--ink)`.

### Line layout

Each `.transcript-line` becomes a 2-column grid:

```css
.transcript-line {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: var(--s-3);
  align-items: baseline;
}
```

- `.line-number`: mono, `--ink-3`, `text-align: right`, `font-feature-settings: "tnum", "zero"` for stable digits.
- `.line-text`: Newsreader, inherits the reader type tokens.

### Marker highlights (per Q3a(i))

`<mark>` rendering changes from the current shadow-stack approach to the bundle's `.fn-mark` shape:

- **Single code** — soft tinted background using the code's color:
  ```
  background: color-mix(in oklch, <code.color> 22%, transparent);
  padding: 1px 2px;
  margin: 0 -2px;
  border-radius: 1px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  ```
  No border, no inset shadow.

- **Multi-coded** — horizontal gradient bands with one band per code, each band a 22%-opacity tint of that code's color:
  ```
  background: linear-gradient(
    color-mix(in oklch, <code1.color> 22%, transparent) 0% 50%,
    color-mix(in oklch, <code2.color> 22%, transparent) 50% 100%
  );
  ```
  (For N codes: N bands, each occupies 100/N percent of the height.)
  Padding/margin/radius same as single-code.

The `title` attribute on the `<mark>` continues to list all code names (existing behavior preserved for hover tooltip).

### Quick code menu

Existing component restyles to use new tokens:

- Background: `var(--paper)`.
- Border: `1px solid var(--rule)`.
- Shadow: `var(--shadow-pop)`.
- Radius: `var(--r-3)`.
- Code chips inside use `.fn-chip` shape: `dot + name + (×)` with subtle hover.
- New-code field: paper background, `--rule` border.

No structural change — the menu's open/close logic, position, and contents stay the same.

## Default code color cycling (per Q3b(iii))

When the user creates a new code without specifying a color, cycle through these 8 OKLCH-based palette colors in order, wrapping:

```ts
const DEFAULT_CODE_PALETTE = [
  'oklch(0.62 0.10 195)',  // teal
  'oklch(0.66 0.08 220)',  // cyan
  'oklch(0.55 0.10 265)',  // indigo
  'oklch(0.55 0.10 315)',  // plum
  'oklch(0.62 0.10 20)',   // rose
  'oklch(0.72 0.09 75)',   // amber
  'oklch(0.62 0.08 150)',  // moss
  'oklch(0.55 0.04 240)',  // slate
] as const
```

Strategy: when adding a code, find the index `(existingCodes.length) % DEFAULT_CODE_PALETTE.length` and use that color. Existing user code colors are unchanged.

(The values mirror the bundle's `--c-*` token definitions in `tokens.css`.)

## Architecture

Pure CSS additions plus localized JSX edits in `App.tsx`. No new components, no new files. Same scoping pattern as 3a:

- New CSS rules appended to `App.css` under `.app-shell[data-shell="new"]`.
- JSX edits in `App.tsx`:
  1. `.detail-toolbar` topbar — add the conditional Code-selection button on the right.
  2. `.document-actions` block — replaced with `.active-codes-bar`.
  3. Metadata strip — new lines in the Code mode `<article className="document-panel">` block, above `<div className="transcript">`.
  4. `<mark>` rendering — replace inline `style={{ backgroundColor, borderColor, boxShadow }}` with `style={{ background }}` derived from `code.color` via `color-mix`. Keep the `title` attribute logic.
  5. Code-create handler — pick default color from `DEFAULT_CODE_PALETTE` if the new code has no color set.

## Files

**Modify:**
- `src/App.tsx` — JSX edits 1–5 above.
- `src/App.css` — append ~180 lines of scoped rules under `.app-shell[data-shell="new"]`.

**Create:** none.

## Testing

Manual:

1. Code mode → detail-view paper background; topbar has Detail View eyebrow + title + search + Code selection button (right).
2. Active-codes-bar below topbar shows active code title + selection hint + Quick menu toggle. Code selection button is gone from this bar (moved up to topbar).
3. Reader column is centered, max ~64ch wide, ~56px padding all around.
4. Metadata strip above transcript shows `case/sourceKind · {N} words · {N} codes applied` in mono numbers.
5. Transcript text renders in Newsreader at the reader-large type.
6. Line numbers in a 32px mono gutter, right-aligned.
7. Single-coded segment: soft tinted highlight in that code's color. Wrapping across lines preserves clean corners.
8. Multi-coded segment: horizontal bands of color, each ~22% opacity. Hover shows code names.
9. Quick code menu: paper-bg popup with new shadow + rule border. Code chips use new chip style.
10. Create a new code without specifying color → gets the next bundle palette color in sequence.
11. Existing codes' colors unchanged; their highlights now use the soft tinted style derived from their stored color.
12. Other modes (Organize/Refine/Classify/Analyze/Report) — detail-view shell goes paper, but inner content stays on legacy styling. No regressions.
13. Lint + build + tests clean.

No new unit tests required — pure presentation + a small color-cycling helper that's tested in dev by creating a few codes in sequence.

## Out-of-scope follow-ups

- Phase 3c — inspector / right rail panels.
- Phase 3d — per-mode interior polish (Organize / Refine / Classify / Analyze / Report).
- Phase 3e — dark-mode toggle UI.
- Speaker (Q/A) parsing in transcript text.
- Color-migration UI for existing codes (palette picker per code).
