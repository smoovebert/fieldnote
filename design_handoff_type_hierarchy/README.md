# Handoff: Fieldnote — Type & Visual Hierarchy

## Overview

Fieldnote is a qualitative research workspace (sources → coding → analysis → report). The current implementation has drifted typographically: page titles, section heads, and record names all read at the same weight, and tracked-caps labels do too many jobs.

This handoff defines an **8-tier type system** and re-types the existing mode pages (Overview, Organize, Code, Refine, Classify, Analyze, Report) to apply real hierarchy. **Layout, top-nav structure, and information architecture are unchanged** — those are decisions the team has already made. The work here is purely typographic + visual hierarchy.

## About the design files

The HTML files in this bundle are **design references** created as prototypes — they show intended look and behavior, not production code. The task is to **recreate these designs in the existing Fieldnote codebase** using its established framework, component library, and conventions. Do not copy the React/CSS verbatim; translate the spec into the codebase's idioms.

If you want to inspect the prototypes directly:
- `Fieldnote Type Hierarchy.html` — the canvas with the type spec + 5 re-typed pages
- `type-hierarchy.css` — all tokens, the eight-tier scale, and supporting component styles
- `type-shell.jsx` — top nav, left rails, right inspectors (shared chrome)
- `type-pages.jsx` — `PageOverview`, `PageOrganize`, `PageCode`, `PageAnalyze`, `PageReport`, `TypeSpec`

## Fidelity

**High-fidelity** for typography, color, and spacing. Sizes and weights are exact and must be matched. Layout proportions are correct but the codebase's existing layout primitives should be used.

## The type system — eight tiers

Three families:

- **Newsreader** (serif) — display + long-form reading. Weights 400, 500, 600. Italic 400.
- **Inter Tight** (sans) — all UI. Weights 400, 500, 600.
- **JetBrains Mono** (mono) — numerics, counts, dates, identifiers. Weights 400, 500.

| Tier | Family · Size / LH · Weight | Tracking | Color token | Role | Use cases |
|---|---|---|---|---|---|
| **T1** | Newsreader · 32 / 1.15 · 500 | -0.018em | `--ink` | Display | Page-defining titles. Project name, source name, the page's "subject" |
| **T2** | Inter Tight · 22 / 1.2 · 500 | -0.012em | `--ink` | Page title | Mode page name when no subject applies (Analyze, Classify) |
| **T3** | Inter Tight · 16 / 1.35 · 500 | -0.005em | `--ink` | Section | In-page section heads above content blocks |
| **T4** | Inter Tight · 14 / 1.4 · 500 | normal | `--ink` | Subhead | Code names in lists, table row titles |
| **T5** | Inter Tight · 13.5 / 1.5 · 400 | normal | `--ink-2` | Body | Paragraphs, descriptions, instructional copy |
| **T6** | Inter Tight · 12.5 / 1.45 · 400 | normal | `--ink-2` or `--ink-3` | Body small | Table cells, dense properties, inline meta |
| **T7** | Inter Tight · 10.5 / 1.2 · 600 UPPER | 0.10em | `--ink-3` | Eyebrow / panel head | "DETAIL VIEW", right-rail panel headings |
| **T8** | JetBrains Mono · 11 / 1.3 · 400 | normal | `--ink-3` | Meta | Counts, dates, refs, IDs |

**Body baseline**: T5 (13.5px / 1.5, weight 400, color `--ink-2`).

**Antialiasing & features**: `-webkit-font-smoothing: antialiased; letter-spacing: -0.005em` on the root. JetBrains Mono uses `font-feature-settings: "tnum", "zero"`.

### Rules for the scale

1. **One job per role.** Tracked-caps (T7) is reserved for eyebrows above titles and right-rail panel headings — nowhere else. Don't use T7 for table column headers' labels (use T7 only on the column row itself, never inline).
2. **Page titles are serif (T1).** This is the editorial voice that was implicit on the Report page; it now applies across modes. T2 is the fallback when the page has no concrete subject (e.g., "Analyze").
3. **Numbers earn their weight.** KPI numbers use Newsreader at 36px / 500. Small inline counts use T8 mono.
4. **Key/value contrast.** In properties dl's, `dt` is T6 muted (`--ink-3`); `dd` is T4 weight 500 dark (`--ink`). The value gets one tier of emphasis above the label.
5. **No font-size below 11px.** No font-weight below 400.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#ffffff` | Card background |
| `--canvas` | `#f7f8f9` | Page background behind cards |
| `--pane` | `#f4f5f7` | Secondary surface (hover, fills) |
| `--pane-deep` | `#ebedf0` | Tertiary fills, progress track |
| `--rule` | `#e3e6ea` | Hairline borders, card borders |
| `--rule-soft` | `#eef0f3` | Internal dividers within cards |
| `--ink` | `#14161a` | Page titles, primary copy, T1–T4 |
| `--ink-2` | `#34383f` | Body copy, T5–T6 |
| `--ink-3` | `#6b7079` | Muted text, T7, T8, panel heads |
| `--ink-4` | `#9aa0aa` | Placeholders, disabled |
| `--shell` | `#1a1d22` | Top nav, left rail background |
| `--shell-deep` | `#14161a` | Top nav border |
| `--shell-rule` | `#2a2e35` | Rules inside dark chrome |
| `--shell-ink` | `#e8eaed` | Primary text on dark chrome |
| `--shell-ink-2` | `#aab0b8` | Secondary text on dark chrome |
| `--shell-ink-3` | `#6e7480` | Muted text on dark chrome |
| `--shell-active` | `#ffffff` | Active state on dark chrome |
| `--action` | `#0d6c8a` | Primary buttons, focus, active accents |
| `--action-soft` | `#e6f1f5` | Selected row background, current-question card |
| `--action-ink` | `#ffffff` | Text on `--action` |

### Code accent palette (kept from earlier direction)

Used as 8px dots beside code names, and as 22%-opacity highlights on coded transcript spans. The hex values:

| Code accent | Hex | OKLCH source |
|---|---|---|
| `--c-rose` | `#c66f6f` | `oklch(0.62 0.10 20)` |
| `--c-cyan` | `#4f8aa6` | `oklch(0.66 0.08 220)` |
| `--c-indigo` | `#6470b8` | `oklch(0.55 0.10 265)` |
| `--c-amber` | `#b58a3a` | `oklch(0.72 0.09 75)` |
| `--c-moss` | `#6f9265` | `oklch(0.62 0.08 150)` |

Highlight tints in transcript: `color-mix(in srgb, var(--c-X) 22%, transparent)`.

## Spacing scale

4px base. `--s-1: 4`, `--s-2: 8`, `--s-3: 12`, `--s-4: 16`, `--s-5: 24`, `--s-6: 32`, `--s-7: 48`, `--s-8: 64`.

## Radii

`--r-1: 3px` (tags, dense chips), `--r-2: 5px` (inputs, buttons), `--r-3: 8px` (cards), `--r-4: 12px` (large surfaces).

## Page header recipe

Every mode page opens with the same triplet:

```
[T7 eyebrow]                  ← "DETAIL VIEW", "RESEARCH REPORT", etc.
[T1 or T2 title]              ← Subject name (T1) or mode name (T2)
[T6 meta line, --ink-3]       ← short description · count · count
```

- **T1** when the page has a concrete subject (project, source, code).
- **T2** when it does not (mode-level pages: Analyze, Classify).
- Meta line is body-small with mono substrings for any numerics.
- 32px gap between this header and the first content card.

## Right-rail (inspector) recipe

```
[icon] [T7 panel head]              [T8 count, optional]
─────────────────────────────────── (rule-soft)
[content]
```

- Panel sections are stacked vertically, separated by `1px solid --rule-soft`.
- Section padding: `18px 20px 22px`.
- Panel head row: 14px icon (color `--ink-3`) + T7 text + optional count pushed right (T8 mono `--ink-3`).
- Properties as `<dl>`: `dt` is T6 `--ink-3`; `dd` is T4 `--ink` right-aligned. Each row has a 7px top/bottom pad and a `--rule-soft` underline; last row no underline.

## Top nav

Three-column grid: `232px | 1fr | 360px`.

**Brand block** (left, 232px wide, padded 0 20px):
- Eyebrow: `font: 600 9.5px/1.1 sans, tracking 0.14em, uppercase`, color `--shell-ink-3`. Text: "Qualitative Workspace".
- Brand: `font: 500 16px/1.1 sans, tracking -0.01em`, color `--shell-ink`. Text: "Fieldnote".
- **No "F" mark.** The two-line label stands alone.

**Tabs** (center): seven tabs, each `display: inline-flex; gap: 6px; padding: 0 12px; height: 32px; border-radius: 6px`.
- Default: `font: 500 13px/1 sans`, color `--shell-ink-2`, leading 14px stroke-1.4 icon in `--shell-ink-3`.
- Hover: text → `--shell-active`.
- Active: bg `rgba(255,255,255,0.08)`, text `--shell-active`, icon `--shell-active`.

**Right cluster**: search pill (200px wide, dim) + saving pill (with green dot) + sign-out icon button.

## Left rails

Width 232px, bg `--shell`, padding `20px 0 24px`. Stacked sections with `gap: 22px`.

- **Section head**: T7 in dark-chrome color (`--shell-ink-3`).
- **Item row**: 16px icon column + label + meta. Hover bg `rgba(255,255,255,0.04)`. Active bg `rgba(255,255,255,0.08)`, text `--shell-active`.
- **Sub-leaf row** (e.g., source under "Internals"): indented 26px from left, 8px dot column, label, meta. Slightly smaller font (12.5).
- **Counts** in rails always T8 mono in `--shell-ink-3`.

## Cards

```
border: 1px solid --rule;
border-radius: 8px;
background: --paper;
overflow: hidden;
```

Optional card head: `padding: 16px 20px; border-bottom: 1px solid --rule-soft; display: flex; justify-content: space-between; align-items: center; gap: 16px`.

Card head left side: T3 title + optional T6 description below it.

Card body: `padding: 18px 20px 22px`.

## Buttons

- **Primary** (`.th-btn--primary`): `background: --action; color: --action-ink; height: 32px; padding: 0 12px; border-radius: 5px; font: 500 12.5px/1 sans`.
- **Secondary** (`.th-btn`): same dimensions, `background: --paper; border: 1px solid --rule; color: --ink`. Hover bg `--pane`.
- **Ghost** (`.th-btn--ghost`): no border, no bg, color `--ink-2`. Hover bg `--pane`.
- **Destructive**: secondary button with text color `#a83838`.

## Inputs

```
height: 34px;
border: 1px solid --rule;
border-radius: 5px;
padding: 0 10px;
background: --paper;
font: 400 13px/1 sans;
color: --ink;
```

Focus: `border-color: --action`. Textareas use `min-height: 84px` and `padding: 8px 10px`.

## Pills, tags, code chips

- **Pill** (`.th-pill`): rounded-full, `padding: 3px 8px`, `font: 500 11.5px/1 sans`, bg `--pane`, color `--ink-2`. With optional 6px leading dot.
- **Tag** (`.th-tag`): `padding: 2px 7px`, `border-radius: 3px`, `font: 500 11px/1.4 sans`, bg `--pane`.
- **Code chip** (used in coded-excerpt cards, transcript active-code stack): pill variant with the code's accent dot.

## Transcript reader

- Container max-width `64ch`, centered, padding `24px 0 60px`.
- Each line is a 2-col grid: 32px right-aligned line number + line.
- **Line number**: T8 mono, `--ink-4`, `line-height: 1.7`.
- **Line text**: `font: 400 16.5px/1.75 Newsreader`, color `--ink`. Speakers prefixed in italic `--ink-3`.
- **Coded span**: `.th-mark` — background `color-mix(in srgb, var(--c-X) 22%, transparent)`, padding `1px 2px`, `border-radius: 1px`, `box-decoration-break: clone`.

## Editorial report layout

When viewing/exporting the report, the center column hosts a card whose body is editorial:

- Container max-width `68ch`, centered, padding `24px 0 80px`.
- T7 eyebrow: "Research report".
- **H1**: Newsreader, `44px / 1.1`, weight 500, tracking `-0.02em`, color `--ink`. The largest type in the entire app.
- **Meta line**: T8 mono `--ink-3`, items separated by `·` in `--ink-4`. Bottom margin 32px.
- **Rule** (`1px --rule`) above and below sections, 32px vertical margin.
- **H2** (section heads like "Codebook"): T7 — keep tracked-caps because we're in editorial mode now and the contrast against serif body is the point.
- **Codebook entry**:
  - Row 1: T-mid serif name (Newsreader 16/1.3 · 600) on the left + T8 mono ref count on the right.
  - Row 2: italic Newsreader 14 / 1.55, color `--ink-2`. Description.
  - 22px gap between entries.

## Per-page mappings

### Overview (`PageOverview`)
- Eyebrow "DETAIL VIEW" + T1 "Sample project" + optional T6 description.
- Two KPI cards (Progress, Ontology). Each: T7 label with leading icon → 36px Newsreader 500 number → T6 caption ("of 2 sources coded" / "themes"). Progress card has a 4px-tall track in `--pane-deep` with `--action` fill.
- "Project memo" card — T3 title + T6 description + a borderless textarea.
- Right inspector: "Project" panel with line-numbering settings as key/value, then "AI Assist" with provider settings.

### Organize (`PageOrganize`)
- T1 "Sample project" page header.
- "Source register / All sources" card head: T7 eyebrow above T3 title.
- Sources table: T7 column headers (uppercase, weight 600). Row title cells use T4 (weight 500, ink); other cells use T6 muted; numeric refs use T8 mono. Selected row bg `--action-soft`.
- Right inspector: "Source properties" — input fields with T7 labels above; properties dl below; vertical button stack (Create case, Open for coding, Archive, Delete).

### Code (`PageCode`)
- T1 source name as the page title (e.g., "Interview 03"). Meta: type · folder · word count (mono) · code count (mono).
- Active-code card head: 8px code dot + T3 code name on the left; instructional T6 description; quick-menu checkbox + primary "Code selection" button on the right.
- Card body hosts the transcript reader (above).
- Right inspector: "Active codes" list — color dot + T4 name + T8 mono ref count. Active code row has bg `--action-soft`. Below: "[Source] memo" textarea panel and "Coded excerpts" panel showing pill stack + italic serif quote + add-note input.

### Refine
- Same shell as Code. Center is a "Code definition" form with T3 title and labeled inputs (T7 labels). Right inspector becomes the codebook list (color dots + names + ref counts), with a "Code memo" panel below.

### Classify
- T1 page title. Card "Participants and attributes / Case sheet" with T7 eyebrow + T3 title, plus toolbar buttons. Two stacked tables (sources→case, then case sheet) with T7 column headers and T6 cells.

### Analyze (`PageAnalyze`)
- T2 page title "Analyze" (no concrete subject).
- Tabs row below header: 5 tabs, font 500 default / 600 active. Active has 2px `--action` underline. 1px `--rule` baseline.
- Filters card with T7 labels + inputs in a 4-col grid.
- Toolbar row (separated by `--rule-soft` rules top and bottom) with T7 "Top codes" label, controls, view-mode tag toggle (Heatmap / Network / Table — active tag uses `--ink` bg, `--paper` text), and PNG/CSV export buttons.
- Heatmap rendered as a real `<table>`. Cells are 32px tall. Filled cells: bg `--action`, white text in mono.
- Right inspector "Current question": single highlighted card (border `--action`, bg `--action-soft`) holding a T5 sentence; below that a results dl, active filters, export CSV button.

### Report (`PageReport`)
- Center top: split header — left has T7 "DETAIL VIEW" + T2 "Report"; right has Export PDF + Export Word primary buttons.
- Body card holds the editorial report layout (above).
- Left rail: "Report sections" (checkbox list) + "Raw data" (CSV/XLSX tag toggle + leaf list of exports).
- Right inspector: "Export summary" properties dl.

## State management & interactions (no functional changes)

This pass does not change any logic, navigation, save behavior, or data shape. It is **CSS, type, and minor markup hierarchy only**. Existing handlers, routes, and store shape stay as-is. The implementer should:

1. Replace the current type tokens with the eight-tier scale.
2. Update color tokens (the values listed above; the existing OKLCH definitions in `tokens.css` are also acceptable — just keep contrast ratios).
3. Apply T1/T2 to page titles per the per-page mapping; the rest follows from semantic HTML + the new type classes.
4. Tighten the right-rail key/value pattern: any `dt`/`dd` should pick up the contrast described in the panel recipe.
5. Replace ad-hoc tracked-caps usage with **only** the eyebrow + panel-head roles.

## Assets

Fonts (Google Fonts):
- Newsreader: weights 400, 500, 600 + italic 400, optical sizing 6..72
- Inter Tight: weights 400, 500, 600
- JetBrains Mono: weights 400, 500

Icon set: 14×14 line icons at stroke-width 1.4. The prototypes use simple inline SVGs; the implementer should swap in the codebase's existing icon system (Lucide, Phosphor, custom set) as long as visual weight matches (1.4 stroke, 14px target).

No raster assets.

## Files in this bundle

- `README.md` — this document
- `Fieldnote Type Hierarchy.html` — design canvas with all 5 page mocks + the type spec sheet
- `type-hierarchy.css` — token + class definitions
- `type-shell.jsx` — top nav, left rails, right inspectors
- `type-pages.jsx` — page mocks (`PageOverview`, `PageOrganize`, `PageCode`, `PageAnalyze`, `PageReport`)
- `design-canvas.jsx` — canvas wrapper used to display the mocks side-by-side (not needed for the real implementation)

## Open the prototypes

To verify a screen pixel-by-pixel, open `Fieldnote Type Hierarchy.html` in a browser and zoom into the relevant artboard.
