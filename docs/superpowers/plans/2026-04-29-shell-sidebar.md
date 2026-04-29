# Phase 3a — Shell + Sidebar Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the signed-in shell + workspace sidebar to the new aesthetic tokens, add a brand block, and add a mini-collapse toggle that persists in localStorage.

**Architecture:** Pure CSS + a small amount of state in `App.tsx`. All new rules are scoped under `.app-shell[data-shell="new"]` so the legacy styling stays intact for one-attribute rollback. Detail-view and properties-view internals are explicitly out of scope.

**Tech Stack:** React + TypeScript + Vite. lucide-react icons. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-29-shell-sidebar-design.md`

---

## File Structure

**Modify:**
- `src/App.tsx` — add icon mapping in `modeItems`; add `sidebarCollapsed` state + localStorage hydration + persistence; add brand block + toggle button JSX; replace project switcher chrome; render mode icons in mode buttons; apply `.is-collapsed` class conditionally; set `data-shell="new"` on `.app-shell`; add `title` tooltips on mode buttons.
- `src/App.css` — append new shell + sidebar rules scoped under `.app-shell[data-shell="new"]`. ~150 lines.

**Created:** none.

---

## Task 1: Add icon mapping + collapse state (no visual change yet)

**Files:**
- Modify: `src/App.tsx`

This task changes data structures and adds state without using either yet. After commit, the app renders unchanged. Tasks 2 + 3 land the visible changes.

- [ ] **Step 1: Update lucide imports**

In `src/App.tsx`, find the lucide-react import block (around line 3-26) and add `BarChart3` and `Folders` to the alphabetically-sorted import list. Specifically, after the existing imports, the block should include both.

The current block is:

```ts
import {
  BookOpenText,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  FolderInput,
  FolderOpen,
  Grid3x3,
  Highlighter,
  ListTree,
  LogOut,
  MessageSquareText,
  Plus,
  Rows3,
  Scissors,
  Search,
  Settings,
  Tags,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
```

Insert `BarChart3` between `BookOpenText` and `Cloud`, and `Folders` between `FolderOpen` and `Grid3x3`:

```ts
import {
  BarChart3,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  FolderInput,
  FolderOpen,
  Folders,
  Grid3x3,
  Highlighter,
  ListTree,
  LogOut,
  MessageSquareText,
  Plus,
  Rows3,
  Scissors,
  Search,
  Settings,
  Tags,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
```

(`ChevronLeft` and `ChevronRight` are needed for the collapse toggle in Task 2; importing them now keeps the imports stable for the rest of this plan.)

- [ ] **Step 2: Update `modeItems` to carry icons**

Find the `modeItems` declaration (around line 417):

```ts
const modeItems: Array<{ id: WorkspaceView; label: string; description: string; status: 'ready' | 'partial' | 'soon' }> = [
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.', status: 'ready' },
  { id: 'code', label: 'Code', description: 'Close-read sources and code selected passages.', status: 'ready' },
  { id: 'refine', label: 'Refine', description: 'Clean the codebook and review code references.', status: 'partial' },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'partial' },
  { id: 'analyze', label: 'Analyze', description: 'Run searches, matrices, and comparisons.', status: 'partial' },
  { id: 'report', label: 'Report', description: 'Export excerpts, memos, and codebooks.', status: 'partial' },
]
```

Replace with (icons added; `LucideIcon` imported as a type):

```ts
import type { LucideIcon } from 'lucide-react'

const modeItems: Array<{
  id: WorkspaceView
  label: string
  description: string
  status: 'ready' | 'partial' | 'soon'
  icon: LucideIcon
}> = [
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.', status: 'ready',   icon: Folders },
  { id: 'code',     label: 'Code',     description: 'Close-read sources and code selected passages.', status: 'ready',   icon: Highlighter },
  { id: 'refine',   label: 'Refine',   description: 'Clean the codebook and review code references.', status: 'partial', icon: ListTree },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'partial', icon: Tags },
  { id: 'analyze',  label: 'Analyze',  description: 'Run searches, matrices, and comparisons.', status: 'partial', icon: BarChart3 },
  { id: 'report',   label: 'Report',   description: 'Export excerpts, memos, and codebooks.', status: 'partial', icon: FileText },
]
```

The `import type { LucideIcon }` line goes near the top of `App.tsx` next to other `import type` declarations (search for `import type { Session }` and add it nearby).

- [ ] **Step 3: Add the collapse state and localStorage sync**

In `App.tsx`, find the existing UI-pref state block (search for `const [quickCodingEnabled` or similar). Add immediately above or below the existing UI-pref state:

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

`useState` and `useEffect` are already imported in `App.tsx`.

- [ ] **Step 4: Build + lint to confirm nothing's broken**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. 52 tests still pass. App renders unchanged because nothing reads the new state or the new icons yet.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "chore(shell): add mode icons + sidebar-collapsed state (no visual change)"
```

---

## Task 2: New sidebar markup — brand block, project switcher chevron, mode icons, collapse toggle

**Files:**
- Modify: `src/App.tsx`

This task changes the sidebar's JSX. Without the new CSS (Task 3) and without `data-shell="new"` on the shell (Task 4), the markup will look slightly broken — extra elements with no styling. That's expected for one commit. After Task 4, it all comes together.

- [ ] **Step 1: Add brand block + collapse toggle JSX inside the sidebar, above the project switcher**

Find this block in `App.tsx` (around line 2444):

```tsx
<aside className="workspace-sidebar" aria-label="Workspace sidebar">
  <button className="project-switcher project-nav-link" type="button" onClick={returnToProjects} title="Back to project home">
    <FolderOpen size={16} aria-hidden="true" />
    {projectTitle}
  </button>
```

Replace with:

```tsx
<aside
  className={`workspace-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}
  aria-label="Workspace sidebar"
>
  <div className="sidebar-brand">
    <div className="sidebar-mark">F</div>
    <div className="sidebar-brand-text">
      <span className="sidebar-eyebrow">Qualitative workspace</span>
      <span className="sidebar-wordmark">Fieldnote</span>
    </div>
    <button
      type="button"
      className="sidebar-collapse-toggle"
      onClick={() => setSidebarCollapsed((current) => !current)}
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {sidebarCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
    </button>
  </div>

  <button className="project-switcher project-nav-link" type="button" onClick={returnToProjects} title="Back to project home">
    <span className="project-switcher-chevron" aria-hidden="true">▾</span>
    <span className="project-switcher-name">{projectTitle}</span>
  </button>
```

Note: the `FolderOpen` icon is replaced by a `▾` glyph inside a `<span>`.

- [ ] **Step 2: Render mode icons in the mode buttons**

Find this block (around line 2450):

```tsx
<nav className="mode-switcher" aria-label="Research modes">
  {modeItems.map((mode) => (
    <button key={mode.id} className={activeView === mode.id ? 'active' : ''} type="button" title={mode.description} onClick={() => selectView(mode.id)}>
      <span>{mode.label}</span>
      <small className={`mode-badge ${mode.status}`}>{mode.status === 'ready' ? 'Now' : mode.status === 'partial' ? 'MVP' : 'Soon'}</small>
    </button>
  ))}
</nav>
```

Replace with:

```tsx
<nav className="mode-switcher" aria-label="Research modes">
  {modeItems.map((mode) => {
    const Icon = mode.icon
    return (
      <button
        key={mode.id}
        className={activeView === mode.id ? 'active' : ''}
        type="button"
        title={`${mode.label} — ${mode.description}`}
        onClick={() => selectView(mode.id)}
      >
        <Icon size={15} className="mode-icon" aria-hidden="true" />
        <span className="mode-label">{mode.label}</span>
        <small className={`mode-badge ${mode.status}`}>
          {mode.status === 'ready' ? 'Now' : mode.status === 'partial' ? 'MVP' : 'Soon'}
        </small>
      </button>
    )
  })}
</nav>
```

The `title` now includes the label so collapsed-state hover shows the full mode name.

- [ ] **Step 3: Build to confirm no syntax errors**

```bash
npm run build
```

Expected: clean. The app may render with extra unstyled elements (brand block, mode icons) — that's fine until Task 3.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(shell): brand block + mode icons + collapse toggle markup"
```

---

## Task 3: Scoped CSS for the new shell + sidebar styling

**Files:**
- Modify: `src/App.css`

All new rules are scoped under `.app-shell[data-shell="new"]`. Until Task 4 sets that attribute, no visual change occurs.

- [ ] **Step 1: Append the new CSS block at the end of `src/App.css`**

```css

/* ============================================================
   Phase 3a — Shell + Sidebar — scoped under [data-shell="new"]
   Detail-view and properties-view internals stay on legacy
   styling until Phase 3b/3c land.
   ============================================================ */

.app-shell[data-shell="new"] {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01", "cv11", "calt";
  letter-spacing: -0.005em;
}

/* ----- Sidebar shell ------------------------------------------------- */
.app-shell[data-shell="new"] .workspace-sidebar {
  background: var(--shell);
  color: var(--shell-ink);
  width: 232px;
  min-width: 232px;
  border-right: 1px solid var(--shell-rule);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  padding: var(--s-4) var(--s-3);
  transition: width 180ms ease, min-width 180ms ease;
  overflow: hidden;
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed {
  width: 56px;
  min-width: 56px;
  padding: var(--s-4) var(--s-2);
}

/* ----- Brand block --------------------------------------------------- */
.app-shell[data-shell="new"] .sidebar-brand {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: var(--s-2);
  padding: 0 var(--s-1) var(--s-3);
  transition: opacity 120ms ease 60ms;
}

.app-shell[data-shell="new"] .sidebar-mark {
  width: 32px;
  height: 32px;
  border-radius: var(--r-2);
  background: var(--shell-deep);
  color: var(--shell-ink);
  display: grid;
  place-items: center;
  font-family: var(--font-reader);
  font-weight: 500;
  font-size: 18px;
  line-height: 1;
}

.app-shell[data-shell="new"] .sidebar-brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.app-shell[data-shell="new"] .sidebar-eyebrow {
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--shell-ink-3);
  font-size: 9.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell[data-shell="new"] .sidebar-wordmark {
  font-size: 17px;
  font-weight: 600;
  color: var(--shell-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell[data-shell="new"] .sidebar-collapse-toggle {
  width: 28px;
  height: 28px;
  border-radius: var(--r-1);
  background: transparent;
  color: var(--shell-ink-3);
  border: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.app-shell[data-shell="new"] .sidebar-collapse-toggle:hover {
  background: var(--shell-deep);
  color: var(--shell-ink);
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .sidebar-brand {
  grid-template-columns: 32px;
  justify-content: center;
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .sidebar-brand-text,
.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .sidebar-collapse-toggle {
  display: none;
}

/* ----- Project switcher ---------------------------------------------- */
.app-shell[data-shell="new"] .project-switcher {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-2);
  background: transparent;
  color: var(--shell-ink-2);
  border: 0;
  font: var(--t-ui-sm);
  cursor: pointer;
  text-align: left;
}

.app-shell[data-shell="new"] .project-switcher:hover {
  background: var(--shell-deep);
  color: var(--shell-ink);
}

.app-shell[data-shell="new"] .project-switcher-chevron {
  font-size: 12px;
  color: var(--shell-ink-3);
}

.app-shell[data-shell="new"] .project-switcher-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .project-switcher {
  display: none;
}

/* ----- Mode list ----------------------------------------------------- */
.app-shell[data-shell="new"] .mode-switcher {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--s-2);
}

.app-shell[data-shell="new"] .mode-switcher button {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-2);
  background: transparent;
  color: var(--shell-ink-2);
  border: 0;
  border-left: 2px solid transparent;
  font: var(--t-ui);
  cursor: pointer;
  text-align: left;
  position: relative;
}

.app-shell[data-shell="new"] .mode-switcher button:hover {
  background: var(--shell-deep);
  color: var(--shell-ink);
}

.app-shell[data-shell="new"] .mode-switcher button.active {
  background: var(--shell-deep);
  color: var(--shell-ink);
  border-left-color: var(--c-cyan);
}

.app-shell[data-shell="new"] .mode-switcher button .mode-icon {
  color: var(--shell-ink-3);
}

.app-shell[data-shell="new"] .mode-switcher button.active .mode-icon {
  color: var(--c-cyan);
}

.app-shell[data-shell="new"] .mode-switcher button .mode-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell[data-shell="new"] .mode-switcher button .mode-badge {
  font: var(--t-meta);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--shell-deep);
  color: var(--shell-ink-3);
  font-size: 9px;
}

.app-shell[data-shell="new"] .mode-switcher button.active .mode-badge {
  background: oklch(0 0 0 / 0.25);
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .mode-switcher button {
  grid-template-columns: 16px;
  justify-content: center;
  padding: var(--s-2) 0;
  border-left: 0;
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .mode-switcher button.active {
  background: var(--shell-deep);
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .mode-switcher button .mode-label,
.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .mode-switcher button .mode-badge {
  display: none;
}

/* ----- Folder pane (Organize) and ListView container ----------------- */
.app-shell[data-shell="new"] .folder-pane,
.app-shell[data-shell="new"] .list-view {
  background: transparent;
  color: var(--shell-ink-2);
}

.app-shell[data-shell="new"] .folder-pane .pane-title {
  color: var(--shell-ink-3);
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 10px;
  padding: var(--s-3) var(--s-2) var(--s-1);
}

.app-shell[data-shell="new"] .folder-pane .folder-row {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-2);
  background: transparent;
  color: var(--shell-ink-2);
  border: 0;
  font: var(--t-ui-sm);
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.app-shell[data-shell="new"] .folder-pane .folder-row:hover,
.app-shell[data-shell="new"] .folder-pane .folder-row.active {
  background: var(--shell-deep);
  color: var(--shell-ink);
}

.app-shell[data-shell="new"] .folder-pane .folder-row > span {
  margin-left: auto;
  color: var(--shell-ink-3);
  font: var(--t-meta);
}

.app-shell[data-shell="new"] .folder-pane .new-folder-row {
  padding: var(--s-2) var(--s-2);
}

.app-shell[data-shell="new"] .folder-pane .new-folder-row input {
  background: var(--shell-deep);
  color: var(--shell-ink);
  border: 1px solid var(--shell-rule);
  border-radius: var(--r-1);
  padding: var(--s-1) var(--s-2);
  font: var(--t-ui-sm);
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .folder-pane,
.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .list-view {
  display: none;
}

/* ----- Account / sign-out ------------------------------------------- */
.app-shell[data-shell="new"] .sidebar-account {
  margin-top: auto;
  padding-top: var(--s-3);
  border-top: 1px solid var(--shell-rule);
}

.app-shell[data-shell="new"] .sidebar-account .user-box {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2);
  font: var(--t-ui-sm);
  color: var(--shell-ink-2);
}

.app-shell[data-shell="new"] .sidebar-account .user-box span {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell[data-shell="new"] .sidebar-account .user-box button {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  background: transparent;
  border: 0;
  color: var(--shell-ink-3);
  cursor: pointer;
  font: var(--t-ui-sm);
  padding: var(--s-1) var(--s-2);
  border-radius: var(--r-1);
}

.app-shell[data-shell="new"] .sidebar-account .user-box button:hover {
  background: var(--shell-deep);
  color: var(--shell-ink);
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .sidebar-account .user-box span {
  display: none;
}

.app-shell[data-shell="new"] .workspace-sidebar.is-collapsed .sidebar-account .user-box {
  justify-content: center;
}
```

- [ ] **Step 2: Build to confirm CSS parses**

```bash
npm run build
```

Expected: clean. No visual change yet (the `data-shell="new"` attribute isn't set).

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "style(shell): scoped tokens + sidebar styling under [data-shell=new]"
```

---

## Task 4: Activate the new styling + manual sanity check + push

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the `data-shell="new"` attribute**

Find the `<main className="app-shell">` element (around line 2415). Replace with:

```tsx
<main className="app-shell" data-shell="new">
```

- [ ] **Step 2: Build, lint, test**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. 52 tests pass.

- [ ] **Step 3: Manual sanity check**

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`. Sign in. Verify:

1. Sidebar is dark (`--shell` color, near-black with cool cast).
2. Brand block at top: `F` mark + "QUALITATIVE WORKSPACE" eyebrow + "Fieldnote" wordmark + chevron toggle.
3. Project switcher row shows `▾ {project name}`. Click navigates back to Project Home.
4. Six mode buttons render with lucide icons (Folders, Highlighter, ListTree, Tags, BarChart3, FileText), labels, and status badges (Now/MVP/Soon).
5. Active mode shows cyan-tinted icon and a thin cyan left-edge mark.
6. Click the chevron toggle: sidebar shrinks to 56px. Brand block collapses to just the F mark. Project switcher hides. Mode buttons become icon-only. Folder pane (Organize) and ListView hide. Account block becomes just the sign-out icon.
7. Hover a collapsed mode button → tooltip shows `{Mode} — {description}`.
8. Refresh the page: collapsed state persists.
9. Click chevron again: expands.
10. Detail-view and properties-view continue to render with their existing (legacy navy) styling. Visual transition between dark sidebar and detail-view is expected and accepted until Phase 3b.

Stop the dev server (Ctrl-C) when done.

- [ ] **Step 4: Commit and push**

```bash
git add src/App.tsx
git commit -m "feat(shell): activate new shell + sidebar aesthetic"
git push origin main
```

- [ ] **Step 5: Smoke-test on prod**

Once Vercel finishes the build, open https://fieldnote-seven.vercel.app and repeat the manual checks against prod.

---

## Self-Review

- **Spec coverage:**
  - Shell container `--paper` background, token typography → Task 3 (CSS) + Task 4 (attribute).
  - Sidebar `--shell` dark surface, 232px width → Task 3.
  - Brand block (F mark + eyebrow + wordmark + chevron toggle) → Task 2 (markup) + Task 3 (CSS).
  - Project switcher row with `▾` chevron → Task 2 (markup) + Task 3 (CSS).
  - Mode list with lucide icons + status badges + cyan-accented active state → Task 1 (icons) + Task 2 (markup) + Task 3 (CSS).
  - Folder pane (Organize) restyled → Task 3 (CSS) — folder pane markup unchanged.
  - ListView container restyled (internals untouched) → Task 3 (CSS).
  - Sidebar account/sign-out restyled → Task 3 (CSS).
  - Mini-collapse toggle, 56px collapsed width, 180ms transition, localStorage persistence → Task 1 (state) + Task 2 (toggle) + Task 3 (CSS).
  - `title` tooltips on collapsed mode buttons → Task 2.
  - `.app-shell[data-shell="new"]` scoping for one-attribute rollback → Task 3 (rules) + Task 4 (attribute).

- **Placeholders:** none. Every code block is concrete.

- **Type consistency:** `LucideIcon` imported in Task 1 step 2, used as `mode.icon` type. `sidebarCollapsed: boolean` defined in Task 1 step 3, consumed by `.is-collapsed` class in Task 2 step 1. Localstorage key `fieldnote.sidebarCollapsed` consistent across read and write. Class names (`sidebar-brand`, `sidebar-mark`, `sidebar-eyebrow`, `sidebar-wordmark`, `sidebar-collapse-toggle`, `project-switcher-chevron`, `project-switcher-name`, `mode-icon`, `mode-label`, `mode-badge`, `is-collapsed`) match between Task 2 markup and Task 3 CSS.

- **Atomic commits:** Each task ends in a working `main`. Task 1 adds dormant state. Task 2 adds markup that renders unstyled but doesn't break. Task 3 adds rules that don't activate (no `data-shell` attribute). Task 4 flips the attribute and the new styling lights up. If Task 4 reveals a problem, reverting just Task 4 (or removing `data-shell="new"`) rolls back the visible change without touching Tasks 1–3.
