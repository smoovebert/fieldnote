# Phase 3c — Inspector / Right Rail Migration Design

Status: approved 2026-04-29. Ready for implementation plan.

## Goal

Migrate the signed-in app's right rail (`.properties-view` and its panels) to the new aesthetic. The Code mode Active Codes panel adopts the bundle's `.fn-code-picker` row shape; memo and new-code fields adopt the bundle's `.fn-memo-area` and `.fn-new-code` chrome; other panels (Source Properties, Refine Codebook, Query Summary, Export Summary) inherit the new shell and heading style while keeping their existing interior markup.

All new rules scoped under `.app-shell[data-shell="new"]` (already active from Phase 3a).

## Non-goals

- Adding a new Coded Excerpts panel to Code mode's right rail. The bundle has it; our app doesn't. Feature work; deferred.
- Per-mode interior polish (Source Properties fields, Refine codebook tree internals, Query Summary internals, Export Summary internals) — Phase 3d.
- Dark-mode toggle UI — Phase 3e.

## What changes

### Properties-view shell

- Background: `var(--paper)`.
- Text: `var(--ink)`.
- Type: `var(--font-ui)` (Inter Tight) inherited from the shell root.
- Width: keep existing 420px width from current grid (defined by parent `.app-shell` grid). No structural change.
- Inner spacing: panels get `var(--s-5)` padding; bottom hairline between panels using `var(--rule-soft)`.

### Panel chrome (shared across all modes)

`.panel` becomes a section with bottom hairline (no card-like background). `.panel-heading` becomes a row of:

```
[ small icon (16px, --ink-3) ] [ Title (12.5px Inter Tight semi-bold tracked uppercase, --ink-2) ] [ mono count (optional, --ink-3) ]
```

The existing markup uses `<h2>` for the title and a lucide icon — both stay. CSS makes the heading flush, adds tracking and uppercase, and right-aligns any count.

### Active Codes picker (Code mode)

Existing button list becomes the bundle's `.fn-code-picker`. Each row (`.fn-code-pick`):

```
[ • dot (8px, code.color) ] [ name (Inter Tight 13.5px, --ink) ] [ ref count (mono, 11px, --ink-3, right-aligned) ]
```

Row states:
- Default: transparent bg, subtle hover (`var(--pane-deep)`).
- Selected: subtle `color-mix(in oklch, code.color 8%, transparent)` background tint + a small leading check `✓` glyph at the start of the row replacing the dot's left margin.

Existing logic preserved: clicking toggles selection in Code mode, sets active code in Refine mode. The `aria-pressed` state stays.

The ref count for each code is computed from `excerpts.filter(e => e.codeIds.includes(code.id)).length` and rendered next to the name.

### Memo panel

The textarea becomes `.fn-memo-area`:

- Background: `var(--paper)`.
- Border: `1px solid var(--rule)`.
- Focus: `border-color: var(--action)`, soft `--action-soft` outline.
- Type: Inter Tight 13.5px, `--ink`. Min-height 120px.
- Padding: `var(--s-3)`.
- Resize: `vertical`.

The contextual heading logic (`railMemoTitle` — source memo / code memo / project memo) stays unchanged.

### New-code field

Existing input + button row at the bottom of the Active Codes panel becomes `.fn-new-code`:

```
[ input placeholder "New code" ] [ + button ]
```

- Input: paper bg, `--rule` border, focus `--action`. Same height as the button.
- Button: square 28×28, `--action` background, `+` glyph in `--action-ink`. Hover: `--shadow-pop`.

### Code chips (where they appear)

Anywhere the app currently renders a "code chip" (small pill with dot + name), adopt `.fn-chip`:

```
[ • dot ] [ name (Inter Tight, --ink) ] [ × (optional, --ink-3) ]
```

- Background: `color-mix(in oklch, var(--chip-c) 8%, var(--paper))` (chip-c = the code's color).
- Border: `1px solid color-mix(in oklch, var(--chip-c) 25%, transparent)`.
- Padding: `2px 8px`.
- Radius: `var(--r-3)`.

This is a reusable visual; the existing chip render sites continue to render the same data. Locations include Refine reference cards, Analyze excerpt cards, and any quick-code chip rows.

### Source Properties / Refine Codebook tree / Query Summary / Export Summary

These panels keep their existing markup and field-level styling. They get:
- The new `.panel` shell (paper, hairline divider).
- The new `.panel-heading` style (icon + tracked-uppercase title).
- Inter Tight type via inheritance.

Internal field-row styling (the property-field labels / inputs, the codebook tree rows, etc.) is **not** restyled in this phase — that's per-mode polish (3d).

## Architecture

Pure CSS plus minimal JSX edits in `App.tsx`:

1. Active Codes rows render a leading dot element (existing markup may already have one — verify), and add a per-code ref count derived inline.
2. Active Codes selected state markup adds an optional `✓` glyph; can be done CSS-only via `::before` on `.is-selected`.
3. No new components, no new files.

All new CSS rules scoped under `.app-shell[data-shell="new"]`. Append to `src/App.css`.

## Files

**Modify:**
- `src/App.tsx` — surface code ref counts on Active Codes rows; ensure each row renders a leading dot (small change if not already present).
- `src/App.css` — append ~150 lines of scoped rules under `.app-shell[data-shell="new"]`.

**Create:** none.

## Testing

Manual:

1. Code mode: properties-view shows paper bg. Active Codes panel header is small uppercase tracked title + Highlighter icon.
2. Active Codes rows show: dot in code's color, name, mono ref count on the right.
3. Click a row — selected state shows tinted bg + check accent. Click again deselects.
4. New-code field below the picker uses input + + button shape.
5. Memo panel below: textarea has paper bg, soft rule border, focus state shows action color.
6. Refine mode: Codebook panel uses the same shell + heading style. Tree rows keep their current internal layout (deferred to 3d).
7. Organize mode: Source Properties panel uses new shell + heading. Field rows keep current layout.
8. Analyze mode: Query Summary panel — paper bg, new heading. Internals unchanged.
9. Report mode: Export Summary panel — paper bg, new heading. Internals unchanged.
10. Sidebar (3a) + Reader (3b) + Inspector (3c) read as one cohesive paper-and-shell surface. No more navy seams.

Lint + build + tests clean. No new unit tests.

## Out-of-scope follow-ups

- Coded Excerpts panel for Code mode right rail (feature).
- Phase 3d: per-mode interior polish.
- Phase 3e: dark-mode toggle UI.
