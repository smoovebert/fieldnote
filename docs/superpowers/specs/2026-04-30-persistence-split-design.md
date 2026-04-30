# Phase 4 — Persistence Module Split Design

Status: approved 2026-04-30. Ready for implementation plan.

## Context

`src/App.tsx` is 3,391 lines after Phase 3. The largest remaining concern is persistence: 3 `useEffect` blocks, 4 async functions, 5 pieces of state/refs, and ~300 lines of Supabase row shaping inside `saveNormalizedProject`. The dense autosave block (with the in-flight guard from Phase 1) is the kind of code that's risky to touch because no part of it is independently testable. A silent bug in `saveNormalizedProject` corrupts research data — the same risk profile that drove the Phase 2 destructive-op extraction.

This phase moves persistence into `src/persistence/` with a clean three-file shape: pure `shape.ts`, async `io.ts`, React hook `useAutosave.ts`. Pure functions get unit tests. App.tsx becomes a consumer.

## Goal

Extract all persistence logic — normalization, row building, Supabase I/O, autosave debounce + in-flight guard — into `src/persistence/`. Add unit tests for the pure row-shaping functions (the layer where data corruption hides). App.tsx loses ~300 lines and the autosave subsystem stops being one of its responsibilities.

## Non-goals (this phase)

- Integration tests with a mocked Supabase client. Test scope is the pure shape layer only — `io.ts` and `useAutosave.ts` are exercised by manual smoke + the existing 112 unit tests on App-level logic. Mocking the supabase-js client to test `io.ts` is meaningful work and is a separate phase.
- Improving `saveNormalizedProject`'s delete-then-insert behavior on `fieldnote_case_sources` and `fieldnote_attribute_values`. Existing semantics preserved. Schema-level work is out of scope.
- Schema migrations, multi-tenant isolation, optimistic concurrency, server-driven conflict resolution. Single-user assumption holds.
- Re-routing the `setSelectionHint` calls in non-autosave handlers (addCode, splitExcerpt, importTranscript, etc.) — those write to a different state slot (`selectionHint`, not `saveStatus`) and are unaffected.
- Splitting App.tsx further (e.g., extracting auth flow, project home, top-nav) — those are future phases if/when they feel painful.

## Architecture

### File structure

```
src/persistence/
  shape.ts              — pure row-builders + normalizeProject (~250 lines)
  io.ts                 — async Supabase calls (~200 lines)
  useAutosave.ts        — React hook (~80 lines)
  __tests__/
    shape.test.ts       — 15-20 tests covering all row-builders + normalizeProject
```

No new `src/persistence/types.ts` — the row types (e.g., `SourceRow`, `CodeRow`) currently live inline in `App.tsx` near `normalizeProject`/`saveNormalizedProject`. Move them into `shape.ts` and export. Domain types stay in `src/lib/types.ts` (already exists from Phase 2).

### `shape.ts` — pure data layer (no React, no Supabase, no async)

Exports:

**Row-builder functions** — each one is pure: input is `ProjectData` slice + `projectId`, output is the array of rows ready for upsert into the corresponding Supabase table.

```ts
export function buildSourceRows(projectId: string, sources: Source[]): SourceRow[]
export function buildCodeRows(projectId: string, codes: Code[]): CodeRow[]
export function buildMemoRows(projectId: string, memos: Memo[]): MemoRow[]
export function buildSegmentRows(projectId: string, sources: Source[], excerpts: Excerpt[]): SegmentRow[]
export function buildCodedReferenceRows(projectId: string, excerpts: Excerpt[]): CodedReferenceRow[]
export function buildCaseRows(projectId: string, cases: Case[]): CaseRow[]
export function buildCaseSourceRows(projectId: string, cases: Case[]): CaseSourceRow[]
export function buildAttributeRows(projectId: string, attributes: Attribute[]): AttributeRow[]
export function buildAttributeValueRows(projectId: string, attributeValues: AttributeValue[]): AttributeValueRow[]
export function buildQueryRows(projectId: string, savedQueries: SavedQuery[]): QueryRow[]
export function buildFolderRows(projectId: string, sources: Source[]): FolderRow[]
```

**`normalizeProject`** — the inverse direction:

```ts
export function normalizeProject(
  project: ProjectRow,
  normalizedTables?: NormalizedTablesPayload,
): ProjectData
```

`NormalizedTablesPayload` is the optional bundle of pre-loaded tables (from `loadProject`'s parallel queries) — when provided, takes precedence over the JSON fields on `project`. When absent, the function falls back to the JSON fields (legacy projects). This dual-source behavior is preserved unchanged from current `App.tsx`.

**`postgrestInList`** — the helper from Phase 1 lives here. Already-pure, just relocated.

**Row types** — define `SourceRow`, `CodeRow`, etc. in this file with their exact column shapes. Read from current `saveNormalizedProject` to enumerate. These types are used by both `shape.ts` (when building) and `io.ts` (when calling `.upsert(rows)`).

### `io.ts` — async Supabase calls

Imports row-builders + types from `shape.ts`. Imports `supabase` from `src/lib/supabase.ts`. No React.

```ts
export async function loadProject(supabase: SupabaseClient, projectId: string): Promise<ProjectData>
export async function loadProjectRows(supabase: SupabaseClient, userId: string): Promise<ProjectRow[]>
export async function saveProject(supabase: SupabaseClient, projectId: string, payload: SavePayload): Promise<void>
export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  initialData: ProjectData,
): Promise<ProjectRow>
```

`SavePayload` carries everything `saveProject` needs:

```ts
type SavePayload = {
  // JSON fields written to fieldnote_projects directly
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
  // Plus the full ProjectData for the normalized-tables save
  projectData: ProjectData
}
```

Internal structure of `saveProject`:

1. Update `fieldnote_projects` row with JSON fields (existing behavior).
2. Call private `saveNormalizedTables(supabase, projectId, projectData)` — also defined in `io.ts`, contains the Promise.all of upserts + sequential deletes + final coded_references insert. This is the body of the current `saveNormalizedProject`, lifted from App.tsx with no logic change.

### `useAutosave.ts` — React hook

```ts
type Args = {
  enabled: boolean
  projectId: string | null
  payload: SavePayload | null
  onSaved?: (payload: SavePayload) => void
  onError?: (error: Error) => void
}

export function useAutosave({ enabled, projectId, payload, onSaved, onError }: Args): {
  saveStatus: string
}
```

Internally:

- Owns `saveStatus: string` state.
- Owns `saveInFlightRef: useRef(false)` and `savePendingRef: useRef<(() => Promise<void>) | null>(null)`.
- One `useEffect` keyed on `[enabled, projectId, payload]` (and `onSaved`, `onError` — but those are stable per render typically; if callers don't memoize them, the autosave will re-fire too often, so the hook documents the requirement).
- The effect schedules a 700ms debounce, then runs the in-flight guard cycle (the existing pattern from Phase 1, lifted as-is). Inside the cycle, `await io.saveProject(supabase, projectId, payload)`.
- On success: `setSaveStatus('Saved to Supabase.')` and call `onSaved(payload)`.
- On error: `setSaveStatus(error.message)` and call `onError(error)`.

The hook is the only React-side persistence file. App.tsx hands the hook everything it needs; the hook does no other state plumbing beyond `saveStatus`.

### App.tsx wiring

After extraction, App.tsx persistence-related code is roughly:

```ts
// state
const [session, setSession] = useState<Session | null>(null)
const [projectId, setProjectId] = useState('')
const [projectRows, setProjectRows] = useState<ProjectRow[]>([])
const hasLoadedRemoteProject = useRef(false)

// session listener — kept inline (small, cohesive)
useEffect(() => {
  /* supabase.auth.onAuthStateChange + getSession */
}, [])

// project hydration — calls io.loadProject directly
async function openProject(id: string) {
  setSaveStatus('Opening project...')  // or just delegate to io / status state
  const data = await loadProject(supabase, id)
  applyProjectData(data)
  setProjectId(id)
  hasLoadedRemoteProject.current = true
}

// project list — calls io.loadProjectRows directly
async function refreshProjectRows() {
  if (!session?.user) return
  setProjectRows(await loadProjectRows(supabase, session.user.id))
}

// project create — calls io.createProject
async function createProject() {
  // ...
  const newRow = await createProject(supabase, session.user.id, title, defaultProject)
  setProjectRows((current) => [newRow, ...current])
  await openProject(newRow.id)
}

// build payload from current state
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
}, [/* full deps */])

// the hook
const { saveStatus } = useAutosave({
  enabled: !!session && !!projectId && hasLoadedRemoteProject.current,
  projectId,
  payload: persistencePayload,
  onSaved: (payload) => {
    setProjectRows((current) =>
      current.map((p) =>
        p.id === projectId
          ? {
              ...p,
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
          : p,
      ),
    )
  },
})
```

Note: `setSaveStatus` is no longer in App. The hook owns the status. App still consumes `saveStatus` (through the hook's return) for the top-header sync indicator — same UX, internal plumbing changes.

(Some other places in App.tsx call `setSaveStatus` directly during project open / list load — those switch to local state in App or a small additional return from the hook. The cleanest path: keep an App-level `setSaveStatus` that's just for non-autosave status messages, and the hook's `saveStatus` is composed/displayed alongside. **Decision: have the hook emit `saveStatus`, and App keeps its own `loadStatus` if needed.** In practice the existing UX uses one status string for both — the implementer can keep a single App-level state and have the hook write to it via callback if simpler. Resolve at implementation time.)

## Test scope

`src/persistence/__tests__/shape.test.ts` covers ~15-20 tests:

**Row-builder shape correctness:**
- `buildSourceRows` — title, kind, folder, archived, importedAt all map correctly; empty input → empty array; project_id stamped on each row.
- `buildCodeRows` — name, color, description, parent_code_id; empty input.
- `buildMemoRows` — body, linked_type, linked_id; project memos vs source memos vs code memos.
- `buildSegmentRows` — derives segments from source content + excerpts; excerpt outside source content is skipped; empty inputs.
- `buildCodedReferenceRows` — one row per (excerpt, code) pair; excerpts without codes skipped; empty input.
- `buildCaseRows` — name, description; empty input.
- `buildCaseSourceRows` — one row per (case, source) link; case with no sourceIds → no rows.
- `buildAttributeRows` — name, value_type; empty input.
- `buildAttributeValueRows` — case_id, attribute_id, value; values with empty trimmed body are skipped (matches current saveNormalizedProject behavior).
- `buildQueryRows` — name, definition; analyzeView round-trips through serialize.
- `buildFolderRows` — folders are derived from distinct source.folder values; archived/deleted folders are dropped per current behavior.

**`normalizeProject`:**
- Reads from JSON fields when normalizedTables is absent (legacy path).
- Reads from normalizedTables when provided (new path).
- Round-trip: `normalizeProject(rowFor(buildAll(data)), buildAll(data)) ≈ data` (where `rowFor` constructs a synthetic ProjectRow). Verifies the inverse identity for the data we control.
- Empty ProjectRow with no normalized tables → empty ProjectData.

Test pattern follows `src/lib/__tests__/codeOperations.test.ts` and `src/analyze/__tests__/crosstabs.test.ts`: inline fixtures, vitest globals, no mocking.

## Manual verification

After the refactor:

1. Sign in to a project. Type rapidly into a memo field. DevTools Network panel should show one in-flight `PATCH /fieldnote_projects` at a time (the in-flight guard from Phase 1 is preserved).
2. Open a project from the project list. Verify all data loads (sources, codes, excerpts, cases, attributes, memos).
3. Sign out, sign back in. Project list reloads correctly.
4. Create a new project. Initial save fires; project appears in the list immediately.
5. Type a few rapid edits, watch the sync indicator transition: Saving... → Saved to Supabase.
6. Smoke test compared to `main`: same Supabase tables hit, same order, same rows. No requests added or removed.

## Implementation order

Smallest-risk, highest-value first:

1. **`shape.ts` + tests.** Pure functions, fully tested. No App.tsx changes yet — file exists but is unused.
2. **`io.ts`.** Imports from `shape.ts`. App.tsx still has its own copies of the functions; `io.ts` is also unused at this point. (This deliberate redundancy lets us validate the tests then swap call sites in step 3.)
3. **`useAutosave.ts`.** Hook implementation; not yet wired into App.
4. **App.tsx wiring.** Replace inline `normalizeProject` / `saveNormalizedProject` / `loadProjectRows` / autosave useEffect with imports + hook call. Remove now-dead inline definitions.
5. **Manual smoke + push.**

After step 4, App.tsx loses the inline persistence code (since `io.ts` and `useAutosave.ts` now own it). Steps 1-3 can each ship independently without touching App. Step 4 is the single behavior-changing commit.

## Risk

The autosave is the most-used path in the app (fires on every keystroke). A regression here corrupts data silently. Mitigations:

- Pure parts (`shape.ts`) are tested.
- The in-flight guard pattern is lifted verbatim — same code, different location.
- Step 4 is a single atomic commit; revert is trivial.
- Manual smoke tests cover the typical autosave window (rapid edits, sync indicator transitions).

The unmitigated risk: `io.saveProject`'s sequential awaits + delete-then-insert dance is hand-translated from the current `saveNormalizedProject`. A subtle reordering or a missing `await` would break in production. Mitigation: take the body of the current function as a single unit, paste into `io.ts`, change only the surrounding signature/imports. No reordering, no "while we're here" cleanup.

## Out-of-scope follow-ups

- Mocked-Supabase integration tests for `io.ts` (Q2 picked (ii) not (iii)).
- Replacing the delete-then-insert pattern on `fieldnote_case_sources` and `fieldnote_attribute_values` with proper upsert + deletes-by-not-in. The Phase 1 quoted `postgrestInList` makes this safer but the change-shape work is separate.
- Optimistic local writes with rollback on save failure.
- Real-time sync via Supabase Realtime (the autosave is one-way; the project doesn't react to remote changes).
- Auth flow extraction. Session listener + sign-in/out forms still live in App.
