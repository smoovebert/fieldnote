# Phase 3a — Shell + Sidebar Migration Design

Status: approved 2026-04-29. Ready for implementation plan.

## Goal

Migrate the signed-in shell container and the workspace sidebar to the new aesthetic tokens (`--shell` for sidebar, `--paper` for shell background, Inter Tight UI type). Add a brand block at the top of the sidebar, adopt the bundle's row chrome, and add a mini-collapse toggle that persists in `localStorage`. Detail-view internals and properties-view internals are explicitly out of scope; they're 3b and 3c.

## Non-goals (this phase)

- Detail-view internals (reader, topbar, active-codes-bar, source content) — 3b.
- Properties-view internals (Active Codes / Memo / Coded excerpts panels) — 3c.
- Per-mode polish — different ListView rendering per mode is 3d.
- Dark-mode toggle UI — 3e.
- Marker-highlight styling for coded excerpts — 3b.
- Switching mode icons from lucide to hand-rolled SVGs — sticking with lucide per Q1.

## What changes

### Shell container `.app-shell`

The signed-in app's outermost element (`<main className="app-shell">` in `App.tsx`) gets a new attribute `data-shell="new"`. All new shell + sidebar rules are scoped under that selector so the legacy rules stay dormant and rollback is one attribute flip.

- Background → `var(--paper)`.
- Top-level grid stays as today (sidebar / detail-view / properties-view). Only the surface and hairline rules switch to tokens.
- Typography on the shell root → `font-family: var(--font-ui)` with `-webkit-font-smoothing: antialiased` and `font-feature-settings: "ss01", "cv11", "calt"` and `letter-spacing: -0.005em` — copying `.fn-root` from the bundle.

### Sidebar `.workspace-sidebar`

Width: **232px**. Background: `var(--shell)`. Text: `var(--shell-ink)`, with `--shell-ink-2` and `--shell-ink-3` for secondary and tertiary.

Top-to-bottom contents (existing markup, restyled, with new pieces noted):

1. **Brand block** (new — does not exist in current sidebar):
   - 32px square `F` mark, `border-radius: var(--r-2)`, background `var(--shell-deep)`, text `var(--shell-ink)`, `font-family: var(--font-reader)`, weight 500, 18px.
   - Two-line text block to the right of the mark:
     - "QUALITATIVE WORKSPACE" eyebrow at ~9.5px tracked uppercase in `--shell-ink-3`.
     - "Fieldnote" wordmark at ~17px weight 600 in `--shell-ink`.
   - 32×32 chevron toggle button at the top-right of this block — clicks toggle the collapsed state.

2. **Project switcher row** (existing button restyled):
   - Becomes a quiet `[▾ project name]` row using `--shell-ink-2`.
   - Click handler unchanged — still calls `returnToProjects` to navigate to Project Home.
   - The current `<FolderOpen>` icon is replaced by a small chevron-down glyph (Unicode `▾` or lucide `ChevronDown`).

3. **Mode list** (existing markup restyled):
   - Six buttons (one per `modeItems` entry).
   - Each button: `[icon] [label] [status badge]`.
   - Mode icons (lucide) — concrete mapping for this phase:
     - `organize` → `Folders`
     - `code` → `Highlighter`
     - `refine` → `ListTree`
     - `classify` → `Tags`
     - `analyze` → `BarChart3`
     - `report` → `FileText`
   - Add the `Folders` and `BarChart3` imports to `App.tsx`'s lucide import block; the rest are already imported.
   - Status badges (Now / MVP / Soon) preserved. Restyle pill: `var(--shell-deep)` background, `var(--shell-ink-3)` text, ~9px size.
   - Active state: icon tinted with `var(--c-cyan)`, label in `--shell-ink`, plus a 2px `--c-cyan` left-edge mark on the active row.
   - Hover state on inactive: subtle `--shell-deep` background.

4. **Conditional folder pane** (Organize-only — existing markup restyled):
   - Container inherits the dark surface.
   - Folder rows become `.fn-sb-source`-style buttons with `--shell-ink-2` text and `--shell-deep` hover.
   - Counts on the right stay in `--shell-ink-3`.

5. **ListView container** (existing component, container restyled only):
   - Container background `--shell`. Items inherit token typography.
   - Internal markup of `ListView` is **untouched** in 3a — per-mode polish lands in 3d.

6. **Sidebar account / sign-out**:
   - Email in `--shell-ink-2` at 11–12px.
   - Sign-out button restyles to a quiet text button using `--shell-ink-3` with `--shell-ink` on hover.

### Mini-collapse

A new `sidebarCollapsed: boolean` state in `App.tsx` controls a `.is-collapsed` class on the sidebar.

- **Toggle button**: 32×32 button inside the brand block (top-right). Lucide chevron icon — `ChevronLeft` when expanded, `ChevronRight` when collapsed.
- **Default**: expanded. Persists to `localStorage` under key `fieldnote.sidebarCollapsed`. Hydrate on mount.
- **Collapsed width**: 56px.
- **Transition**: `width 180ms ease`. Content within the sidebar transitions with `opacity 120ms ease 60ms` so labels fade out before the width animation completes (avoids overflow jank).
- **Collapsed contents**:
  - Brand block: only the F mark stays. Eyebrow and wordmark hidden.
  - Project switcher: hidden.
  - Mode list: icon-only buttons, centered horizontally. `title` attribute on each button shows the label so hover tooltips work.
  - Conditional folder pane: hidden.
  - ListView: hidden.
  - Account: just a sign-out icon button (no email, no label). `title` attribute = "Sign out".
- **Toggle button stays visible** in both states. In collapsed state the chevron flips direction.

## Architecture

- No component split. Sidebar markup stays inline in `App.tsx`. Adds:
  - One `useState<boolean>` for `sidebarCollapsed`.
  - One `useEffect` that reads `localStorage` on mount and writes on change.
  - Brand block JSX (a few lines).
  - Toggle button JSX (one line + handler).
  - `.is-collapsed` class conditionally applied to the sidebar element.
- All new CSS rules in `src/App.css` are scoped under `.app-shell[data-shell="new"]`. Legacy rules (under bare `.app-shell`, `.workspace-sidebar`) stay intact and dormant. The `data-shell="new"` attribute is set unconditionally in JSX once we ship — but the scoping means a single attribute flip rolls back if anything blows up.
- No new dependencies. lucide-react icons + the token CSS we already have.
- `localStorage` access is in a `useEffect` so SSR-safe (Vite is client-side anyway, but the pattern is correct).

## Files

**Create:** none.

**Modify:**
- `src/App.tsx` — `data-shell="new"` attribute on `.app-shell`; brand block + toggle button markup; `sidebarCollapsed` state + localStorage hydration; `.is-collapsed` class application; `title` attributes on collapsed buttons.
- `src/App.css` — append shell + sidebar rules scoped under `.app-shell[data-shell="new"]`. ~150 lines of CSS.

**Files unchanged:** all React components other than the sidebar markup in `App.tsx`. No server, no schema, no tests file.

## State persistence detail

```ts
const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem('fieldnote.sidebarCollapsed') === 'true'
})

useEffect(() => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('fieldnote.sidebarCollapsed', String(sidebarCollapsed))
}, [sidebarCollapsed])
```

The lazy `useState` initializer reads on first render so the sidebar mounts already in the persisted state — no flash of expanded sidebar before collapse.

## Testing

Manual:

1. Signed in, sidebar renders the brand block at top (F mark + eyebrow + wordmark + chevron toggle).
2. Mode list: icons + labels + status badges, active mode shows cyan accent on the icon and a left-edge mark.
3. Click the collapse chevron: sidebar shrinks to 56px, labels fade out, only icons + F mark visible. Hover a mode button → tooltip shows.
4. Refresh: collapsed state persists.
5. Click the chevron again: expands.
6. Organize mode: folder pane renders inside the dark sidebar, dark surface, folder count chips on the right.
7. Other modes: ListView shows but its internal markup is unchanged (3d will polish per-mode).
8. Detail-view and properties-view continue to render with their existing styling — visual transition between dark sidebar and the still-navy detail view is **expected and accepted** until 3b lands.
9. Sign out from the collapsed sidebar (icon-only button) works.

Lint + build clean. No new unit tests required.

## Out-of-scope follow-ups

- Phase 3b — reader (detail-view) restyle including topbar, active-codes-bar, line-numbered Newsreader transcript, marker highlights.
- Phase 3c — inspector (properties-view) panels: Active Codes, Memo, Coded excerpts.
- Phase 3d — per-mode polish: ListView mode-specific markup, Organize folder UI, Refine codebook, Classify case sheet, Analyze panels, Report center-pane.
- Phase 3e — dark-mode toggle UI placement and persistence.
- Removing the legacy rules under bare `.workspace-sidebar` and `.app-shell` selectors. Defer until 3b/3c also ship — at that point the legacy rules are unreachable and can be deleted in one cleanup commit.
