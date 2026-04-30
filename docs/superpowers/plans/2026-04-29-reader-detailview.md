# Phase 3b — Reader / Detail-View Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the shared detail-view shell + topbar to the new aesthetic, and restyle Code mode's transcript reader with a 64ch constrained Newsreader column, mono-gutter line numbers, soft-tinted marker highlights using gradient bands for multi-coded segments, and a topbar / active-codes-bar split.

**Architecture:** All new rules scoped under `.app-shell[data-shell="new"]` (already active from Phase 3a). JSX edits in `App.tsx` move the Code-selection button into the topbar, replace `.document-actions` with `.active-codes-bar`, add a metadata strip above the transcript, and switch `<mark>` rendering from shadow-stack to single-color or gradient-band fill. Default code colors swap to the bundle's 8-OKLCH palette.

**Tech Stack:** React + TypeScript + Vite. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-29-reader-detailview-design.md`

---

## File Structure

**Modify:**
- `src/App.tsx` — palette swap in `buildNewCode`; topbar restructure (conditional Code-selection button); `.document-actions` → `.active-codes-bar`; metadata strip above transcript; `<mark>` rendering swap.
- `src/App.css` — append ~180 lines of scoped rules under `.app-shell[data-shell="new"]`.

**Create:** none.

---

## Task 1: Swap default code palette to bundle OKLCH colors

**Files:**
- Modify: `src/App.tsx`

This is a one-function change. Existing codes' stored colors are unchanged; only NEW codes get the new palette.

- [ ] **Step 1: Replace the palette in `buildNewCode`**

Find (around line 1672):

```ts
function buildNewCode(name: string, parentCodeId?: string): Code {
  const palette = ['#d9892b', '#2f7ebc', '#9b5a9f', '#5c8f42', '#c45173']
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name,
    color: palette[codes.length % palette.length],
    description: 'New research code. Add a short meaning once the pattern becomes clear.',
    parentCodeId,
  }
}
```

Replace with:

```ts
function buildNewCode(name: string, parentCodeId?: string): Code {
  // Bundle palette — 8 OKLCH colors at shared chroma 0.10 with hue varied.
  // Mirrors the --c-* tokens in src/styles/tokens.css.
  const palette = [
    'oklch(0.62 0.10 195)',  // teal
    'oklch(0.66 0.08 220)',  // cyan
    'oklch(0.55 0.10 265)',  // indigo
    'oklch(0.55 0.10 315)',  // plum
    'oklch(0.62 0.10 20)',   // rose
    'oklch(0.72 0.09 75)',   // amber
    'oklch(0.62 0.08 150)',  // moss
    'oklch(0.55 0.04 240)',  // slate
  ]
  return {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name,
    color: palette[codes.length % palette.length],
    description: 'New research code. Add a short meaning once the pattern becomes clear.',
    parentCodeId,
  }
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: clean. 52 tests pass. App renders unchanged because the palette only affects newly created codes.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(code): default new-code colors to bundle OKLCH palette"
```

---

## Task 2: Topbar restructure, active-codes-bar, metadata strip, marker rendering

**Files:**
- Modify: `src/App.tsx`

Several JSX edits inside the Code-mode `document-panel` block and the `.detail-toolbar` header. After this task, classes like `.toolbar-code-action`, `.active-codes-bar`, `.reader-column`, `.reader-meta-strip` exist in the DOM but have no scoped rules yet. The app still renders functionally; visuals settle once Task 3's CSS lands.

- [ ] **Step 1: Add Code-selection button to the topbar (conditional on Code mode)**

Find the `.detail-toolbar` block (around line 2603):

```tsx
<header className="detail-toolbar">
  <div>
    <p className="eyebrow">Detail View</p>
    <DetailTitle
      activeView={activeView}
      activeSource={activeSource}
      activeCode={activeCode}
      projectTitle={projectTitle}
      onProjectTitleChange={updateProjectTitle}
      onSourceTitleChange={(title) => updateSource(activeSource.id, { title })}
      onCodeNameChange={(name) => setCodes((current) => current.map((code) => (code.id === activeCode.id ? { ...code, name } : code)))}
    />
  </div>

  {activeView !== 'analyze' && (
    <div className="search-box">
      <Search size={17} aria-hidden="true" />
      <input value={searchTerm} placeholder="Find coded work" aria-label="Search coded work" onChange={(event) => setSearchTerm(event.target.value)} />
    </div>
  )}
</header>
```

Replace with:

```tsx
<header className="detail-toolbar">
  <div>
    <p className="eyebrow">Detail View</p>
    <DetailTitle
      activeView={activeView}
      activeSource={activeSource}
      activeCode={activeCode}
      projectTitle={projectTitle}
      onProjectTitleChange={updateProjectTitle}
      onSourceTitleChange={(title) => updateSource(activeSource.id, { title })}
      onCodeNameChange={(name) => setCodes((current) => current.map((code) => (code.id === activeCode.id ? { ...code, name } : code)))}
    />
  </div>

  <div className="detail-toolbar-tools">
    {activeView !== 'analyze' && (
      <div className="search-box">
        <Search size={17} aria-hidden="true" />
        <input value={searchTerm} placeholder="Find coded work" aria-label="Search coded work" onChange={(event) => setSearchTerm(event.target.value)} />
      </div>
    )}
    {activeView === 'code' && (
      <button type="button" className="primary-button toolbar-code-action" onClick={() => codeSelection()}>
        <Highlighter size={18} aria-hidden="true" />
        Code selection
      </button>
    )}
  </div>
</header>
```

The new `.detail-toolbar-tools` wrapper holds the search box and the (Code-mode-only) Code-selection button so the existing `.detail-toolbar` 2-column flex layout keeps working.

- [ ] **Step 2: Replace `document-actions` with `active-codes-bar` and add metadata strip**

Find the Code-mode block (around line 2673):

```tsx
{activeView === 'code' && (
  <article className="document-panel">
    <div className="document-actions">
      <div>
        <strong>{selectedCodeNames}</strong>
        <p>{selectionHint} Active codes can be combined.</p>
      </div>
      <div className="coding-action-group">
        <label className="quick-toggle">
          <input
            type="checkbox"
            checked={quickCodingEnabled}
            onChange={(event) => {
              setQuickCodingEnabled(event.target.checked)
              setQuickCodeMenu(null)
            }}
          />
          Quick menu
        </label>
        <button type="button" className="primary-button" onClick={() => codeSelection()}>
          <Highlighter size={18} aria-hidden="true" />
          Code selection
        </button>
      </div>
    </div>

    <div className="transcript" ref={transcriptRef} aria-label="Source text with line numbers" onMouseUp={captureQuickCodeSelection} onKeyUp={captureQuickCodeSelection}>
```

Replace with:

```tsx
{activeView === 'code' && (
  <article className="document-panel">
    <div className="active-codes-bar">
      <div className="active-codes-bar-text">
        <strong className="active-codes-title">{selectedCodeNames}</strong>
        <p className="active-codes-hint">{selectionHint} Active codes can be combined.</p>
      </div>
      <label className="quick-toggle">
        <input
          type="checkbox"
          checked={quickCodingEnabled}
          onChange={(event) => {
            setQuickCodingEnabled(event.target.checked)
            setQuickCodeMenu(null)
          }}
        />
        Quick menu
      </label>
    </div>

    <div className="reader-column">
      <div className="reader-meta-strip fn-meta">
        <span>{activeSource.caseName || activeSource.kind}</span>
        <span aria-hidden="true">·</span>
        <span>{readerWordCount.toLocaleString()} words</span>
        <span aria-hidden="true">·</span>
        <span>{readerRefCount} codes applied</span>
      </div>

      <div className="transcript" ref={transcriptRef} aria-label="Source text with line numbers" onMouseUp={captureQuickCodeSelection} onKeyUp={captureQuickCodeSelection}>
```

Two **new local variables** are required for the metadata strip — `readerWordCount` and `readerRefCount`. Add them just above the `return (` at the end of the Code-mode block (or in a `useMemo` near the existing transcript memo). A useful spot is right next to `highlightedTranscriptLines`:

Find `const highlightedTranscriptLines = useMemo(...)` (around line 1570). Immediately above it, add:

```ts
const readerWordCount = useMemo(() => {
  const text = activeSource.content || ''
  return text.split(/\s+/).filter(Boolean).length
}, [activeSource.content])

const readerRefCount = useMemo(() => {
  return excerpts.filter((e) => e.sourceId === activeSource.id).length
}, [excerpts, activeSource.id])
```

- [ ] **Step 3: Close the new `<div className="reader-column">` correctly**

The original markup had a single `<div className="transcript">…</div>` ending the Code-mode block. The replacement above wraps that div in a new `<div className="reader-column">` plus the metadata strip — so we need to ensure both divs close.

Find the end of the existing transcript block — search for `</article>` after the long transcript JSX. Just before that `</article>`, add a closing `</div>` to close the new `.reader-column`:

```tsx
            ))}
          </div>{/* end .transcript */}
        </div>{/* end .reader-column — NEW */}
      </article>
```

(The trailing `</article>` closes the `.document-panel` and remains unchanged.)

- [ ] **Step 4: Update `<mark>` rendering — swap inline shadow-stack for single-color or gradient-band fill**

Find the `<mark>` rendering (around line 2709):

```tsx
piece.codes ? (
  <mark
    key={`${piece.text}-${lineIndex}-${pieceIndex}`}
    className="multi-code-mark"
    style={{
      backgroundColor: `${piece.codes[0].color}28`,
      borderColor: piece.codes[0].color,
      boxShadow: piece.codes
        .slice(1, 4)
        .map((code, shadowIndex) => `inset 0 ${-2 - shadowIndex * 3}px 0 ${code.color}70`)
        .join(', '),
    }}
    title={piece.codes.map((code) => code.name).join(', ')}
  >
    {piece.text}
  </mark>
) : (
```

Replace with:

```tsx
piece.codes ? (
  <mark
    key={`${piece.text}-${lineIndex}-${pieceIndex}`}
    className="multi-code-mark"
    style={markBackground(piece.codes)}
    title={piece.codes.map((code) => code.name).join(', ')}
  >
    {piece.text}
  </mark>
) : (
```

Add the `markBackground` helper near the top of `App.tsx` (after the `Excerpt` type, around line 150 — or wherever feels right; just keep it module-scoped, not inside the App component):

```ts
function markBackground(codes: { color: string }[]): React.CSSProperties {
  if (codes.length === 1) {
    return {
      background: `color-mix(in oklch, ${codes[0].color} 22%, transparent)`,
    }
  }
  const stops = codes
    .map((c, i) => {
      const a = (i * 100) / codes.length
      const b = ((i + 1) * 100) / codes.length
      const tint = `color-mix(in oklch, ${c.color} 22%, transparent)`
      return `${tint} ${a}% ${b}%`
    })
    .join(', ')
  return { background: `linear-gradient(${stops})` }
}
```

If `React` isn't already imported at the top of `App.tsx`, add `import type React from 'react'` (or use `CSSProperties` from React directly: `import type { CSSProperties } from 'react'` and change the return type).

- [ ] **Step 5: Verify**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. 52 tests pass.

The app should render — the new bars and metadata strip will appear unstyled (with default browser styling) because Task 3's CSS hasn't landed. That's expected.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(code): topbar restructure + reader meta strip + tinted marker fill"
```

---

## Task 3: Scoped CSS for detail-view + reader

**Files:**
- Modify: `src/App.css`

All new rules scoped under `.app-shell[data-shell="new"]`. Append at the very end of the file.

- [ ] **Step 1: Append the new CSS block**

Append:

```css

/* ============================================================
   Phase 3b — Reader / Detail-View — scoped under [data-shell="new"]
   Other modes' interior content (Organize/Refine/Classify/Analyze/
   Report) keeps its current styling until Phase 3d.
   ============================================================ */

/* ----- Detail-view shell (shared across all modes) ------------------ */
.app-shell[data-shell="new"] .detail-view {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
}

.app-shell[data-shell="new"] .detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
}

.app-shell[data-shell="new"] .detail-toolbar .eyebrow {
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 2px;
  font-size: 10px;
}

.app-shell[data-shell="new"] .detail-toolbar-tools {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.app-shell[data-shell="new"] .detail-toolbar .search-box {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-1) var(--s-3);
  border: 1px solid var(--rule);
  border-radius: var(--r-3);
  background: var(--paper);
  color: var(--ink-3);
  min-width: 220px;
}

.app-shell[data-shell="new"] .detail-toolbar .search-box input {
  border: 0;
  background: transparent;
  color: var(--ink);
  font: var(--t-ui-sm);
  outline: none;
  width: 100%;
}

.app-shell[data-shell="new"] .detail-toolbar .toolbar-code-action {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-4);
  border-radius: var(--r-3);
  background: var(--action);
  color: var(--action-ink);
  border: 0;
  cursor: pointer;
  font: var(--t-ui);
  font-weight: 500;
}

.app-shell[data-shell="new"] .detail-toolbar .toolbar-code-action:hover {
  box-shadow: var(--shadow-pop);
}

/* ----- Code-mode active-codes-bar ---------------------------------- */
.app-shell[data-shell="new"] .active-codes-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-5);
  background: var(--paper);
  border-bottom: 1px solid var(--rule-soft);
}

.app-shell[data-shell="new"] .active-codes-bar-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.app-shell[data-shell="new"] .active-codes-title {
  font: var(--t-title);
  color: var(--ink);
  font-weight: 500;
}

.app-shell[data-shell="new"] .active-codes-hint {
  font: var(--t-ui-sm);
  color: var(--ink-3);
  margin: 0;
}

.app-shell[data-shell="new"] .active-codes-bar .quick-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  font: var(--t-ui-sm);
  color: var(--ink-2);
  cursor: pointer;
}

/* ----- Reader column ------------------------------------------------ */
.app-shell[data-shell="new"] .reader-column {
  max-width: var(--reader-measure);
  margin: 0 auto;
  padding: var(--reader-pad-y) var(--reader-pad-x);
  background: var(--paper);
}

.app-shell[data-shell="new"] .reader-meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  align-items: center;
  padding-bottom: var(--s-4);
  border-bottom: 1px solid var(--rule-soft);
  margin-bottom: var(--s-5);
  color: var(--ink-3);
  font: var(--t-meta);
}

.app-shell[data-shell="new"] .reader-meta-strip > span[aria-hidden="true"] {
  color: var(--ink-4);
}

/* ----- Transcript -------------------------------------------------- */
.app-shell[data-shell="new"] .reader-column .transcript {
  font: var(--t-reader);
  color: var(--ink);
}

.app-shell[data-shell="new"] .reader-column .transcript-line {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: var(--s-3);
  align-items: baseline;
  margin-bottom: var(--s-3);
}

.app-shell[data-shell="new"] .reader-column .transcript-line .line-number {
  font: var(--t-meta);
  color: var(--ink-3);
  text-align: right;
  font-feature-settings: "tnum", "zero";
  user-select: none;
}

.app-shell[data-shell="new"] .reader-column .transcript-line .line-text {
  font: inherit;
  color: inherit;
}

/* ----- Marker highlights ------------------------------------------ */
.app-shell[data-shell="new"] .reader-column .multi-code-mark {
  /* `background` is inlined via markBackground() — single-color or gradient bands. */
  color: inherit;
  padding: 1px 2px;
  margin: 0 -2px;
  border-radius: 1px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  border: 0;
  box-shadow: none;
}

/* ----- Quick code menu --------------------------------------------- */
.app-shell[data-shell="new"] .quick-code-menu {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--r-3);
  box-shadow: var(--shadow-pop);
  color: var(--ink);
  padding: var(--s-2);
}

.app-shell[data-shell="new"] .quick-code-menu input,
.app-shell[data-shell="new"] .quick-code-menu select,
.app-shell[data-shell="new"] .quick-code-menu textarea {
  background: var(--paper);
  border: 1px solid var(--rule);
  color: var(--ink);
  border-radius: var(--r-2);
  padding: var(--s-1) var(--s-2);
  font: var(--t-ui-sm);
}
```

- [ ] **Step 2: Build to confirm CSS parses**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "style(code): scoped reader + detail-view rules"
```

---

## Task 4: Manual sanity check + push

- [ ] **Step 1: Run the dev server and verify**

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`, sign in, open a project with at least one source and a few coded excerpts.

Walk through:

1. **Detail-view shell**: paper background, Inter Tight type. Sidebar is still dark (3a) — the seam between dark sidebar and paper detail-view should look intentional.
2. **Topbar (Code mode)**: "Detail View" eyebrow, `DetailTitle`, search box on the right, "Code selection" primary button on the far right. Search box has the new `paper` chrome with rule border.
3. **Topbar (other modes)**: same structure but no Code-selection button.
4. **Active-codes-bar (Code mode only)**: just below the topbar. Shows active codes title (`selectedCodeNames`) and hint text on the left, Quick menu toggle on the right. No Code-selection button (it moved to topbar).
5. **Reader column**: centered, max ~64ch wide. Outside the column = paper background extending to detail-view edges.
6. **Metadata strip**: above the transcript. Shows `case/kind · {N} words · {N} codes applied` in mono numbers.
7. **Transcript**: Newsreader font, 18px line-height 1.7. Line numbers in mono gutter, right-aligned.
8. **Single-coded segment**: subtle tinted highlight in the code's color. Try wrapping highlighted text across two lines — corners stay clean (no broken background).
9. **Multi-coded segment**: horizontal bands, each band the tint of one code. Hover shows code names tooltip.
10. **Quick code menu**: trigger by selecting text. Pops up with paper background, soft shadow, rule border. Code chips inside use new dot+name style.
11. **Create a new code without specifying color** (Refine mode → +New code, or Code mode quick-menu new code field) → gets the next bundle palette OKLCH color.
12. **Other modes**: detail-view paper background, but inner content (Organize source-register table, Refine code-edit, Classify case sheet, Analyze panels, Report exports) stays on legacy styling. No regressions.

Stop the dev server (Ctrl-C) when done.

- [ ] **Step 2: Lint + build + tests one more time**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: all clean. 52 tests pass.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Smoke-test on prod**

Once Vercel finishes the build, open https://fieldnote-seven.vercel.app and repeat the manual checks against prod.

---

## Self-Review

- **Spec coverage:**
  - Detail-view shell tokens → Task 3 (CSS).
  - Detail-toolbar restructure with conditional Code-selection button → Task 2 step 1 + Task 3 (CSS).
  - Active-codes-bar replacing document-actions → Task 2 step 2 + Task 3 (CSS).
  - Metadata strip with case/words/refs → Task 2 step 2 + Task 3 (CSS).
  - 64ch reader column with 56px padding → Task 3 (CSS uses `--reader-measure` and `--reader-pad-x/y` already defined in `tokens.css`).
  - Newsreader transcript text with grid line layout → Task 3 (CSS).
  - Marker highlights single-color and gradient-band → Task 2 step 4 + Task 3 (CSS).
  - Quick code menu restyle → Task 3 (CSS).
  - Default code palette swap → Task 1.

- **Placeholders:** none. Every code block is concrete.

- **Type consistency:** `markBackground(codes)` accepts a `{ color: string }[]`-shaped argument; the existing `Excerpt.codes` carries the right shape (codes already have `.color`). The new `readerWordCount` and `readerRefCount` are computed via existing types (`activeSource.content`, `excerpts`). Class names referenced in Task 2 markup (`detail-toolbar-tools`, `toolbar-code-action`, `active-codes-bar`, `active-codes-bar-text`, `active-codes-title`, `active-codes-hint`, `reader-column`, `reader-meta-strip`) match exactly between Task 2 and Task 3.

- **Atomic commits:** Task 1 changes one function (palette), no visual change. Task 2 adds new markup elements and a helper function — app keeps working but new bars are unstyled. Task 3 adds the rules that style them. Task 4 is verification + push. Each commit leaves the app working.
