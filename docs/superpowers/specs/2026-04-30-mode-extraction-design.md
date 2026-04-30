# Phase 3 — Per-Mode Component Extraction Design

Status: approved 2026-04-30. Ready for implementation plan.

## Context

`src/App.tsx` is ~3500 lines. Five of six modes (Organize / Code / Refine / Classify / Report) render inline; only Analyze has been extracted into `src/analyze/`. The destructive operations have been pulled out into `src/lib/`, the report data into `src/report/`, but the mode-specific JSX, handlers, and ephemeral UI state still live in App. This makes merge / delete / coding logic risky to touch — too much for one head at a time.

This phase carves each remaining mode into a co-located folder with up-to-three named exports — `Detail` / `Sidebar` / `Inspector` — and migrates ephemeral UI state from App into the mode that owns it. Persisted and shared state stays in App.

## Goal

Reduce `src/App.tsx` to a shell + shared-data + autosave file by extracting per-mode components into `src/modes/{name}/`. Each mode owns its own UI state and contributes content to the shell's three slots through named exports the shell renders conditionally.

## Non-goals

- Refactoring Analyze further. `src/analyze/` already exists; deeper cleanup is a separate follow-up.
- Eliminating prop-drilling via React Context. Picked against in brainstorm — context is heavy machinery for this app's size and the explicit prop interface is part of the documentation value.
- Touching autosave, Supabase persistence, or routing logic.
- Renaming any existing handler / type names. Each extraction is mechanical so diffs review cleanly.
- Adding new features under cover of the refactor.
- Touching component tests. Pure-function tests in `src/lib/__tests__/` are unaffected.

## Architecture

### Folder shape

Each mode lives at `src/modes/{name}/` with up to three named exports, one per shell slot:

```
src/modes/
  organize/
    OrganizeDetail.tsx      — center pane (source register table)
    OrganizeSidebar.tsx     — folder filter pane + import-sources button + new-folder field
    OrganizeInspector.tsx   — source properties panel
  code/
    CodeDetail.tsx          — active-codes bar + reader column + transcript + quick-code menu
    CodeInspector.tsx       — Active Codes picker + Memo
  refine/
    RefineDetail.tsx        — code edit form + reference list + merge UI
    RefineInspector.tsx     — Codebook tree + Memo
  classify/
    ClassifyDetail.tsx      — case sheet (cases table + attribute grid)
    ClassifyInspector.tsx   — case properties panel
  report/
    ReportDetail.tsx        — wraps existing <ReportPreview />
    ReportSidebar.tsx       — Raw-data CSV export rows
```

Modes that don't contribute to a slot simply don't export that component (Code/Refine/Classify don't have a custom Sidebar — they use the existing `<ListView>` which stays in App for now; Report doesn't have a custom Inspector). The shell handles missing exports by rendering a fallback or nothing.

### Shell composition in App.tsx

After extraction, App.tsx renders each slot with a switch by `activeView`:

```tsx
<aside className="workspace-sidebar">
  {activeView === 'organize' && <OrganizeSidebar {...sidebarProps} />}
  {activeView === 'report'   && <ReportSidebar   {...sidebarProps} />}
  {/* For Code/Refine/Classify/Analyze: the existing <ListView/> render block stays */}
</aside>

<section className="detail-view">
  {/* detail-toolbar JSX stays in App.tsx — it's shell, not mode */}
  {activeView === 'organize' && <OrganizeDetail {...organizeProps} />}
  {activeView === 'code'     && <CodeDetail     {...codeProps} />}
  {activeView === 'refine'   && <RefineDetail   {...refineProps} />}
  {activeView === 'classify' && <ClassifyDetail {...classifyProps} />}
  {activeView === 'analyze'  && /* existing analyze JSX, untouched this phase */}
  {activeView === 'report'   && <ReportDetail   {...reportProps} />}
</section>

<aside className="properties-view">
  {activeView === 'organize' && <OrganizeInspector {...inspectorProps} />}
  {activeView === 'code'     && <CodeInspector     {...inspectorProps} />}
  {activeView === 'refine'   && <RefineInspector   {...inspectorProps} />}
  {activeView === 'classify' && <ClassifyInspector {...inspectorProps} />}
  {activeView === 'analyze'  && /* existing analyze inspector JSX */}
  {/* Report: no inspector */}
</aside>
```

The detail-toolbar (eyebrow + title + search + Code-selection button + Report export buttons) stays in App.tsx as part of the shell — it switches on `activeView` for its conditional pieces.

### State migration

**Stays in App** — shared data, persisted state, shell concerns:

| State | Reason |
|---|---|
| `session`, `projectId`, `projectTitle`, `projectRows` | Auth + project routing |
| `activeView`, `activeSourceId`, `activeCodeId`, `activeMemoId` | Cross-mode selection state |
| `sidebarCollapsed`, `settingsOpen`, `lineNumberingMode`, `lineNumberingWidth` | Shell + persisted prefs |
| `saveStatus`, `saveInFlightRef`, `savePendingRef`, `hasLoadedRemoteProject` | Autosave plumbing |
| `sources`, `codes`, `excerpts`, `cases`, `attributes`, `attributeValues`, `memos`, `savedQueries` | Shared data |
| `analyzeView`, `queryText`, `queryCodeId`, `queryCaseId`, `queryAttributes`, `analyzePanel`, `matrixColumnMode`, `matrixAttributeId`, `activeSavedQueryId`, `queryName` | Analyze + persisted via saved queries |
| `searchTerm` | Used in detail-toolbar (shell) |

**Migrates to mode components** — ephemeral UI state:

| State | Owner | Reason |
|---|---|---|
| `newFolderName` | `OrganizeSidebar` | Pure ephemeral input value, only Sidebar uses it |
| `sourceFolderFilter` | **App** | Drives `visibleSources` which `OrganizeDetail` consumes — splitting ownership across mode folders requires either Sidebar lifting up to App via setter (which means App still has to re-derive `visibleSources` whenever the filter changes, partially defeating the extraction) or moving `visibleSources` computation inside Sidebar (which forces Detail to also live in Sidebar's tree). Cleanest answer is to leave the filter in App and pass `sourceFolderFilter` + `setSourceFolderFilter` down to Sidebar as props (same pattern as `selectedCodeIds` below). |
| `quickCodingEnabled`, `quickCodeMenu`, `quickNewCodeName`, `selectionHint` | `CodeDetail` | All consumed solely within Detail |
| `selectedCodeIds` | **App** | Consumed by both `CodeDetail` and `CodeInspector` — keeping it in App lets both receive it as props without one mode-folder file owning state another mode-folder file reads |
| `mergeTargetCodeId` | `RefineDetail` | Refine-only ephemeral picker state |

### Data flow

Each mode component receives the data + setters + handlers it needs as a typed `Props` interface. Long prop lists are acceptable — they make the dependency surface explicit and self-documenting. No context.

Destructive op wrappers (`deleteActiveCode`, `mergeActiveCodeIntoTarget`, `splitExcerpt`, `deleteExcerpt`, `removeCodeFromExcerpt`, `deleteCase`, `deleteActiveSource`) stay in App.tsx as functions and are passed as props. They already delegate the data transform to `src/lib/`; only the React-side glue (window.confirm, follow-up state updates) lives in App.

Pure-function helpers like `descendantCodeIds`, `excerptMatchesAttributeFilters`, `wrapHighlightedTranscript`, `markBackground` either stay where they are or get co-located with their consumer:

- `wrapHighlightedTranscript` and `markBackground` are Code-mode only — move into `src/modes/code/transcript.ts` (small file, unit-testable). **`wrapHighlightedTranscript` MUST get unit tests on relocation.** It does word-aware fixed-width line breaking — the exact kind of function where an off-by-one or a whitespace-handling regression would only surface on specific transcript content and survive a manual smoke test. Cover at minimum: paragraph mode (no wrapping), fixed-width below width (no wrapping), fixed-width above width (single break point), word-aware break across a long word, multi-paragraph with mixed coded segments preserving codes across breaks.
- `descendantCodeIds` is shared (App + Refine + multiple ops). Stays in `src/lib/codeOperations.ts` where it already lives.
- `excerptMatchesAttributeFilters` lives in `src/analyze/excerptFilters.ts` — already extracted, leave it.

### Files to create

- `src/modes/organize/OrganizeDetail.tsx`
- `src/modes/organize/OrganizeSidebar.tsx`
- `src/modes/organize/OrganizeInspector.tsx`
- `src/modes/code/CodeDetail.tsx`
- `src/modes/code/CodeInspector.tsx`
- `src/modes/code/transcript.ts` — relocated `wrapHighlightedTranscript` + `markBackground`
- `src/modes/refine/RefineDetail.tsx`
- `src/modes/refine/RefineInspector.tsx`
- `src/modes/classify/ClassifyDetail.tsx`
- `src/modes/classify/ClassifyInspector.tsx`
- `src/modes/report/ReportDetail.tsx`
- `src/modes/report/ReportSidebar.tsx`

### Files to modify

- `src/App.tsx` — remove inline mode JSX, drop migrated state, add mode-component imports + render calls.
- `src/App.css` — no changes expected (CSS is class-based and global, the new components reuse existing classes).

## Order of extraction

Smallest → largest, so the pattern is established on low-risk modes first. Each extraction is its own commit, runs lint/build/tests, behavior-equivalent to the prior commit:

1. **Report** — mostly mechanical (ReportPreview already exists; just collect into ReportDetail + ReportSidebar). Establishes the `src/modes/{name}/` folder convention.
2. **Refine** — meaningful detail block (code edit form + merge UI). Exercises `mergeTargetCodeId` migration. Inspector takes the existing Codebook tree + memo block.
3. **Classify** — case sheet table. Inspector takes the case properties panel.
4. **Organize** — `sourceFolderFilter` stays in App per the migration table; only `newFolderName` migrates into Sidebar. App computes `visibleSources` (already does) and passes it to Detail as a prop, while passing `sourceFolderFilter` + `setSourceFolderFilter` down to Sidebar.
5. **Code** — largest, last. Transcript reader, marker rendering, active-codes-bar, quick-code menu. By this point the pattern is settled.

After Phase 3, App.tsx is estimated at ~1500–1800 lines (currently ~3500), with the bulk being shared state + autosave plumbing + shell JSX.

## Verification per extraction

**Baseline (verified 2026-04-30):** 103 tests across 10 test files pass on `main`. Each extraction commit must hold this baseline OR add tests (see below) and add to it.

Each commit must:

1. `npm run lint` — clean.
2. `npm run build` — clean.
3. `npx vitest run` — at least 103 tests pass; new tests for relocated `wrapHighlightedTranscript` increase the count when Code mode lands.
4. Manual smoke test in dev for the extracted mode: perform the mode's core actions (Organize: import a source, switch folder; Code: select text → code it, merge codes; Refine: edit a code, merge two, split an excerpt; Classify: edit a case, change an attribute; Report: open the preview, click Export PDF + Word). Behavior identical to current `main`.

**Code mode is the highest-regression-risk extraction.** Manual smoke alone is unreliable for the transcript-marker rendering, the selection-to-quick-code flow, and highlight composition. Mitigations:

- Unit tests for `wrapHighlightedTranscript` on relocation (mandated above).
- Side-by-side dev check: open `main` and the feature branch in two browser tabs, compare a sample transcript with multi-coded segments — same word breaks, same highlight composition, same line numbers. Catches off-by-one regressions a single-tab smoke test would miss.

The pure-function tests in `src/lib/__tests__/`, `src/analyze/__tests__/`, and `src/report/__tests__/` continue to apply unchanged.

## Out-of-scope follow-ups

- Refactor of Analyze mode internals (already partially extracted).
- **Splitting App.tsx's autosave / persistence logic into its own module — this is likely Phase 4.** With ~1500–1800 lines remaining in App.tsx after this refactor, the bulk is shared state declarations, the autosave `useEffect` (with the in-flight guard from Phase 1), the project-load `useEffect`, and the shell JSX. The autosave block in particular is dense — the guard pattern, the sequential save plumbing, and the dependency array are all tightly coupled. Expect this to feel like the next obvious cleanup once Phase 3 ships. Don't pre-design it now (the right shape will be more obvious once shared state is the only thing in App), but plan to brainstorm it as Phase 4 immediately after.
- Eliminating cross-mode prop bundles via context once the pattern proves out.
- Per-mode test suites (component-level tests). The pure-function safety net already covers data correctness.
