# Phase 4 — Persistence Module Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move persistence (normalization, row building, Supabase I/O, autosave) from `src/App.tsx` into `src/persistence/`, with unit tests for the pure shape layer.

**Architecture:** Three files in `src/persistence/` — `shape.ts` (pure functions), `io.ts` (async Supabase calls), `useAutosave.ts` (React hook for debounced autosave with in-flight guard). The pure layer is fully unit-tested. App.tsx becomes a consumer.

**Tech Stack:** React + TypeScript + Vite + Supabase. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-30-persistence-split-design.md`

**Baseline (verified 2026-04-30):** App.tsx is 3,391 lines. 112 tests across 11 test files pass on `main`.

---

## File structure

**Create (5 files):**
- `src/persistence/shape.ts` — pure row-builders + normalizeProject + composeProjectFromNormalized + postgrestInList + row types.
- `src/persistence/io.ts` — async loadProject, loadProjectRows, saveProject, createProject. Imports from shape.ts.
- `src/persistence/useAutosave.ts` — React hook owning saveStatus + debounce + in-flight guard. Calls io.saveProject.
- `src/persistence/__tests__/shape.test.ts` — 15-20 unit tests.

**Modify:**
- `src/App.tsx` — replace inline persistence code with imports + hook call.

---

## Implementation order

Five tasks. Each ends with `main` in a working state.

1. **`shape.ts` + tests.** New file, unused. Purest content first; foundation for everything else. Tests must pass before continuing.
2. **`io.ts`.** New file, unused. Imports from shape.ts.
3. **`useAutosave.ts`.** New file, unused. Imports from io.ts.
4. **App.tsx wiring.** Replace inline persistence with imports + hook. Remove dead code. Single behavior-changing commit.
5. **Final verify + push.**

---

## Task 1: `shape.ts` + unit tests (TDD)

**Files:**
- Create: `src/persistence/shape.ts`
- Create: `src/persistence/__tests__/shape.test.ts`

This task contains all the pure functions. Most are direct extractions from `App.tsx` lines 873–957 (`saveNormalizedProject`'s row-builder body) and lines 501–660 (`normalizeProject` + `composeProjectFromNormalized`). The extraction is mechanical: lift the code into a module, add `export`.

### Step 1.1: Inventory the row types from App.tsx

Find the existing type aliases in `src/App.tsx` (search for `type NormalizedSourceRow`, `type NormalizedCodeRow`, etc.). Each maps to one of the 10 normalized Supabase tables. Read each definition.

You should find these types (approximate names; confirm by grep):
- `NormalizedSourceRow`, `NormalizedCodeRow`, `NormalizedMemoRow`, `NormalizedSegmentRow` (= source-segments table), `NormalizedCodedReferenceRow`, `NormalizedCaseRow`, `NormalizedCaseSourceRow`, `NormalizedAttributeRow`, `NormalizedAttributeValueRow`, `NormalizedQueryRow`.
- Plus the `ProjectRow` type (the `fieldnote_projects` row shape) likely already imported from elsewhere.

These types live inline in App.tsx today. They move into `shape.ts` and get exported.

### Step 1.2: Create `src/persistence/shape.ts`

Move the following from `src/App.tsx` into this new file, as module-level exported functions:

- All `Normalized*Row` type aliases — re-exported.
- `function postgrestInList(values: string[]): string` (currently around line 672 in App.tsx).
- `function normalizeProject(project: ProjectRow): ProjectData` (currently around line 501).
- `function composeProjectFromNormalized(...)` (currently around line 537).

Plus extract the row-building bodies from `saveNormalizedProject` (lines 873–957 of App.tsx) into 11 named exports:

```ts
import type {
  Attribute, AttributeValue, Case, Code, Excerpt, Memo, Source, // from src/lib/types.ts
} from '../lib/types'
import type { ProjectData, ProjectRow, SavedQuery } from '../App' // OR move these types here
import { normalizeQueryDefinition } from '../analyze/queryDefinition'

// Row types — copied verbatim from App.tsx
export type NormalizedSourceRow = { /* ... shape ... */ }
export type NormalizedCodeRow = { /* ... */ }
export type NormalizedMemoRow = { /* ... */ }
export type NormalizedSegmentRow = { /* ... */ }
export type NormalizedCodedReferenceRow = { /* ... */ }
export type NormalizedCaseRow = { /* ... */ }
export type NormalizedCaseSourceRow = { /* ... */ }
export type NormalizedAttributeRow = { /* ... */ }
export type NormalizedAttributeValueRow = { /* ... */ }
export type NormalizedQueryRow = { /* ... */ }
export type FolderRow = { id: string; project_id: string; name: string; kind: 'source' }

// Row builders — extracted from saveNormalizedProject's body
export function buildFolderRows(projectId: string, sources: Source[]): FolderRow[] {
  const folderNames = Array.from(new Set(sources.map((s) => s.folder || 'Internals')))
  return folderNames.map((folder) => ({
    id: folder.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    project_id: projectId,
    name: folder,
    kind: 'source',
  }))
}

export function buildSourceRows(projectId: string, sources: Source[]) {
  return sources.map((source) => ({
    id: source.id,
    project_id: projectId,
    title: source.title,
    kind: source.kind,
    folder_name: source.folder || 'Internals',
    content: source.content,
    archived: Boolean(source.archived),
    imported_at: source.importedAt ?? null,
    case_name: source.caseName ?? null,
  }))
}

export function buildCodeRows(projectId: string, codes: Code[]) {
  return codes.map((code) => ({
    id: code.id,
    project_id: projectId,
    parent_code_id: code.parentCodeId ?? null,
    name: code.name,
    color: code.color,
    description: code.description,
  }))
}

export function buildMemoRows(projectId: string, memos: Memo[]) {
  return memos.map((memo) => ({
    id: memo.id,
    project_id: projectId,
    title: memo.title,
    body: memo.body,
    linked_type: memo.linkedType,
    linked_id: memo.linkedId ?? null,
  }))
}

export function buildSegmentRows(projectId: string, excerpts: Excerpt[]) {
  return excerpts.map((excerpt) => ({
    id: excerpt.id,
    project_id: projectId,
    source_id: excerpt.sourceId,
    segment_type: 'text_range' as const,
    content: excerpt.text,
  }))
}

export function buildCodedReferenceRows(projectId: string, excerpts: Excerpt[]) {
  return excerpts.flatMap((excerpt) =>
    excerpt.codeIds.map((codeId) => ({
      project_id: projectId,
      segment_id: excerpt.id,
      code_id: codeId,
      source_id: excerpt.sourceId,
      note: excerpt.note,
    })),
  )
}

export function buildCaseRows(projectId: string, cases: Case[]) {
  return cases.map((c) => ({
    id: c.id,
    project_id: projectId,
    name: c.name,
    description: c.description,
  }))
}

export function buildCaseSourceRows(projectId: string, cases: Case[]) {
  return cases.flatMap((c) =>
    c.sourceIds.map((sourceId) => ({
      project_id: projectId,
      case_id: c.id,
      source_id: sourceId,
    })),
  )
}

export function buildAttributeRows(projectId: string, attributes: Attribute[]) {
  return attributes.map((a) => ({
    id: a.id,
    project_id: projectId,
    name: a.name,
    value_type: a.valueType,
  }))
}

export function buildAttributeValueRows(projectId: string, attributeValues: AttributeValue[]) {
  return attributeValues
    .filter((v) => v.value.trim())
    .map((v) => ({
      project_id: projectId,
      case_id: v.caseId,
      attribute_id: v.attributeId,
      value: v.value,
    }))
}

export function buildQueryRows(projectId: string, savedQueries: SavedQuery[]) {
  return savedQueries.map((query) => ({
    id: query.id,
    project_id: projectId,
    name: query.name,
    query_type: query.queryType,
    definition: query.definition,
  }))
}

// Inverse transforms — copy verbatim from App.tsx
export function postgrestInList(values: string[]): string {
  // PostgREST IN-list — quote each value so commas / quotes / spaces in IDs
  // can't break the filter.
  const escaped = values.map((value) =>
    `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
  )
  return `(${escaped.join(',')})`
}

export function normalizeProject(project: ProjectRow): ProjectData {
  // Body verbatim from App.tsx around line 501.
}

export function composeProjectFromNormalized(
  project: ProjectRow,
  sourceRows: NormalizedSourceRow[],
  codeRows: NormalizedCodeRow[],
  memoRows: NormalizedMemoRow[],
  segmentRows: NormalizedSegmentRow[],
  referenceRows: NormalizedCodedReferenceRow[],
  caseRows: NormalizedCaseRow[] = [],
  caseSourceRows: NormalizedCaseSourceRow[] = [],
  attributeRows: NormalizedAttributeRow[] = [],
  attributeValueRows: NormalizedAttributeValueRow[] = [],
  queryRows: NormalizedQueryRow[] = [],
): ProjectData {
  // Body verbatim from App.tsx around line 537.
}
```

The exact bodies of `normalizeProject`, `composeProjectFromNormalized`, the row-builder column maps, and the row types come from reading App.tsx. **Copy verbatim — do not refactor or simplify.** Any "while we're here" cleanup risks regression.

`ProjectData`, `ProjectRow`, and `SavedQuery` types currently live in `App.tsx`. Two options:

- (a) Keep them in App.tsx, import them into shape.ts via `import type { ProjectData, ProjectRow, SavedQuery } from '../App'`. Cycle-safe because shape.ts only uses them as types.
- (b) Move them into `src/lib/types.ts` (already exists) and re-export from there. App.tsx imports them back.

Pick **(b)** — types belong in the types file. Move `ProjectData`, `ProjectRow`, `SavedQuery` to `src/lib/types.ts` as part of this task. Update App.tsx imports.

### Step 1.3: Create `src/persistence/__tests__/shape.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import {
  buildAttributeRows,
  buildAttributeValueRows,
  buildCaseRows,
  buildCaseSourceRows,
  buildCodeRows,
  buildCodedReferenceRows,
  buildFolderRows,
  buildMemoRows,
  buildQueryRows,
  buildSegmentRows,
  buildSourceRows,
  composeProjectFromNormalized,
  normalizeProject,
  postgrestInList,
} from '../shape'
import type {
  Attribute, AttributeValue, Case, Code, Excerpt, Memo, Source,
} from '../../lib/types'

const PROJECT_ID = 'p1'

const source = (id: string, overrides: Partial<Source> = {}): Source => ({
  id, title: id, kind: 'Transcript', folder: 'Internals', content: '', ...overrides,
})
const code = (id: string, overrides: Partial<Code> = {}): Code => ({
  id, name: id, color: '#000', description: '', ...overrides,
})
const excerpt = (id: string, sourceId: string, codeIds: string[], overrides: Partial<Excerpt> = {}): Excerpt => ({
  id, sourceId, sourceTitle: sourceId, codeIds, text: 'x', note: '', ...overrides,
})

describe('postgrestInList', () => {
  it('quotes each value and joins with commas', () => {
    expect(postgrestInList(['a', 'b'])).toBe('("a","b")')
  })
  it('escapes embedded quotes', () => {
    expect(postgrestInList(['a"b'])).toBe('("a\\"b")')
  })
  it('escapes backslashes before quotes', () => {
    expect(postgrestInList(['a\\b'])).toBe('("a\\\\b")')
  })
  it('emits empty parens for empty input', () => {
    expect(postgrestInList([])).toBe('()')
  })
})

describe('buildSourceRows', () => {
  it('maps every source to a row stamped with project_id', () => {
    const rows = buildSourceRows(PROJECT_ID, [source('s1', { title: 'S1', folder: 'External' })])
    expect(rows).toEqual([{
      id: 's1', project_id: PROJECT_ID, title: 'S1', kind: 'Transcript',
      folder_name: 'External', content: '', archived: false,
      imported_at: null, case_name: null,
    }])
  })
  it('defaults folder_name to "Internals" when missing', () => {
    const rows = buildSourceRows(PROJECT_ID, [source('s1', { folder: '' })])
    expect(rows[0].folder_name).toBe('Internals')
  })
  it('passes through archived, importedAt, caseName', () => {
    const rows = buildSourceRows(PROJECT_ID, [source('s1', {
      archived: true, importedAt: '2026-04-30', caseName: 'Renata',
    })])
    expect(rows[0].archived).toBe(true)
    expect(rows[0].imported_at).toBe('2026-04-30')
    expect(rows[0].case_name).toBe('Renata')
  })
  it('returns empty for no sources', () => {
    expect(buildSourceRows(PROJECT_ID, [])).toEqual([])
  })
})

describe('buildCodeRows', () => {
  it('maps parentCodeId to parent_code_id (null when undefined)', () => {
    const rows = buildCodeRows(PROJECT_ID, [
      code('c1'),
      code('c2', { parentCodeId: 'c1' }),
    ])
    expect(rows[0].parent_code_id).toBe(null)
    expect(rows[1].parent_code_id).toBe('c1')
  })
})

describe('buildMemoRows', () => {
  it('maps linkedType + linkedId (null when undefined)', () => {
    const memos: Memo[] = [
      { id: 'm1', title: '', body: '', linkedType: 'project' },
      { id: 'm2', title: '', body: '', linkedType: 'source', linkedId: 's1' },
    ]
    const rows = buildMemoRows(PROJECT_ID, memos)
    expect(rows[0].linked_id).toBe(null)
    expect(rows[1].linked_id).toBe('s1')
  })
})

describe('buildSegmentRows', () => {
  it('emits one segment per excerpt', () => {
    const rows = buildSegmentRows(PROJECT_ID, [
      excerpt('e1', 's1', ['c1'], { text: 'first' }),
      excerpt('e2', 's2', ['c2'], { text: 'second' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'e1', project_id: PROJECT_ID, source_id: 's1', segment_type: 'text_range', content: 'first',
    })
  })
})

describe('buildCodedReferenceRows', () => {
  it('emits one row per (excerpt, code) pair', () => {
    const rows = buildCodedReferenceRows(PROJECT_ID, [
      excerpt('e1', 's1', ['c1', 'c2'], { note: 'shared' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ segment_id: 'e1', code_id: 'c1', source_id: 's1', note: 'shared' })
    expect(rows[1]).toMatchObject({ segment_id: 'e1', code_id: 'c2', source_id: 's1', note: 'shared' })
  })
  it('skips excerpts with empty codeIds', () => {
    const rows = buildCodedReferenceRows(PROJECT_ID, [excerpt('e1', 's1', [])])
    expect(rows).toEqual([])
  })
})

describe('buildCaseRows', () => {
  it('drops sourceIds — those go to buildCaseSourceRows', () => {
    const cases: Case[] = [{ id: 'C1', name: 'Renata', description: '', sourceIds: ['s1', 's2'] }]
    const rows = buildCaseRows(PROJECT_ID, cases)
    expect(rows).toEqual([{ id: 'C1', project_id: PROJECT_ID, name: 'Renata', description: '' }])
  })
})

describe('buildCaseSourceRows', () => {
  it('emits one row per (case, sourceId) pair', () => {
    const cases: Case[] = [
      { id: 'C1', name: '', description: '', sourceIds: ['s1', 's2'] },
      { id: 'C2', name: '', description: '', sourceIds: ['s3'] },
    ]
    const rows = buildCaseSourceRows(PROJECT_ID, cases)
    expect(rows).toHaveLength(3)
  })
  it('emits no rows for cases with empty sourceIds', () => {
    const cases: Case[] = [{ id: 'C1', name: '', description: '', sourceIds: [] }]
    expect(buildCaseSourceRows(PROJECT_ID, cases)).toEqual([])
  })
})

describe('buildAttributeRows', () => {
  it('maps valueType to value_type', () => {
    const attrs: Attribute[] = [{ id: 'a', name: 'A', valueType: 'text' }]
    const rows = buildAttributeRows(PROJECT_ID, attrs)
    expect(rows[0].value_type).toBe('text')
  })
})

describe('buildAttributeValueRows', () => {
  it('skips values with whitespace-only body', () => {
    const values: AttributeValue[] = [
      { caseId: 'C1', attributeId: 'a1', value: 'real' },
      { caseId: 'C1', attributeId: 'a2', value: '  ' },
      { caseId: 'C1', attributeId: 'a3', value: '' },
    ]
    const rows = buildAttributeValueRows(PROJECT_ID, values)
    expect(rows).toHaveLength(1)
    expect(rows[0].value).toBe('real')
  })
})

describe('buildFolderRows', () => {
  it('emits one row per distinct folder, slugified id', () => {
    const sources = [
      source('s1', { folder: 'Internals' }),
      source('s2', { folder: 'External Memos' }),
      source('s3', { folder: 'Internals' }),
    ]
    const rows = buildFolderRows(PROJECT_ID, sources)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.name === 'Internals')?.id).toBe('internals')
    expect(rows.find((r) => r.name === 'External Memos')?.id).toBe('external-memos')
  })
  it('defaults missing folder to "Internals"', () => {
    const rows = buildFolderRows(PROJECT_ID, [source('s1', { folder: '' })])
    expect(rows[0].name).toBe('Internals')
  })
})

describe('normalizeProject', () => {
  it('returns a usable ProjectData with empty inputs', () => {
    const project = { id: 'p', title: 'P', codes: [], excerpts: [], memos: [], sources: [] } as unknown as Parameters<typeof normalizeProject>[0]
    const data = normalizeProject(project)
    expect(data.activeSourceId).toBeTruthy()
    expect(Array.isArray(data.sources)).toBe(true)
    expect(Array.isArray(data.codes)).toBe(true)
  })
  // Add additional cases as you read the actual function body — at minimum:
  // - a non-empty source list passes through unchanged
  // - a non-empty memos list passes through unchanged
  // - excerpts re-derive sourceId from sourceTitle when sourceId is missing
})

describe('composeProjectFromNormalized', () => {
  it('returns ProjectData built from row arrays', () => {
    const project = { id: 'p', title: 'P' } as unknown as Parameters<typeof composeProjectFromNormalized>[0]
    const sourceRows = [
      {
        id: 's1', project_id: 'p', title: 'S1', kind: 'Transcript', folder_name: 'Internals',
        content: 'hello', archived: false, imported_at: null, case_name: null,
      },
    ]
    const codeRows = [{ id: 'c1', project_id: 'p', parent_code_id: null, name: 'Trust', color: '#000', description: '' }]
    const memoRows = [{ id: 'm1', project_id: 'p', title: '', body: 'note', linked_type: 'source' as const, linked_id: 's1' }]
    const segmentRows = [{ id: 'e1', project_id: 'p', source_id: 's1', segment_type: 'text_range' as const, content: 'hello' }]
    const referenceRows = [{ project_id: 'p', segment_id: 'e1', code_id: 'c1', source_id: 's1', note: '' }]

    const data = composeProjectFromNormalized(
      project,
      sourceRows as Parameters<typeof composeProjectFromNormalized>[1],
      codeRows as Parameters<typeof composeProjectFromNormalized>[2],
      memoRows as Parameters<typeof composeProjectFromNormalized>[3],
      segmentRows as Parameters<typeof composeProjectFromNormalized>[4],
      referenceRows as Parameters<typeof composeProjectFromNormalized>[5],
    )
    expect(data.sources).toHaveLength(1)
    expect(data.sources[0].title).toBe('S1')
    expect(data.codes).toHaveLength(1)
    expect(data.excerpts).toHaveLength(1)
    expect(data.excerpts[0].codeIds).toEqual(['c1'])
  })
})

describe('buildQueryRows', () => {
  it('preserves analyzeView in definition', () => {
    const queries = [
      {
        id: 'q1', name: 'My', queryType: 'coded_excerpt' as const,
        definition: { text: '', codeId: '', caseId: '', attributes: [] },
      },
    ]
    const rows = buildQueryRows(PROJECT_ID, queries as Parameters<typeof buildQueryRows>[1])
    expect(rows[0].definition).toEqual(queries[0].definition)
  })
})
```

### Step 1.4: Run tests, expect FAIL (module not found)

Run: `npx vitest run src/persistence/__tests__/shape.test.ts`

### Step 1.5: Build shape.ts to make tests pass

Implement the file per Step 1.2. Run tests after each function:

```bash
npx vitest run src/persistence/__tests__/shape.test.ts
```

Expected at the end: ~25 tests pass.

If a test fails because the actual function behavior differs from what the test expects (e.g., trim semantics, default values), **adjust the test to match actual behavior** — the goal is to pin existing behavior, not change it. Document any surprises in test comments.

### Step 1.6: Type-check + full test run

```bash
npx tsc -p tsconfig.app.json --noEmit
npx vitest run
```

Expected: no new TS errors. Tests pass: 112 (existing) + 25 (new) = ~137 pass.

### Step 1.7: Commit

```bash
git add src/persistence/ src/lib/types.ts src/App.tsx
git commit -m "feat(persistence): pure shape.ts with row-builders + normalizers + tests"
```

The App.tsx changes in this commit are minimal: only the type-import updates if `ProjectData` / `ProjectRow` / `SavedQuery` were moved to `src/lib/types.ts`. Inline persistence functions are NOT removed yet — that's Task 4.

---

## Task 2: `io.ts`

**Files:**
- Create: `src/persistence/io.ts`

Async Supabase calls. Imports row-builders + types from `shape.ts`. Imports `supabase` from `src/lib/supabase`. App.tsx untouched in this task.

### Step 2.1: Create the file

```ts
import { supabase as defaultSupabase } from '../lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Attribute, AttributeValue, Case, Code, Excerpt, Memo, Source,
} from '../lib/types'
import type { ProjectData, ProjectRow, SavedQuery } from '../lib/types'
import {
  buildAttributeRows,
  buildAttributeValueRows,
  buildCaseRows,
  buildCaseSourceRows,
  buildCodeRows,
  buildCodedReferenceRows,
  buildFolderRows,
  buildMemoRows,
  buildQueryRows,
  buildSegmentRows,
  buildSourceRows,
  composeProjectFromNormalized,
  normalizeProject,
  postgrestInList,
  type NormalizedAttributeRow,
  type NormalizedAttributeValueRow,
  type NormalizedCaseRow,
  type NormalizedCaseSourceRow,
  type NormalizedCodeRow,
  type NormalizedCodedReferenceRow,
  type NormalizedMemoRow,
  type NormalizedQueryRow,
  type NormalizedSegmentRow,
  type NormalizedSourceRow,
} from './shape'

export type SavePayload = {
  title: string
  active_source_id: string
  source_title: string
  transcript: string
  memo: string
  sources: Source[]
  codes: Code[]
  memos: Memo[]
  excerpts: Excerpt[]
  line_numbering_mode: 'paragraph' | 'fixed-width'
  line_numbering_width: number
  projectData: ProjectData
}

export async function loadProjectRows(
  supabase: SupabaseClient = defaultSupabase,
): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('fieldnote_projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProjectRow[]
}

export async function loadProject(
  project: ProjectRow,
  supabase: SupabaseClient = defaultSupabase,
): Promise<ProjectData> {
  // Body verbatim from App.tsx's loadProjectData function (around line 803):
  // - parallel fetch of 10 normalized tables
  // - if any rows returned, call composeProjectFromNormalized(...)
  // - else fall back to normalizeProject(project)
  try {
    const [
      sourceResult, codeResult, memoResult, segmentResult, referenceResult,
      caseResult, caseSourceResult, attributeResult, attributeValueResult, queryResult,
    ] = await Promise.all([
      supabase.from('fieldnote_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_codes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_memos').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_source_segments').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_coded_references').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_cases').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_case_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_attributes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_attribute_values').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      supabase.from('fieldnote_queries').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
    ])

    const normalizedError =
      sourceResult.error ?? codeResult.error ?? memoResult.error ?? segmentResult.error ??
      referenceResult.error ?? caseResult.error ?? caseSourceResult.error ??
      attributeResult.error ?? attributeValueResult.error ?? queryResult.error
    if (normalizedError) throw normalizedError

    const sources = (sourceResult.data ?? []) as NormalizedSourceRow[]
    const codes = (codeResult.data ?? []) as NormalizedCodeRow[]
    const memos = (memoResult.data ?? []) as NormalizedMemoRow[]
    const segments = (segmentResult.data ?? []) as NormalizedSegmentRow[]
    const references = (referenceResult.data ?? []) as NormalizedCodedReferenceRow[]
    const cases = (caseResult.data ?? []) as NormalizedCaseRow[]
    const caseSources = (caseSourceResult.data ?? []) as NormalizedCaseSourceRow[]
    const attributes = (attributeResult.data ?? []) as NormalizedAttributeRow[]
    const attributeValues = (attributeValueResult.data ?? []) as NormalizedAttributeValueRow[]
    const queries = (queryResult.data ?? []) as NormalizedQueryRow[]

    if (
      sources.length || codes.length || memos.length || segments.length ||
      references.length || cases.length || attributes.length || queries.length
    ) {
      return composeProjectFromNormalized(
        project, sources, codes, memos, segments, references,
        cases, caseSources, attributes, attributeValues, queries,
      )
    }
  } catch (error) {
    console.warn('Falling back to project JSON data.', error)
  }

  return normalizeProject(project)
}

export async function saveProject(
  projectId: string,
  payload: SavePayload,
  supabase: SupabaseClient = defaultSupabase,
): Promise<void> {
  const { error: jsonError } = await supabase
    .from('fieldnote_projects')
    .update({
      active_source_id: payload.active_source_id,
      title: payload.title,
      source_title: payload.source_title,
      transcript: payload.transcript,
      memo: payload.memo,
      sources: payload.sources,
      codes: payload.codes,
      memos: payload.memos,
      excerpts: payload.excerpts,
      line_numbering_mode: payload.line_numbering_mode,
      line_numbering_width: payload.line_numbering_width,
    })
    .eq('id', projectId)
  if (jsonError) throw jsonError

  try {
    await saveNormalizedTables(projectId, payload.projectData, supabase)
  } catch (normalizedError) {
    console.warn('Project JSON saved, but normalized save failed.', normalizedError)
  }
}

async function saveNormalizedTables(
  projectId: string,
  data: ProjectData,
  supabase: SupabaseClient,
): Promise<void> {
  // Body verbatim from App.tsx's saveNormalizedProject (around line 873).
  // The row-building uses the buildXRows helpers from shape.ts.
  const folderRows = buildFolderRows(projectId, data.sources)
  const sourceRows = buildSourceRows(projectId, data.sources)
  const caseRows = buildCaseRows(projectId, data.cases)
  const caseSourceRows = buildCaseSourceRows(projectId, data.cases)
  const attributeRows = buildAttributeRows(projectId, data.attributes)
  const attributeValueRows = buildAttributeValueRows(projectId, data.attributeValues)
  const queryRows = buildQueryRows(projectId, data.savedQueries)
  const codeRows = buildCodeRows(projectId, data.codes)
  const memoRows = buildMemoRows(projectId, data.memos)
  const segmentRows = buildSegmentRows(projectId, data.excerpts)
  const referenceRows = buildCodedReferenceRows(projectId, data.excerpts)

  const upserts = [
    folderRows.length ? supabase.from('fieldnote_folders').upsert(folderRows, { onConflict: 'project_id,id' }) : undefined,
    sourceRows.length ? supabase.from('fieldnote_sources').upsert(sourceRows, { onConflict: 'project_id,id' }) : undefined,
    caseRows.length ? supabase.from('fieldnote_cases').upsert(caseRows, { onConflict: 'project_id,id' }) : undefined,
    attributeRows.length ? supabase.from('fieldnote_attributes').upsert(attributeRows, { onConflict: 'project_id,id' }) : undefined,
    queryRows.length ? supabase.from('fieldnote_queries').upsert(queryRows, { onConflict: 'project_id,id' }) : undefined,
    codeRows.length ? supabase.from('fieldnote_codes').upsert(codeRows, { onConflict: 'project_id,id' }) : undefined,
    memoRows.length ? supabase.from('fieldnote_memos').upsert(memoRows, { onConflict: 'project_id,id' }) : undefined,
    segmentRows.length ? supabase.from('fieldnote_source_segments').upsert(segmentRows, { onConflict: 'project_id,id' }) : undefined,
  ].filter(Boolean)

  const upsertResults = await Promise.all(upserts)
  const upsertError = upsertResults.find((result) => result?.error)?.error
  if (upsertError) throw upsertError

  const existingSourceIds = data.sources.map((source) => source.id)
  const existingCaseIds = data.cases.map((c) => c.id)
  const existingAttributeIds = data.attributes.map((a) => a.id)
  const existingQueryIds = data.savedQueries.map((q) => q.id)
  const existingCodeIds = data.codes.map((c) => c.id)
  const existingMemoIds = data.memos.map((m) => m.id)
  const existingSegmentIds = data.excerpts.map((e) => e.id)

  const { error: caseSourcesDeleteError } = await supabase
    .from('fieldnote_case_sources').delete().eq('project_id', projectId)
  if (caseSourcesDeleteError) throw caseSourcesDeleteError
  if (caseSourceRows.length) {
    const { error: caseSourcesInsertError } = await supabase
      .from('fieldnote_case_sources').insert(caseSourceRows)
    if (caseSourcesInsertError) throw caseSourcesInsertError
  }

  const { error: attributeValuesDeleteError } = await supabase
    .from('fieldnote_attribute_values').delete().eq('project_id', projectId)
  if (attributeValuesDeleteError) throw attributeValuesDeleteError
  if (attributeValueRows.length) {
    const { error: attributeValuesInsertError } = await supabase
      .from('fieldnote_attribute_values').insert(attributeValueRows)
    if (attributeValuesInsertError) throw attributeValuesInsertError
  }

  await Promise.all([
    existingSourceIds.length
      ? supabase.from('fieldnote_sources').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingSourceIds))
      : supabase.from('fieldnote_sources').delete().eq('project_id', projectId),
    existingCaseIds.length
      ? supabase.from('fieldnote_cases').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingCaseIds))
      : supabase.from('fieldnote_cases').delete().eq('project_id', projectId),
    existingAttributeIds.length
      ? supabase.from('fieldnote_attributes').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingAttributeIds))
      : supabase.from('fieldnote_attributes').delete().eq('project_id', projectId),
    existingQueryIds.length
      ? supabase.from('fieldnote_queries').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingQueryIds))
      : supabase.from('fieldnote_queries').delete().eq('project_id', projectId),
    existingCodeIds.length
      ? supabase.from('fieldnote_codes').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingCodeIds))
      : supabase.from('fieldnote_codes').delete().eq('project_id', projectId),
    existingMemoIds.length
      ? supabase.from('fieldnote_memos').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingMemoIds))
      : supabase.from('fieldnote_memos').delete().eq('project_id', projectId),
    existingSegmentIds.length
      ? supabase.from('fieldnote_source_segments').delete().eq('project_id', projectId).not('id', 'in', postgrestInList(existingSegmentIds))
      : supabase.from('fieldnote_source_segments').delete().eq('project_id', projectId),
  ])

  const { error: referencesDeleteError } = await supabase
    .from('fieldnote_coded_references').delete().eq('project_id', projectId)
  if (referencesDeleteError) throw referencesDeleteError
  if (referenceRows.length) {
    const { error: referencesInsertError } = await supabase
      .from('fieldnote_coded_references').insert(referenceRows)
    if (referencesInsertError) throw referencesInsertError
  }
}
```

### Step 2.2: Type-check + build

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Expected: clean. App.tsx still has its own copies of these functions; the new io.ts is unused. That's fine.

### Step 2.3: Commit

```bash
git add src/persistence/io.ts
git commit -m "feat(persistence): io.ts wraps Supabase load/save (calls shape.ts builders)"
```

---

## Task 3: `useAutosave.ts`

**Files:**
- Create: `src/persistence/useAutosave.ts`

React hook owning autosave state, debounce, and the in-flight guard. Calls io.saveProject. Imports nothing from App.

### Step 3.1: Create the file

```ts
import { useEffect, useRef, useState } from 'react'
import { saveProject, type SavePayload } from './io'

type Args = {
  enabled: boolean
  projectId: string | null
  payload: SavePayload | null
  onSaved?: (payload: SavePayload) => void
  onError?: (error: Error) => void
}

export function useAutosave({ enabled, projectId, payload, onSaved, onError }: Args): {
  saveStatus: string
} {
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  const saveInFlightRef = useRef(false)
  const savePendingRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!enabled || !projectId || !payload) return

    setSaveStatus('Saving...')
    const timeout = window.setTimeout(() => {
      const runSave = async () => {
        try {
          await saveProject(projectId, payload)
          setSaveStatus('Saved to Supabase.')
          onSaved?.(payload)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Save failed.'
          setSaveStatus(message)
          onError?.(error instanceof Error ? error : new Error(message))
        }
      }

      const runCycle = async () => {
        savePendingRef.current = runSave
        if (saveInFlightRef.current) return
        saveInFlightRef.current = true
        try {
          while (savePendingRef.current) {
            const fn = savePendingRef.current
            savePendingRef.current = null
            await fn()
          }
        } finally {
          saveInFlightRef.current = false
        }
      }

      void runCycle()
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [enabled, projectId, payload, onSaved, onError])

  return { saveStatus }
}

// Allow callers to manually nudge status (e.g., 'Loading...' / 'Sign in to sync.')
// when not actively saving. Exposed as a separate hook so callers don't need to
// thread a setter through the autosave hook.
export function useSaveStatusOverride(): {
  saveStatus: string
  setSaveStatus: (s: string) => void
} {
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  return { saveStatus, setSaveStatus }
}
```

Wait — `useSaveStatusOverride` is a separate hook that overlaps with `useAutosave`'s `saveStatus`. That's not what we want. **Drop the override hook.** Instead, App.tsx keeps its own `setSaveStatus` for non-autosave messages and the autosave hook returns its `saveStatus` independently. The two get composed at render time — App displays whichever is most recent. Or simpler: App keeps the `saveStatus` state, and the autosave hook accepts a `setSaveStatus` setter prop. Let me revise:

```ts
import { useEffect, useRef } from 'react'
import { saveProject, type SavePayload } from './io'

type Args = {
  enabled: boolean
  projectId: string | null
  payload: SavePayload | null
  setSaveStatus: (status: string) => void
  onSaved?: (payload: SavePayload) => void
}

export function useAutosave({ enabled, projectId, payload, setSaveStatus, onSaved }: Args): void {
  const saveInFlightRef = useRef(false)
  const savePendingRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!enabled || !projectId || !payload) return

    setSaveStatus('Saving...')
    const timeout = window.setTimeout(() => {
      const runSave = async () => {
        try {
          await saveProject(projectId, payload)
          setSaveStatus('Saved to Supabase.')
          onSaved?.(payload)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Save failed.'
          setSaveStatus(message)
        }
      }

      const runCycle = async () => {
        savePendingRef.current = runSave
        if (saveInFlightRef.current) return
        saveInFlightRef.current = true
        try {
          while (savePendingRef.current) {
            const fn = savePendingRef.current
            savePendingRef.current = null
            await fn()
          }
        } finally {
          saveInFlightRef.current = false
        }
      }

      void runCycle()
    }, 700)

    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSaveStatus and onSaved are caller-stable
  }, [enabled, projectId, payload])
}
```

This shape: hook accepts `setSaveStatus` (App's setter), writes 'Saving...' / 'Saved to Supabase.' / errors. App owns the `saveStatus` state and uses it for both autosave messages AND its own load-related messages ('Loading projects...', 'Sign in to sync.').

The eslint-disable on the deps array is needed because the React hooks lint rule wants `setSaveStatus` and `onSaved` in the dep array, but if App passes new function identities every render the autosave will fire continuously. The intent is: only re-run when `enabled`, `projectId`, or `payload` actually changes. App caller is responsible for stable callbacks (use `useCallback` or pass setState which is already stable).

If the project's lint rule blocks this, fall back to:
- `useRef` for the latest `setSaveStatus` and `onSaved`, updated in a separate effect, read inside the timer.

### Step 3.2: Verify lint compatibility

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
```

If the lint rule rejects the eslint-disable comment, restructure with the ref-pattern (assign latest callbacks to refs, read from refs inside the timeout).

### Step 3.3: Commit

```bash
git add src/persistence/useAutosave.ts
git commit -m "feat(persistence): useAutosave hook (debounced save + in-flight guard)"
```

---

## Task 4: Wire into App.tsx

**Files:**
- Modify: `src/App.tsx`

Single behavior-changing commit. Replaces inline persistence with imports + hook call. Removes dead code.

### Step 4.1: Remove inline persistence definitions from App.tsx

Delete from App.tsx (in this order):

- `function normalizeProject(...)` (around line 501).
- `function composeProjectFromNormalized(...)` (around line 537).
- All `Normalized*Row` type aliases (currently inline near `composeProjectFromNormalized`).
- `function postgrestInList(...)` (around line 672).
- `async function loadProjectData(project)` (around line 803) — its callers will be updated.
- `async function saveNormalizedProject(...)` (around line 873).
- The autosave `useEffect` block (around line 1179, ~70 lines, including the in-flight guard).
- `const [saveStatus, setSaveStatus] = useState('Sign in to sync.')` — KEEP this, App still owns it.
- `const saveInFlightRef = useRef(false)` and `const savePendingRef = useRef<(() => Promise<void>) | null>(null)` — REMOVE these (the hook owns its own refs).

Confirm `ProjectData`, `ProjectRow`, `SavedQuery` types have moved to `src/lib/types.ts` (Task 1). If they still live in App.tsx, move them now and update any inline references via grep.

### Step 4.2: Add imports

```ts
import { loadProject, loadProjectRows, saveProject, type SavePayload } from './persistence/io'
import { useAutosave } from './persistence/useAutosave'
```

### Step 4.3: Update the project-list-loading useEffect

Find the useEffect that loads `projectRows` (around line 1135). Replace its inline async function with a call to `loadProjectRows`:

```ts
useEffect(() => {
  if (!session?.user) {
    hasLoadedRemoteProject.current = false
    queueMicrotask(() => {
      setProjectId(null)
      setProjectRows([])
      setSaveStatus('Sign in to sync.')
    })
    return
  }

  let isCurrent = true
  hasLoadedRemoteProject.current = false
  queueMicrotask(() => {
    setProjectId(null)
    setSaveStatus('Loading projects...')
  })

  loadProjectRows()
    .then((projects) => {
      if (!isCurrent) return
      setProjectRows(projects)
      setSaveStatus('Choose or create a project.')
    })
    .catch((error: Error) => {
      if (!isCurrent) return
      setSaveStatus(errorMessage(error, 'Could not load projects.'))
    })

  return () => {
    isCurrent = false
  }
}, [session])
```

### Step 4.4: Update the project-open path

Find the place in App.tsx where `loadProjectData(project)` is called (search for `await loadProjectData(`). Replace with `await loadProject(project)`.

### Step 4.5: Add the SavePayload memo + autosave hook

Just before the location where the deleted autosave useEffect lived, add:

```ts
const persistencePayload = useMemo<SavePayload | null>(() => {
  if (!projectId) return null
  return {
    title: projectTitle,
    active_source_id: projectData.activeSourceId,
    source_title: activeSource.title,
    transcript: activeSource.content,
    memo: projectMemo.body,
    sources: projectData.sources,
    codes: projectData.codes,
    memos: projectData.memos,
    excerpts: projectData.excerpts,
    line_numbering_mode: lineNumberingMode,
    line_numbering_width: lineNumberingWidth,
    projectData,
  }
}, [
  projectId, projectTitle, activeSource.title, activeSource.content,
  projectMemo.body, projectData, lineNumberingMode, lineNumberingWidth,
])

useAutosave({
  enabled: !!session?.user && !!projectId && hasLoadedRemoteProject.current,
  projectId,
  payload: persistencePayload,
  setSaveStatus,
  onSaved: (payload) => {
    setProjectRows((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              title: payload.title,
              active_source_id: payload.active_source_id,
              source_title: payload.source_title,
              transcript: payload.transcript,
              memo: payload.memo,
              sources: payload.sources,
              codes: payload.codes,
              memos: payload.memos,
              excerpts: payload.excerpts,
              line_numbering_mode: payload.line_numbering_mode,
              line_numbering_width: payload.line_numbering_width,
            }
          : project,
      ),
    )
  },
})
```

### Step 4.6: Verify

```bash
npm run lint
npm run build
npx vitest run
```

Expected: lint clean, build clean, tests pass (~137 tests).

After the deletes, re-run grep to confirm removed identifiers don't linger:

```bash
grep -nE "\bnormalizeProject\b|\bsaveNormalizedProject\b|\bcomposeProjectFromNormalized\b|\bpostgrestInList\b|\bloadProjectData\b" src/App.tsx
```

Expected: zero matches (all moved to persistence/).

### Step 4.7: Manual smoke

```bash
npm run dev
```

Sign in → projects list loads. Open a project → data hydrates. Edit text rapidly → DevTools Network shows one in-flight `PATCH /fieldnote_projects` at a time. Sync indicator: 'Saving...' → 'Saved to Supabase.' Sign out → projects list clears. Sign back in → list reloads. Create a new project → appears in list. Open it → empty state hydrates.

Compare to `main` in a side-by-side tab if any persistence behavior looks subtly different.

### Step 4.8: Commit

```bash
git add src/App.tsx
git commit -m "refactor(app): wire persistence into App.tsx via shape/io/useAutosave

App.tsx loses ~300 lines of inline persistence code: normalizeProject,
composeProjectFromNormalized, postgrestInList, loadProjectData, the
saveNormalizedProject body, and the autosave useEffect block (with the
in-flight guard). Functionality is identical — same Supabase tables
hit in the same order, same in-flight guard semantics, same save
status messages.

Persistence now lives in src/persistence/{shape,io,useAutosave}.ts,
with shape.ts unit-tested. App.tsx becomes a consumer."
```

---

## Task 5: Final verify + push

- [ ] **Step 5.1: App.tsx line count check**

```bash
wc -l src/App.tsx
```

Expected: ~3,050 lines (was 3,391; net reduction of ~340).

- [ ] **Step 5.2: Final lint, build, tests**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. ~137 tests pass (112 baseline + 25 from shape.test.ts).

- [ ] **Step 5.3: Push**

```bash
git push origin main
```

- [ ] **Step 5.4: Smoke on prod**

Once Vercel rebuilds, sign in to https://fieldnote-seven.vercel.app. Repeat the per-task manual smoke from Step 4.7 against prod.

---

## Self-Review

- **Spec coverage:**
  - `shape.ts` with row-builders + normalizeProject + composeProjectFromNormalized + postgrestInList → Task 1.
  - 15-20 tests for shape.ts → Task 1 (~25 tests in the test block above).
  - `io.ts` with loadProject, loadProjectRows, saveProject → Task 2.
  - `useAutosave.ts` hook with in-flight guard → Task 3.
  - App.tsx wiring + dead-code removal → Task 4.
  - Manual smoke for autosave → Task 4 step 4.7.
  - Side-by-side branch comparison option → Task 4 step 4.7.
  - In-flight guard pattern preserved verbatim → Task 3 (lifted from existing App.tsx).

- **Placeholder scan:** acceptable. The plan deliberately defers some sub-decisions to "read App.tsx and confirm" because the row-builder column shapes are large and copying them verbatim into the plan would balloon it. The locations to read are pinpointed in each task; the function bodies for `normalizeProject` / `composeProjectFromNormalized` / `saveNormalizedTables` are explicitly "copy verbatim from line X of App.tsx" — the implementer has a single source of truth.

- **Type consistency:** `SavePayload` defined in `io.ts` (Task 2), consumed by `useAutosave.ts` (Task 3) and App.tsx (Task 4). `ProjectData`, `ProjectRow`, `SavedQuery` move to `src/lib/types.ts` (Task 1). Row types like `NormalizedSourceRow` exported from `shape.ts` (Task 1) and re-imported by `io.ts` (Task 2). All names match between definition and consumption.

- **Atomic commits:** Each task ends with `main` in a working state. Tasks 1–3 each ship dormant code (new files, App.tsx still has its own copies). Task 4 is the single behavior-changing commit. If Task 4 hits trouble, revert is trivial — Tasks 1–3 stay; the dormant new files cause no harm.

- **One imprecision worth flagging:** the eslint-disable on the autosave `useEffect` deps array (Task 3 step 3.1) might fail the project's lint config. The fallback (refs for stable callbacks) is described inline. If the implementer hits this, expect a 5-line refactor inside `useAutosave.ts` rather than a blocked task.
