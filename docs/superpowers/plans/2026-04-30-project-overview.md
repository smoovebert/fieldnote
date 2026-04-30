# Project Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the multi-project landing page with a per-project Overview view that hosts the project memo, lands users on Overview by default, and exposes a project switcher in the header.

**Architecture:** Adds a sixth `WorkspaceView` (`'overview'`) and a new `src/modes/overview/` folder. Removes the `project-home-shell` early return so the workspace shell always renders. Creates a `ProjectSwitcher` for the header that owns the project list + Create form. Adds a `description` column to `fieldnote_projects` and threads it through ProjectRow / ProjectData / SavePayload / shape.ts.

**Tech Stack:** React + TypeScript + Vite + Supabase. Vitest for pure-function tests. Lucide icons. Project conventions: per-mode folders under `src/modes/<name>/`, types in `src/lib/types.ts`, persistence in `src/persistence/`.

---

## File map

**Create:**
- `src/modes/overview/OverviewMode.tsx` — page composition
- `src/modes/overview/StatCard.tsx` — reusable Progress + Ontology card
- `src/modes/overview/ProjectSwitcher.tsx` — header dropdown with project list + Create
- `src/modes/overview/__tests__/stats.test.ts` — pure-function tests for `computeProgress` and `computeOntology`
- `src/modes/overview/stats.ts` — `computeProgress`, `computeOntology` pure helpers

**Modify:**
- `src/lib/types.ts` — add `description: string` to `ProjectRow` and `ProjectData`
- `src/persistence/io.ts` — add `description` to `SavePayload`, include in `saveProject` UPDATE, read in `loadProject`
- `src/persistence/shape.ts` — `normalizeProject` and `composeProjectFromNormalized` populate `description`
- `src/lib/defaults.ts` — `defaultProject` gains `description: ''`
- `src/App.tsx` — add `'overview'` to `WorkspaceView`, prepend Overview to `modeItems`, default `activeView = 'overview'`, remove `project-home-shell` early return, render `OverviewMode` for `activeView === 'overview'`, render zero-projects empty state inside the workspace shell, wire `ProjectSwitcher` into the header
- `src/App.css` — minimal styles for overview cards + switcher (where existing `project-home` styles can be repurposed)

**Database migration:**
- Add `description text not null default ''` to `fieldnote_projects` via Supabase SQL editor

---

## Task 1: Add `description` column to Supabase + propagate the type

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/defaults.ts`
- Migration: Supabase SQL editor (manual, documented in commit body)

This is the foundation — every later task assumes `description` exists on `ProjectRow` / `ProjectData`. The migration must be run before App.tsx can read or write it without 500ing.

- [ ] **Step 1.1: Run migration in Supabase SQL editor**

```sql
ALTER TABLE fieldnote_projects
ADD COLUMN description text NOT NULL DEFAULT '';
```

This is the only manual step. Verify with:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fieldnote_projects' AND column_name = 'description';
```

Expected: one row, `description | text | ''::text`.

- [ ] **Step 1.2: Add `description` to `ProjectRow`**

Edit `src/lib/types.ts`. Find the `ProjectRow` type (it has `id`, `title`, `active_source_id`, `source_title`, `transcript`, `memo`, `sources`, `codes`, `memos`, `excerpts`, `line_numbering_mode`, `line_numbering_width`, JSON fields for cases/attributes/etc., `updated_at`).

Add the `description` field next to `title`:

```ts
export type ProjectRow = {
  id: string
  title: string
  description: string
  // ... existing fields unchanged
}
```

- [ ] **Step 1.3: Add `description` to `ProjectData`**

In the same file, find `ProjectData`. Add `description: string`:

```ts
export type ProjectData = {
  description: string
  // ... existing fields unchanged
}
```

- [ ] **Step 1.4: Add `description` to `defaultProject`**

Edit `src/lib/defaults.ts`. Find `export const defaultProject: ProjectData = { ... }`. Add `description: ''` (empty string).

```ts
export const defaultProject: ProjectData = {
  description: '',
  // ... existing fields unchanged
}
```

- [ ] **Step 1.5: Verify types compile**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: ERRORS in App.tsx and persistence/shape.ts and persistence/io.ts because they construct `ProjectData` / `ProjectRow` literals without `description`. That's fine — Tasks 2 and 3 fix those.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/types.ts src/lib/defaults.ts
git commit -m "feat(overview): add description field to ProjectRow + ProjectData

Migration run on Supabase: ALTER TABLE fieldnote_projects ADD COLUMN
description text NOT NULL DEFAULT ''. Types updated; defaultProject
seeds with ''. Persistence + App.tsx wire-up follows in next commits.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Thread `description` through persistence (shape.ts + io.ts)

**Files:**
- Modify: `src/persistence/shape.ts`
- Modify: `src/persistence/io.ts`
- Modify: `src/persistence/__tests__/shape.test.ts`

Both `normalizeProject` and `composeProjectFromNormalized` must populate `description`. `saveProject` must write it; `loadProject` reads it implicitly via `normalizeProject` / `composeProjectFromNormalized`.

- [ ] **Step 2.1: Update `normalizeProject` in `src/persistence/shape.ts`**

Find `export function normalizeProject(project: ProjectRow): ProjectData`. The function returns a `ProjectData` literal. Add `description: project.description ?? ''` to that return value (the `?? ''` is defensive — if a row from before the migration somehow loads, the empty string is the right fallback).

- [ ] **Step 2.2: Update `composeProjectFromNormalized` in `src/persistence/shape.ts`**

Find `export function composeProjectFromNormalized(project: ProjectRow, ...)`. The function builds a `ProjectData` from the row + normalized child arrays. Add `description: project.description ?? ''` to its return value.

- [ ] **Step 2.3: Add a failing test for `normalizeProject` description handling**

Edit `src/persistence/__tests__/shape.test.ts`. Add inside the existing `describe('normalizeProject', ...)`:

```ts
it('passes description through from row to ProjectData', () => {
  const project = {
    id: 'p', title: 'P', description: 'A study of access',
    codes: [], excerpts: [], memos: [], sources: [],
  } as unknown as Parameters<typeof normalizeProject>[0]
  const data = normalizeProject(project)
  expect(data.description).toBe('A study of access')
})

it('defaults description to empty string when missing', () => {
  const project = { id: 'p', title: 'P', codes: [], excerpts: [], memos: [], sources: [] } as unknown as Parameters<typeof normalizeProject>[0]
  const data = normalizeProject(project)
  expect(data.description).toBe('')
})
```

- [ ] **Step 2.4: Add a failing test for `composeProjectFromNormalized` description**

Same file, inside the existing `describe('composeProjectFromNormalized', ...)`:

```ts
it('includes description in the returned ProjectData', () => {
  const project = { id: 'p', title: 'P', description: 'My study' } as unknown as Parameters<typeof composeProjectFromNormalized>[0]
  const data = composeProjectFromNormalized(project, [], [], [], [], [])
  expect(data.description).toBe('My study')
})
```

- [ ] **Step 2.5: Run the new tests and confirm they pass**

```bash
npx vitest run src/persistence/__tests__/shape.test.ts
```

Expected: all tests pass (existing 25 + 3 new = 28 tests in this file). If the description tests fail, revisit Steps 2.1 and 2.2.

- [ ] **Step 2.6: Update `SavePayload` in `src/persistence/io.ts`**

Find `export type SavePayload`. Add `description: string` next to `title`:

```ts
export type SavePayload = {
  title: string
  description: string
  // ... existing fields unchanged
}
```

- [ ] **Step 2.7: Update the UPDATE call inside `saveProject`**

In `src/persistence/io.ts`, find `saveProject`. It calls `supabase.from('fieldnote_projects').update({...}).eq('id', projectId)`. Add `description: payload.description` to the update object alongside `title`:

```ts
await supabase
  .from('fieldnote_projects')
  .update({
    title: payload.title,
    description: payload.description,
    // ... existing fields unchanged
  })
  .eq('id', projectId)
```

- [ ] **Step 2.8: Verify build + full test suite**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npx vitest run
```

Expected: tsc still fails on App.tsx (Task 3 fixes it). Lint clean (or also blocked on App.tsx). Tests: 137 + 3 = 140 passing.

- [ ] **Step 2.9: Commit**

```bash
git add src/persistence/ src/persistence/__tests__/shape.test.ts
git commit -m "feat(overview): thread description through persistence layer

normalizeProject + composeProjectFromNormalized populate description.
SavePayload + saveProject write it. 3 new shape.ts tests cover the
load path. App.tsx wire-up follows.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Wire `description` into App.tsx (no UI yet)

**Files:**
- Modify: `src/App.tsx`

App.tsx constructs `ProjectData` and the autosave `SavePayload`. Both literals are missing `description`. This task makes the build green again — no user-facing change yet.

- [ ] **Step 3.1: Find every `ProjectData` literal in App.tsx**

```bash
grep -n "ProjectData\|projectData\|defaultProject" src/App.tsx | head -25
```

Look for places where a `ProjectData` literal is built. The main sites are around the `projectData` `useMemo` and `applyProject`.

- [ ] **Step 3.2: Add `description` state**

Just after the existing `const [title, setTitle] = useState(...)` line (search for it; it's near the top of the App function), add:

```ts
const [description, setDescription] = useState('')
```

- [ ] **Step 3.3: Update the `projectData` useMemo**

Find the `useMemo` that builds `projectData`. Add `description` to the literal and to the deps array.

```ts
const projectData = useMemo<ProjectData>(
  () => ({ description, activeSourceId, sources, cases, attributes, attributeValues, savedQueries, codes, memos, excerpts }),
  [description, activeSourceId, attributeValues, attributes, cases, codes, excerpts, memos, savedQueries, sources]
)
```

- [ ] **Step 3.4: Update the `persistencePayload` useMemo**

Find the `persistencePayload: SavePayload | null` useMemo. Add `description` to the literal and to the deps array.

- [ ] **Step 3.5: Update `applyProject` to read `description`**

Find `async function applyProject(project: ProjectRow)`. After `setTitle(project.title || ...)`, add:

```ts
setDescription(project.description ?? '')
```

- [ ] **Step 3.6: Reset `description` in `returnToProjects` and any other "clear project" paths**

Find `function returnToProjects()`. After `setProjectId(null)`, add `setDescription('')`. Search for any other places that clear project state and reset description there too.

```bash
grep -n "setProjectId(null)" src/App.tsx
```

For each occurrence, ensure `setDescription('')` follows.

- [ ] **Step 3.7: Verify build is green**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm run build
npx vitest run
```

Expected: all clean. 140 tests passing.

- [ ] **Step 3.8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(overview): wire description state into App.tsx

description state, included in projectData useMemo + persistencePayload,
restored on applyProject, cleared on returnToProjects. No UI surface
yet — that comes with Overview mode.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Pure stat helpers + tests

**Files:**
- Create: `src/modes/overview/stats.ts`
- Create: `src/modes/overview/__tests__/stats.test.ts`

The Overview's Progress and Ontology cards are derived from the same data already in App. Extract the math as pure functions so the cards become trivial display.

- [ ] **Step 4.1: Write the failing tests for `computeProgress`**

Create `src/modes/overview/__tests__/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeProgress, computeOntology } from '../stats'
import type { Code, Excerpt, Source } from '../../../lib/types'

const source = (id: string, overrides: Partial<Source> = {}): Source => ({
  id, title: id, kind: 'Transcript', folder: 'Internals', content: '', ...overrides,
})
const code = (id: string, overrides: Partial<Code> = {}): Code => ({
  id, name: id, color: '#000', description: '', ...overrides,
})
const excerpt = (id: string, sourceId: string, codeIds: string[]): Excerpt => ({
  id, sourceId, sourceTitle: sourceId, codeIds, text: 'x', note: '',
})

describe('computeProgress', () => {
  it('returns 0/0 for empty inputs', () => {
    expect(computeProgress({ sources: [], excerpts: [] })).toEqual({ coded: 0, total: 0 })
  })

  it('counts a source as coded when it has at least one excerpt with at least one code', () => {
    const sources = [source('s1'), source('s2')]
    const excerpts = [excerpt('e1', 's1', ['c1'])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 1, total: 2 })
  })

  it('does not count a source whose only excerpt has no codes', () => {
    const sources = [source('s1')]
    const excerpts = [excerpt('e1', 's1', [])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 0, total: 1 })
  })

  it('excludes archived sources from total and coded count', () => {
    const sources = [source('s1', { archived: true }), source('s2')]
    const excerpts = [excerpt('e1', 's1', ['c1']), excerpt('e2', 's2', ['c1'])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 1, total: 1 })
  })

  it('counts a source once even with many coded excerpts', () => {
    const sources = [source('s1')]
    const excerpts = [excerpt('e1', 's1', ['c1']), excerpt('e2', 's1', ['c2'])]
    expect(computeProgress({ sources, excerpts })).toEqual({ coded: 1, total: 1 })
  })
})

describe('computeOntology', () => {
  it('returns 0 codes / 0 themes for empty input', () => {
    expect(computeOntology([])).toEqual({ codes: 0, themes: 0 })
  })

  it('counts top-level codes (no parentCodeId) as themes', () => {
    const codes = [code('c1'), code('c2'), code('c3', { parentCodeId: 'c1' })]
    expect(computeOntology(codes)).toEqual({ codes: 3, themes: 2 })
  })

  it('treats a parentCodeId pointing to a missing code as a theme', () => {
    const codes = [code('c1', { parentCodeId: 'missing' })]
    expect(computeOntology(codes)).toEqual({ codes: 1, themes: 1 })
  })
})
```

- [ ] **Step 4.2: Run the tests and confirm they fail**

```bash
npx vitest run src/modes/overview/__tests__/stats.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4.3: Implement `stats.ts`**

Create `src/modes/overview/stats.ts`:

```ts
import type { Code, Excerpt, Source } from '../../lib/types'

export function computeProgress(input: {
  sources: Source[]
  excerpts: Excerpt[]
}): { coded: number; total: number } {
  const liveSources = input.sources.filter((s) => !s.archived)
  const total = liveSources.length
  const codedSourceIds = new Set(
    input.excerpts
      .filter((e) => e.codeIds.length > 0)
      .map((e) => e.sourceId)
  )
  const coded = liveSources.filter((s) => codedSourceIds.has(s.id)).length
  return { coded, total }
}

export function computeOntology(codes: Code[]): { codes: number; themes: number } {
  const ids = new Set(codes.map((c) => c.id))
  const themes = codes.filter((c) => !c.parentCodeId || !ids.has(c.parentCodeId)).length
  return { codes: codes.length, themes }
}
```

- [ ] **Step 4.4: Run the tests and confirm they pass**

```bash
npx vitest run src/modes/overview/__tests__/stats.test.ts
```

Expected: 7 tests passing.

- [ ] **Step 4.5: Run full suite + lint + build**

```bash
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm run build
npx vitest run
```

All clean. Total: 140 + 7 = 147 tests.

- [ ] **Step 4.6: Commit**

```bash
git add src/modes/overview/
git commit -m "feat(overview): pure stat helpers (computeProgress, computeOntology)

Coded = source has >=1 excerpt with >=1 code. Total excludes archived.
Themes = top-level codes (no parentCodeId, or parentCodeId pointing to
a missing code). 7 inline-fixture tests cover empty inputs, multi-code
sources, archived exclusion, and orphan parents.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: `StatCard` presentation component

**Files:**
- Create: `src/modes/overview/StatCard.tsx`

Small reusable card for the two stat tiles. No tests — pure presentation.

- [ ] **Step 5.1: Implement `StatCard`**

```tsx
import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  icon: LucideIcon
  iconBackground?: string
  primary: ReactNode
  secondary?: ReactNode
  progress?: { value: number; max: number }
}

export function StatCard({ label, icon: Icon, iconBackground, primary, secondary, progress }: Props) {
  const ratio = progress && progress.max > 0 ? Math.min(1, progress.value / progress.max) : 0
  const barStyle: CSSProperties = { width: `${ratio * 100}%` }
  return (
    <article className="overview-stat-card">
      <header className="overview-stat-card-head">
        <span className="overview-stat-icon" style={iconBackground ? { background: iconBackground } : undefined}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="overview-stat-label">{label}</span>
      </header>
      <div className="overview-stat-primary">{primary}</div>
      {secondary && <div className="overview-stat-secondary">{secondary}</div>}
      {progress && (
        <div className="overview-stat-progress" aria-hidden="true">
          <span style={barStyle} />
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 5.2: Verify build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
```

Clean.

- [ ] **Step 5.3: Commit**

```bash
git add src/modes/overview/StatCard.tsx
git commit -m "feat(overview): StatCard presentation component

Reusable tile with icon + label + primary value + optional secondary
line + optional progress bar. No tests — pure presentation, used by
OverviewMode.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: `OverviewMode` page composition

**Files:**
- Create: `src/modes/overview/OverviewMode.tsx`

The Overview page itself. Owns title editing, description editing, the stat row, the project memo textarea, and the `+ New source` button.

- [ ] **Step 6.1: Implement `OverviewMode`**

```tsx
import { ChangeEvent } from 'react'
import { BarChart3, Network, Plus } from 'lucide-react'
import type { Code, Excerpt, Memo, Source } from '../../lib/types'
import { computeOntology, computeProgress } from './stats'
import { StatCard } from './StatCard'

type Props = {
  title: string
  description: string
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  projectMemo: Memo | undefined
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onProjectMemoChange: (next: string) => void
  onNewSource: () => void
}

export function OverviewMode(props: Props) {
  const progress = computeProgress({ sources: props.sources, excerpts: props.excerpts })
  const ontology = computeOntology(props.codes)

  return (
    <article className="overview-mode">
      <header className="overview-header">
        <div className="overview-titles">
          <input
            className="overview-title"
            value={props.title}
            placeholder="Untitled project"
            aria-label="Project title"
            onChange={(event: ChangeEvent<HTMLInputElement>) => props.onTitleChange(event.target.value)}
          />
          <input
            className="overview-description"
            value={props.description}
            placeholder="One-line description for collaborators"
            aria-label="Project description"
            onChange={(event: ChangeEvent<HTMLInputElement>) => props.onDescriptionChange(event.target.value)}
          />
        </div>
        <button type="button" className="primary-button" onClick={props.onNewSource}>
          <Plus size={16} aria-hidden="true" />
          New source
        </button>
      </header>

      <div className="overview-stats">
        <StatCard
          label="Progress"
          icon={BarChart3}
          iconBackground="#e8eafc"
          primary={
            <span>
              <strong>{progress.coded}</strong>
              <span className="overview-stat-of"> of {progress.total} sources coded</span>
            </span>
          }
          progress={{ value: progress.coded, max: progress.total }}
        />
        <StatCard
          label="Ontology"
          icon={Network}
          iconBackground="#fbe9d8"
          primary={<strong>{ontology.codes}</strong>}
          secondary={<span>{ontology.themes === 1 ? '1 theme' : `${ontology.themes} themes`}</span>}
        />
      </div>

      <section className="overview-memo">
        <header className="panel-heading">
          <h2>Project memo</h2>
        </header>
        <textarea
          value={props.projectMemo?.body ?? ''}
          placeholder="Add notes about this project's research questions, design choices, or evolving thinking."
          aria-label="Project memo"
          onChange={(event) => props.onProjectMemoChange(event.target.value)}
        />
      </section>
    </article>
  )
}
```

- [ ] **Step 6.2: Verify build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
```

Clean.

- [ ] **Step 6.3: Commit**

```bash
git add src/modes/overview/OverviewMode.tsx
git commit -m "feat(overview): OverviewMode page composition

Title + description inputs (inline-edit), stat row (Progress, Ontology),
project memo textarea, + New source button. No App wiring yet — that
comes in Task 9.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: `ProjectSwitcher` header dropdown

**Files:**
- Create: `src/modes/overview/ProjectSwitcher.tsx`

Header dropdown that lists projects and contains the Create form. Closed-by-default; toggled by clicking the trigger.

- [ ] **Step 7.1: Implement `ProjectSwitcher`**

```tsx
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import type { ProjectRow } from '../../lib/types'

type Props = {
  activeProjectId: string | null
  activeProjectTitle: string
  projects: ProjectRow[]
  newProjectTitle: string
  isCreatingProject: boolean
  onSelectProject: (project: ProjectRow) => void
  onNewProjectTitleChange: (next: string) => void
  onCreateProject: () => void
}

export function ProjectSwitcher(props: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const triggerLabel = props.activeProjectId ? props.activeProjectTitle || 'Untitled project' : 'No project selected'

  return (
    <div className="project-switcher" ref={containerRef}>
      <button
        type="button"
        className="project-switcher-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="project-switcher-label">{triggerLabel}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="project-switcher-menu" role="menu">
          <ul className="project-switcher-list">
            {props.projects.length === 0 && (
              <li className="project-switcher-empty">No projects yet.</li>
            )}
            {props.projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className={project.id === props.activeProjectId ? 'active' : ''}
                  onClick={() => {
                    props.onSelectProject(project)
                    setOpen(false)
                  }}
                >
                  <span className="project-switcher-title">{project.title || 'Untitled project'}</span>
                  <span className="project-switcher-meta">
                    {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '-'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="project-switcher-create">
            <input
              value={props.newProjectTitle}
              placeholder="New project title"
              aria-label="New project title"
              onChange={(event: ChangeEvent<HTMLInputElement>) => props.onNewProjectTitleChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  props.onCreateProject()
                  setOpen(false)
                }
              }}
            />
            <button
              type="button"
              disabled={props.isCreatingProject || !props.newProjectTitle.trim()}
              onClick={() => {
                props.onCreateProject()
                setOpen(false)
              }}
            >
              <Plus size={14} aria-hidden="true" />
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7.2: Verify build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
```

Clean.

- [ ] **Step 7.3: Commit**

```bash
git add src/modes/overview/ProjectSwitcher.tsx
git commit -m "feat(overview): ProjectSwitcher header dropdown

Trigger shows active project title + chevron. Menu lists all projects
(title + last-updated date) and contains an inline Create row at the
bottom. Closes on outside-pointerdown. No App wiring yet.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Add `'overview'` to `WorkspaceView` and `modeItems`

**Files:**
- Modify: `src/App.tsx`

Foundation for Task 9's wiring. After this, the Overview button shows in the top nav but clicking it does nothing useful yet (renders nothing, since OverviewMode isn't mounted).

- [ ] **Step 8.1: Extend `WorkspaceView`**

In `src/App.tsx`, find:

```ts
type WorkspaceView = 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
```

Replace with:

```ts
type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
```

- [ ] **Step 8.2: Prepend Overview to `modeItems`**

In `src/App.tsx`, find `const modeItems: Array<{...}> = [`. Add a `LayoutDashboard` import to the existing `lucide-react` import line at the top of the file. Then prepend Overview as the first item:

```ts
import { LayoutDashboard, /* ... existing icons unchanged */ } from 'lucide-react'

// ...

const modeItems: Array<{
  id: WorkspaceView
  label: string
  description: string
  status: 'ready' | 'partial' | 'soon'
  icon: LucideIcon
}> = [
  { id: 'overview', label: 'Overview', description: 'Project summary, project memo, and quick stats.', status: 'ready', icon: LayoutDashboard },
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.', status: 'ready', icon: Folders },
  { id: 'code',     label: 'Code',     description: 'Close-read sources and code selected passages.', status: 'ready', icon: Highlighter },
  { id: 'refine',   label: 'Refine',   description: 'Clean the codebook and review code references.', status: 'partial', icon: ListTree },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'partial', icon: Tags },
  { id: 'analyze',  label: 'Analyze',  description: 'Run searches, matrices, and comparisons.', status: 'partial', icon: BarChart3 },
  { id: 'report',   label: 'Report',   description: 'Export excerpts, memos, and codebooks.', status: 'partial', icon: FileText },
]
```

- [ ] **Step 8.3: Change default `activeView`**

Find `const [activeView, setActiveView] = useState<WorkspaceView>('organize')`. Change to `'overview'`:

```ts
const [activeView, setActiveView] = useState<WorkspaceView>('overview')
```

- [ ] **Step 8.4: Update `applyProject` so loading a project lands on Overview**

Find `async function applyProject(project: ProjectRow)`. There's a line that calls `setActiveView('organize')`. Change to `setActiveView('overview')`.

```bash
grep -n "setActiveView('organize')" src/App.tsx
```

For each occurrence inside `applyProject` and `createProject`, change to `setActiveView('overview')`.

- [ ] **Step 8.5: Verify build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm run build
npx vitest run
```

All clean. 147 tests passing.

- [ ] **Step 8.6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(overview): add overview to WorkspaceView + top nav

WorkspaceView gains 'overview'; modeItems prepends an Overview entry
with the LayoutDashboard icon. Default activeView = 'overview', and
applyProject + createProject land users on Overview. The mode renders
nothing yet — Task 9 wires OverviewMode in.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Wire OverviewMode into App.tsx + remove the project-home shell

**Files:**
- Modify: `src/App.tsx`

This is the biggest task. It (a) renders OverviewMode when `activeView === 'overview'`, (b) removes the `project-home-shell` early return so the workspace shell always renders, (c) shows the zero-projects empty state inside the workspace shell, (d) wires the ProjectSwitcher into the header.

- [ ] **Step 9.1: Add imports for the new mode + switcher**

Near the top of `src/App.tsx`, add:

```ts
import { OverviewMode } from './modes/overview/OverviewMode'
import { ProjectSwitcher } from './modes/overview/ProjectSwitcher'
```

- [ ] **Step 9.2: Add an `updateProjectMemo` helper near `updateRailMemo`**

The Overview's project-memo textarea writes through a focused helper. Find `function updateRailMemo` (around line 1412) and add this above or below it:

```ts
function updateProjectMemo(body: string) {
  const existing = memos.find((memo) => memo.linkedType === 'project')
  if (existing) {
    updateMemo(existing.id, { body })
    return
  }
  const memo: Memo = {
    id: `memo-${Date.now()}`,
    title: 'Project memo',
    linkedType: 'project',
    body,
  }
  setMemos((current) => [memo, ...current])
  setActiveMemoId(memo.id)
}
```

(Compare this with `updateRailMemo`'s shape — they share structure but `updateProjectMemo` is unconditionally project-scoped, which makes the call site on Overview clean.)

- [ ] **Step 9.3: Add an `onNewSource` trigger for Overview**

Search for the existing source upload entry point — there's an `<input type="file">` in Organize mode (find `importTranscript` and the input that calls it). Lift the file-input ref so Overview can trigger it.

```bash
grep -n "importTranscript\|type=\"file\"" src/App.tsx | head -10
```

Add at the App component's top-level state (near other refs):

```ts
const overviewFileInputRef = useRef<HTMLInputElement>(null)
```

The simplest approach: render a hidden `<input type="file" multiple>` near the existing one but always present (not gated on Organize), wired to `importTranscript`. The Overview's `+ New source` button calls `overviewFileInputRef.current?.click()`.

Add near the top of the workspace JSX (just after the header, before the main content):

```tsx
<input
  ref={overviewFileInputRef}
  type="file"
  multiple
  accept=".txt,.md,.docx,.pdf"
  style={{ display: 'none' }}
  onChange={importTranscript}
/>
```

(If the existing Organize-mode file input is conditionally rendered, leave it alone — this hidden one is just for Overview.)

- [ ] **Step 9.4: Render OverviewMode**

Find the existing `{activeView === 'organize' && (...)}` block. Add an `overview` branch above it:

```tsx
{activeView === 'overview' && (
  <OverviewMode
    title={title}
    description={description}
    sources={sources}
    codes={codes}
    excerpts={excerpts}
    projectMemo={memos.find((memo) => memo.linkedType === 'project')}
    onTitleChange={setTitle}
    onDescriptionChange={setDescription}
    onProjectMemoChange={updateProjectMemo}
    onNewSource={() => overviewFileInputRef.current?.click()}
  />
)}
```

- [ ] **Step 9.5: Hide the right-rail inspector when on Overview**

Find where the inspector rail renders (search for `inspector` or `rail` or the panel with `id="memo"`). Wrap the rail's container so it only renders when `activeView !== 'overview'`. The exact block depends on how the rail is structured — find the outer rail container and add a condition:

```bash
grep -n "rail\|inspector\|aside" src/App.tsx | head -10
```

If the rail is an `<aside>` or a div with class `inspector`/`rail`, wrap with `{activeView !== 'overview' && (...)}`.

- [ ] **Step 9.6: Replace the `project-home-shell` early return with an empty-state branch**

Find the block (around line 1683):

```tsx
if (!projectId) {
  return (
    <main className="project-home-shell" data-shell="new">
      ...the entire multi-project landing JSX...
    </main>
  )
}
```

Delete this block entirely. The workspace shell below will render unconditionally.

- [ ] **Step 9.7: Add a zero-projects empty state inside the workspace shell**

Inside the existing main content area (where modes render), add — just before the `activeView === 'overview'` branch:

```tsx
{!projectId && (
  <article className="overview-empty-state">
    <h2>Welcome to Fieldnote</h2>
    <p>Create your first research project to begin.</p>
    <div className="overview-empty-create">
      <input
        value={newProjectTitle}
        placeholder="Project title"
        aria-label="Project title"
        onChange={(event) => setNewProjectTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void createProject()
        }}
      />
      <button type="button" onClick={() => void createProject()} disabled={isCreatingProject}>
        <Plus size={16} aria-hidden="true" />
        Create project
      </button>
    </div>
  </article>
)}
```

And gate every existing mode branch (`activeView === 'overview' && ...`, `activeView === 'organize' && ...`, etc.) on `projectId &&` so they don't render in the empty state.

For the Overview branch specifically:

```tsx
{projectId && activeView === 'overview' && (
  <OverviewMode ... />
)}
```

For all other modes, do the same — prepend `projectId && `. This keeps the chrome consistent while no project is loaded.

- [ ] **Step 9.8: Wire ProjectSwitcher into the header**

In the header JSX (search for `app-header-modes` and find the parent header), find where the project name button currently sits (around line 1796–1807). Replace that block with:

```tsx
<ProjectSwitcher
  activeProjectId={projectId}
  activeProjectTitle={title}
  projects={projectRows}
  newProjectTitle={newProjectTitle}
  isCreatingProject={isCreatingProject}
  onSelectProject={(project) => void applyProject(project)}
  onNewProjectTitleChange={setNewProjectTitle}
  onCreateProject={() => void createProject()}
/>
```

Remove the old "switch project" button (which called `returnToProjects`). `returnToProjects` may now be unused; if so, delete it. If it's still referenced elsewhere, leave it.

```bash
grep -n "returnToProjects" src/App.tsx
```

If only its definition remains, delete the function.

- [ ] **Step 9.9: Disable non-Overview modes when no project loaded**

In the existing `modeItems.map(...)` rendering (around line 1811), add a `disabled` state when `!projectId && mode.id !== 'overview'`:

```tsx
{modeItems.map((mode) => {
  const Icon = mode.icon
  const isDisabled = !projectId && mode.id !== 'overview'
  return (
    <button
      key={mode.id}
      className={activeView === mode.id ? 'active' : ''}
      type="button"
      title={`${mode.label} — ${mode.description}`}
      disabled={isDisabled}
      onClick={() => selectView(mode.id)}
    >
      <Icon size={15} aria-hidden="true" />
      <span>{mode.label}</span>
    </button>
  )
})}
```

Also remove the existing `{projectId && (` wrapper around the `<nav>` so the nav always renders — only the buttons within get disabled.

- [ ] **Step 9.10: Verify build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm run build
npx vitest run
```

All clean. 147 tests still passing.

- [ ] **Step 9.11: Commit**

```bash
git add src/App.tsx
git commit -m "feat(overview): wire OverviewMode + ProjectSwitcher into App

Overview renders for activeView === 'overview'; the right-rail inspector
hides on Overview. The project-home-shell early return is gone — the
workspace shell always renders, and a zero-projects empty state lives
inside it. ProjectSwitcher in the header replaces the old 'switch
project' button. Non-Overview modes are disabled until a project loads.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Styles for Overview + ProjectSwitcher

**Files:**
- Modify: `src/App.css`

Minimal styling so the page is usable. Reuse existing tokens and patterns from `project-home` styles where applicable.

- [ ] **Step 10.1: Add Overview styles**

Append to `src/App.css`:

```css
.overview-mode {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 40px;
  max-width: 1180px;
  margin: 0 auto;
  width: 100%;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.overview-titles { display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; min-width: 0; }
.overview-title {
  font: 600 28px/1.2 inherit;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
}
.overview-title:focus { outline: 1px dashed var(--accent, #4a6cf7); outline-offset: 4px; }
.overview-description {
  font: 400 15px/1.4 inherit;
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--muted, #6b7280);
}
.overview-description:focus { outline: 1px dashed var(--accent, #4a6cf7); outline-offset: 4px; }

.overview-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.overview-stat-card {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 18px 20px;
  background: var(--surface, #ffffff);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.overview-stat-card-head { display: flex; align-items: center; gap: 10px; }
.overview-stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.overview-stat-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted, #6b7280);
}
.overview-stat-primary { font-size: 28px; font-weight: 600; }
.overview-stat-of { font-size: 14px; font-weight: 400; color: var(--muted, #6b7280); }
.overview-stat-secondary { font-size: 13px; color: var(--muted, #6b7280); }
.overview-stat-progress {
  height: 6px;
  border-radius: 999px;
  background: var(--border, #e5e7eb);
  overflow: hidden;
}
.overview-stat-progress > span {
  display: block;
  height: 100%;
  background: var(--accent, #4a6cf7);
}

.overview-memo {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  padding: 18px 20px;
  background: var(--surface, #ffffff);
}
.overview-memo textarea {
  width: 100%;
  min-height: 160px;
  resize: vertical;
  border: 0;
  background: transparent;
  font: inherit;
  padding: 8px 0 0 0;
}

.overview-empty-state {
  max-width: 480px;
  margin: 96px auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.overview-empty-create { display: flex; gap: 8px; }
.overview-empty-create input { flex: 1 1 auto; }
```

- [ ] **Step 10.2: Add ProjectSwitcher styles**

Append:

```css
.project-switcher { position: relative; }
.project-switcher-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font: 600 14px/1 inherit;
}
.project-switcher-trigger:hover { background: var(--hover, #f3f4f6); border-color: var(--border, #e5e7eb); }
.project-switcher-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  min-width: 280px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 12px;
  background: var(--surface, #ffffff);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
  padding: 8px;
}
.project-switcher-list { list-style: none; padding: 0; margin: 0; max-height: 280px; overflow-y: auto; }
.project-switcher-list button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}
.project-switcher-list button:hover { background: var(--hover, #f3f4f6); }
.project-switcher-list button.active { background: var(--accent-soft, #eef2ff); }
.project-switcher-meta { font-size: 12px; color: var(--muted, #6b7280); }
.project-switcher-empty { padding: 12px 10px; color: var(--muted, #6b7280); font-size: 13px; }
.project-switcher-create {
  display: flex;
  gap: 6px;
  padding: 8px 4px 4px;
  border-top: 1px solid var(--border, #e5e7eb);
  margin-top: 8px;
}
.project-switcher-create input { flex: 1 1 auto; min-width: 0; }
```

- [ ] **Step 10.3: Verify build + lint**

```bash
npm run lint
npm run build
```

Clean.

- [ ] **Step 10.4: Commit**

```bash
git add src/App.css
git commit -m "style(overview): styles for OverviewMode + ProjectSwitcher

Two-column stat row, full-width memo card, ghost-style title +
description inputs that look like text but edit on click. Switcher
dropdown with project list and inline Create row.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Final manual smoke test + push

**Files:** none (verification only)

- [ ] **Step 11.1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 11.2: Manual smoke checklist (run through every item)**

1. Sign in. If you have projects, you land on Overview for the most-recent one.
2. Confirm header shows ProjectSwitcher with active project title + chevron.
3. Click switcher → dropdown shows all projects + a Create row at the bottom.
4. Click another project → Overview re-renders for that project; title, description, stats, memo all update.
5. Click "+ New source" on Overview → file picker opens. Pick a `.txt` file → it imports; switch to Organize, the new source is there. Switch back to Overview, Progress card "X of Y" total has incremented.
6. Type into the description input → autosave fires (sync indicator). Refresh the page → description persists.
7. Type into the project memo textarea → autosave fires. Refresh → persists.
8. Open Report mode → if memo is non-empty, Project memo section renders with the typed content. If empty, no Project memo section.
9. Sign out → sign in with a fresh user OR use a test account with no projects. Workspace chrome renders, mode buttons other than Overview are disabled, Overview content is the empty-state Create form.
10. Type a project title, click Create → new project appears, you land on Overview.

If any step fails, fix it before committing the smoke checklist as done.

- [ ] **Step 11.3: Push**

```bash
git push origin main
```

---

## Self-review notes

- **Spec coverage:** Every section of the design spec has at least one task. Pages/shells: Task 9. Header: Tasks 7 + 9. Overview content: Tasks 4–6 + 9. Empty state: Task 9. Data + state: Tasks 1–3. Components: Tasks 4–7. Migration: Task 1.
- **Type consistency:** `description: string` is used identically across `ProjectRow`, `ProjectData`, `SavePayload`, and `defaultProject`. `WorkspaceView` adds `'overview'` exactly once. Component prop names match between `OverviewMode`/`ProjectSwitcher` and the App wire-up.
- **Test coverage:** 7 new pure-function tests for `computeProgress` / `computeOntology`, 3 new tests for `description` round-tripping in shape.ts. Total: 137 → 147. Components are not unit-tested — covered by manual smoke in Task 11.
