# Phase 3 — Per-Mode Component Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the five remaining inline modes from `src/App.tsx` into co-located `src/modes/{name}/` folders with named slot exports (`Detail`, `Sidebar`, `Inspector`). Migrate ephemeral mode-specific UI state out of App.

**Architecture:** Each mode extraction is its own atomic commit. Order is smallest → largest so the pattern is established on low-risk modes first. State migration follows the table in the spec — persisted/shared state stays in App, ephemeral UI state moves with each mode.

**Tech Stack:** React + TypeScript + Vite. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-30-mode-extraction-design.md`

**Baseline (verified):** App.tsx is 3,980 lines. 103 tests across 10 test files pass on `main`. After all five extractions, App.tsx should land in the 1,500–1,800 line range.

---

## Conventions used by every task

Each mode's component receives a typed `Props` interface specific to its needs. Long prop lists are expected — they make the dependency surface explicit.

Each component file:
- Imports React (only when JSX uses hooks or types from React).
- Imports the icons and lucide types it needs.
- Imports types from `src/lib/types.ts` rather than from `App.tsx`.
- Does not import from `App.tsx`.
- Has no default export — uses named export matching the file name (e.g., `export function ReportDetail(...) {}` in `ReportDetail.tsx`).
- Reuses existing CSS classes (no new CSS files; classes are global, defined in `App.css`).

When this plan says "copy the JSX from `App.tsx` at the block beginning with `{X && (`", it means: copy the contents of the block (everything between the opening `(` and the matching closing `)}`), paste into the new component's `return (...)`, then refactor any references to local App state into prop reads and any inline `setState` calls into prop setters.

---

## Task 1: Extract Report mode

**Files:**
- Create: `src/modes/report/ReportDetail.tsx`
- Create: `src/modes/report/ReportSidebar.tsx`
- Modify: `src/App.tsx`

This task establishes the `src/modes/{name}/` folder convention. Report is smallest because `ReportPreview` is already extracted and the sidebar only contains the Raw-data CSV buttons.

- [ ] **Step 1: Create `src/modes/report/ReportDetail.tsx`**

```tsx
import type { ReportModel } from '../../report/buildReport'
import { ReportPreview } from '../../report/ReportPreview'

type Props = { model: ReportModel }

export function ReportDetail({ model }: Props) {
  return <ReportPreview model={model} />
}
```

- [ ] **Step 2: Create `src/modes/report/ReportSidebar.tsx`**

Look at `src/App.tsx` for the JSX block that begins with `{activeView === 'report' && (` inside the `<section className="list-view" ...>` element (it renders the `<div className="raw-data-panel">` with 6 CSV export buttons). Copy that markup into a new component:

```tsx
import type { MouseEvent } from 'react'
import { Database, Download, FileText, MessageSquareText, Rows3, Search } from 'lucide-react'

type Props = {
  exportCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCodebookCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseSheetCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportCaseExcerptCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportAnalyzeCsv: (event: MouseEvent<HTMLButtonElement>) => void
  exportMemosCsv: (event: MouseEvent<HTMLButtonElement>) => void
}

export function ReportSidebar({
  exportCsv,
  exportCodebookCsv,
  exportCaseSheetCsv,
  exportCaseExcerptCsv,
  exportAnalyzeCsv,
  exportMemosCsv,
}: Props) {
  return (
    <div className="raw-data-panel">
      <p className="fn-label raw-data-heading">Raw data</p>
      <button type="button" className="raw-data-row" onClick={(event) => exportCsv(event)}>
        <Download size={14} aria-hidden="true" />
        <span>Coded excerpts CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCodebookCsv(event)}>
        <FileText size={14} aria-hidden="true" />
        <span>Codebook CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCaseSheetCsv(event)}>
        <Database size={14} aria-hidden="true" />
        <span>Case sheet CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportCaseExcerptCsv(event)}>
        <Rows3 size={14} aria-hidden="true" />
        <span>Coded excerpts by case CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportAnalyzeCsv(event)}>
        <Search size={14} aria-hidden="true" />
        <span>Current query CSV</span>
      </button>
      <button type="button" className="raw-data-row" onClick={(event) => exportMemosCsv(event)}>
        <MessageSquareText size={14} aria-hidden="true" />
        <span>Memos CSV</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Wire into `src/App.tsx`**

Add imports near the other mode-component imports (next to where `ReportPreview` is currently imported):

```ts
import { ReportDetail } from './modes/report/ReportDetail'
import { ReportSidebar } from './modes/report/ReportSidebar'
```

Remove the existing `import { ReportPreview }` import — it's now consumed inside `ReportDetail`.

Replace the existing `{activeView === 'report' && (<ReportPreview model={reportModel} />)}` block in the detail-view section with:

```tsx
{activeView === 'report' && <ReportDetail model={reportModel} />}
```

Replace the inline `<div className="raw-data-panel">...` block (inside the `<section className="list-view">` element, guarded by `{activeView === 'report' && (`) with:

```tsx
{activeView === 'report' && (
  <ReportSidebar
    exportCsv={exportCsv}
    exportCodebookCsv={exportCodebookCsv}
    exportCaseSheetCsv={exportCaseSheetCsv}
    exportCaseExcerptCsv={exportCaseExcerptCsv}
    exportAnalyzeCsv={exportAnalyzeCsv}
    exportMemosCsv={exportMemosCsv}
  />
)}
```

- [ ] **Step 4: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: clean. 103 tests pass.

- [ ] **Step 5: Manual smoke**

```bash
npm run dev
```

Sign in, switch to Report mode. Verify: preview renders unchanged, all 6 CSV-export buttons in the sidebar still trigger their downloads, both `Export PDF` and `Export Word` topbar buttons still work. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/modes/report/ src/App.tsx
git commit -m "refactor(modes): extract Report into src/modes/report/"
```

---

## Task 2: Extract Refine mode

**Files:**
- Create: `src/modes/refine/RefineDetail.tsx`
- Create: `src/modes/refine/RefineInspector.tsx`
- Modify: `src/App.tsx`

Refine has a meaningful detail block (code edit form + merge UI + reference list) and exercises mode-specific state migration (`mergeTargetCodeId`).

- [ ] **Step 1: Identify Refine's content in `src/App.tsx`**

Detail-view JSX: the block starting with `{activeView === 'refine' && (` inside the `<section className="detail-view">`. Contains the code edit form (name, color, parent picker, description, merge UI) and the reference list.

Inspector JSX: the block starting with `{activeView === 'refine' && (` inside the `<aside className="properties-view">`. Contains the Codebook tree (`section className="panel" id="codes"`) + Memo panel for Refine.

Note: the existing `panel#codes` block is shared between Code and Refine modes (`{(activeView === 'code' || activeView === 'refine') && (...)}`). For this task, leave it shared in App.tsx; only extract the Refine-only inspector content. The Codebook tree shared with Code will be split later in Task 5. **For now** — keep the shared `panel#codes` block in App.tsx and have `RefineInspector` render only the Refine-only memo block + any Refine-specific extras. If Refine's inspector is purely the shared codes-panel + the shared memo-panel, then `RefineInspector` may be unnecessary. Verify: read App.tsx and decide. If there is no Refine-only inspector content, **skip creating `RefineInspector.tsx`** and document in the commit message.

- [ ] **Step 2: Create `src/modes/refine/RefineDetail.tsx`**

Read the JSX block from App.tsx (`{activeView === 'refine' && (...)}` in the detail-view section). Lift it into a new component. Migrate `mergeTargetCodeId` state into the component.

Required props (typed interface — read App.tsx to confirm exact references):

```tsx
import { useState } from 'react'
import type { Code, Excerpt } from '../../lib/types'
// + lucide icons used in the JSX

type Props = {
  activeCode: Code
  codes: Code[]
  sortedCodes: Array<Code & { depth: number }>
  excerpts: Excerpt[]
  visibleExcerpts: Excerpt[]
  parentCodeOptions: Code[]
  // setters / handlers passed from App
  updateCode: (codeId: string, patch: Partial<Code>) => void
  updateCodeParent: (codeId: string, parentCodeId: string) => void
  setActiveCodeId: (id: string) => void
  deleteActiveCode: () => void
  mergeActiveCodeIntoTarget: (targetCodeId: string) => void
  splitExcerpt: (excerptId: string) => void
  deleteExcerpt: (id: string) => void
  removeCodeFromExcerpt: (excerptId: string, codeId: string) => void
  updateExcerptNote: (id: string, note: string) => void
}

export function RefineDetail(props: Props) {
  const [mergeTargetCodeId, setMergeTargetCodeId] = useState('')

  // ... return the existing JSX, adapted:
  //   - any `{mergeTargetCodeId}` reference uses local state
  //   - `setMergeTargetCodeId(...)` calls use local setter
  //   - `mergeActiveCodeIntoTarget()` becomes
  //     `() => props.mergeActiveCodeIntoTarget(mergeTargetCodeId)` (passing the
  //     captured local target)
}
```

The signature change for `mergeActiveCodeIntoTarget` is critical: in App.tsx today it reads `mergeTargetCodeId` from App state implicitly. After extraction, App.tsx's wrapper must accept the target as an argument. **Update App.tsx's `mergeActiveCodeIntoTarget` signature first** to take `targetCodeId: string` as an argument, then use it instead of the App-local `mergeTargetCodeId` state.

Then drop `mergeTargetCodeId` and `setMergeTargetCodeId` from App.tsx entirely (along with the `useState` declaration).

- [ ] **Step 3: Create `src/modes/refine/RefineInspector.tsx` only if needed**

Per Step 1's note: if Refine's inspector content is purely the shared codes-panel + shared memo-panel (already conditionally rendered in App.tsx via `(activeView === 'code' || activeView === 'refine')` guards), **do not create RefineInspector.tsx**. Document the decision in the commit message.

If there IS Refine-only inspector content, create the file with a typed Props interface mirroring the detail pattern.

- [ ] **Step 4: Wire into `src/App.tsx`**

Add imports:

```ts
import { RefineDetail } from './modes/refine/RefineDetail'
// import RefineInspector if created
```

Remove the inline Refine detail JSX. Replace with:

```tsx
{activeView === 'refine' && (
  <RefineDetail
    activeCode={activeCode}
    codes={codes}
    sortedCodes={sortedCodes}
    excerpts={excerpts}
    visibleExcerpts={visibleExcerpts}
    parentCodeOptions={parentCodeOptions}
    updateCode={updateCode}
    updateCodeParent={updateCodeParent}
    setActiveCodeId={setActiveCodeId}
    deleteActiveCode={deleteActiveCode}
    mergeActiveCodeIntoTarget={mergeActiveCodeIntoTarget}
    splitExcerpt={splitExcerpt}
    deleteExcerpt={deleteExcerpt}
    removeCodeFromExcerpt={removeCodeFromExcerpt}
    updateExcerptNote={updateExcerptNote}
  />
)}
```

Drop the `useState` declaration for `mergeTargetCodeId` from App.tsx.

Update the `mergeActiveCodeIntoTarget` function signature in App.tsx to take `targetCodeId: string` as an argument and read it (instead of `mergeTargetCodeId` from App state).

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: clean. 103 tests pass.

- [ ] **Step 6: Manual smoke**

```bash
npm run dev
```

In Refine mode: edit a code's name / color / parent / description; create a new code; merge two codes (verify the merge target dropdown still works); delete a code (with children — verify re-parenting); split an excerpt; remove a code from an excerpt; delete an excerpt.

- [ ] **Step 7: Commit**

```bash
git add src/modes/refine/ src/App.tsx
git commit -m "refactor(modes): extract Refine into src/modes/refine/, migrate mergeTargetCodeId"
```

---

## Task 3: Extract Classify mode

**Files:**
- Create: `src/modes/classify/ClassifyDetail.tsx`
- Create: `src/modes/classify/ClassifyInspector.tsx` (only if there's Classify-only inspector content)
- Modify: `src/App.tsx`

No mode-specific state migration. Pure JSX extraction.

- [ ] **Step 1: Identify Classify's content in `src/App.tsx`**

Detail JSX: `{activeView === 'classify' && (...)}` inside the detail-view section. Contains the case sheet (cases table + attribute grid + per-case attribute editing).

Inspector JSX: any `{activeView === 'classify' && (...)}` inside the properties-view section. Likely contains a case-properties panel.

Read App.tsx to confirm exact extents.

- [ ] **Step 2: Create `src/modes/classify/ClassifyDetail.tsx`**

Lift the JSX into a typed component. Required props:

```tsx
import type { Attribute, AttributeValue, Case, Source } from '../../lib/types'
// + lucide icons used

type Props = {
  cases: Case[]
  sources: Source[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  newAttributeName: string
  setNewAttributeName: (value: string) => void
  addAttribute: () => void
  updateAttributeValue: (caseId: string, attributeId: string, value: string) => void
  updateCase: (caseId: string, patch: Partial<Case>) => void
  assignSourceToCase: (sourceId: string, caseId: string) => void
  promoteSourceToCase: (sourceId: string) => void
  deleteCase: (caseId: string) => void
}

export function ClassifyDetail(props: Props) {
  // return the existing JSX adapted to read props instead of App locals
}
```

Read App.tsx to confirm the exact handler names and refine the prop interface accordingly.

- [ ] **Step 3: Create `src/modes/classify/ClassifyInspector.tsx`**

If the inspector content for Classify is non-trivial, lift into a separate file with its own Props. If trivial (one panel) or shared, decide whether to create the file or leave it inline. Default to creating one for consistency unless it's literally a 5-line panel.

- [ ] **Step 4: Wire into `src/App.tsx`**

Add imports. Replace inline Classify detail JSX with `<ClassifyDetail ... />` and inspector JSX with `<ClassifyInspector ... />` (if created).

- [ ] **Step 5: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: clean. 103 tests pass.

- [ ] **Step 6: Manual smoke**

```bash
npm run dev
```

In Classify mode: create a new case from a source; edit a case name/notes; add an attribute; update an attribute value; delete a case; verify all existing tests of the case sheet still work.

- [ ] **Step 7: Commit**

```bash
git add src/modes/classify/ src/App.tsx
git commit -m "refactor(modes): extract Classify into src/modes/classify/"
```

---

## Task 4: Extract Organize mode

**Files:**
- Create: `src/modes/organize/OrganizeDetail.tsx`
- Create: `src/modes/organize/OrganizeSidebar.tsx`
- Create: `src/modes/organize/OrganizeInspector.tsx`
- Modify: `src/App.tsx`

Migrate `newFolderName` into Sidebar. `sourceFolderFilter` stays in App per the spec (Detail consumes `visibleSources` which App already computes).

- [ ] **Step 1: Identify Organize's content in `src/App.tsx`**

Three blocks:
- Detail: `{activeView === 'organize' && (` inside detail-view (source register table).
- Sidebar: `{activeView === 'organize' && (` inside the workspace-sidebar (folder pane).
- Inspector: `{activeView === 'organize' && (` inside properties-view (source properties panel).

- [ ] **Step 2: Create `src/modes/organize/OrganizeDetail.tsx`**

Lift the source register JSX. Props:

```tsx
import type { ChangeEvent } from 'react'
import type { Excerpt, Memo, Source } from '../../lib/types'
// + lucide icons

type Props = {
  visibleSources: Source[]
  activeSource: Source
  excerpts: Excerpt[]
  memos: Memo[]
  sourceFolderFilter: string
  importTranscript: (event: ChangeEvent<HTMLInputElement>) => void
  selectActiveSource: (id: string) => void
}

export function OrganizeDetail(props: Props) {
  // return existing source-register JSX adapted to props
}
```

- [ ] **Step 3: Create `src/modes/organize/OrganizeSidebar.tsx`**

Lift the folder-pane JSX. Migrate `newFolderName` state in here:

```tsx
import { useState } from 'react'
import type { ChangeEvent } from 'react'
// + lucide icons

type Props = {
  sourceFolderFilter: string
  sourceFolders: string[]
  activeSources: Source[]
  archivedSources: Source[]
  selectSourceFolder: (folder: string) => void
  importTranscript: (event: ChangeEvent<HTMLInputElement>) => void
  moveActiveSourceToNewFolder: (folderName: string) => void
}

export function OrganizeSidebar(props: Props) {
  const [newFolderName, setNewFolderName] = useState('')

  // The existing `moveActiveSourceToNewFolder()` in App reads `newFolderName`
  // from App state. Update its signature in App.tsx to accept the folder name
  // as an argument (mirroring the mergeActiveCodeIntoTarget pattern in Task 2).
  // Sidebar then calls props.moveActiveSourceToNewFolder(newFolderName) and
  // resets local state.

  // return folder-pane JSX
}
```

In `App.tsx` change `moveActiveSourceToNewFolder` to take `folderName: string` as an argument; remove the `newFolderName` `useState` from App.

- [ ] **Step 4: Create `src/modes/organize/OrganizeInspector.tsx`**

Lift the source properties panel JSX (title / type / folder / case / properties list). Props mirror the field surface — read App.tsx to enumerate.

- [ ] **Step 5: Wire into `src/App.tsx`**

Add imports. Replace each of the three inline Organize blocks with the corresponding component invocation.

Drop `newFolderName` / `setNewFolderName` from App. `sourceFolderFilter` and `setSourceFolderFilter` stay in App and pass to Sidebar.

- [ ] **Step 6: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: clean. 103 tests pass.

- [ ] **Step 7: Manual smoke**

```bash
npm run dev
```

Organize mode: import a source (file picker); see it appear in the register; switch folder filter; create a new folder via the sidebar input; assign a source to a case via the inspector; archive then restore a source; delete a source.

- [ ] **Step 8: Commit**

```bash
git add src/modes/organize/ src/App.tsx
git commit -m "refactor(modes): extract Organize into src/modes/organize/, migrate newFolderName"
```

---

## Task 5: Extract Code mode (largest)

**Files:**
- Create: `src/modes/code/transcript.ts` — relocated `wrapHighlightedTranscript` + `markBackground`
- Create: `src/modes/code/__tests__/transcript.test.ts`
- Create: `src/modes/code/CodeDetail.tsx`
- Create: `src/modes/code/CodeInspector.tsx` (if Code-only inspector content exists)
- Modify: `src/App.tsx`

Highest regression risk per spec. Transcript helpers MUST get unit tests on relocation. Migrate `quickCodingEnabled`, `quickCodeMenu`, `quickNewCodeName`, `selectionHint` into `CodeDetail`. `selectedCodeIds` stays in App.

### Step 5.1: Relocate transcript helpers and add unit tests

- [ ] **5.1.1: Create `src/modes/code/transcript.ts`**

Copy the existing `wrapHighlightedTranscript` and `markBackground` functions from `src/App.tsx` (search for `function wrapHighlightedTranscript` and `function markBackground`). Move them verbatim into the new file with `export` added. The functions are pure — no React, no DOM access.

```ts
// src/modes/code/transcript.ts
import type { CSSProperties } from 'react'

// types kept narrow — these match the existing local type aliases used inside
// wrapHighlightedTranscript today
export type TranscriptPiece = { text: string; codes?: { id: string; color: string; name: string }[] }

export type LineNumberingMode = 'paragraph' | 'fixed-width'

export function wrapHighlightedTranscript(
  pieces: TranscriptPiece[],
  mode: LineNumberingMode,
  width: number,
): TranscriptPiece[][] {
  // BODY COPIED VERBATIM from App.tsx's existing function.
}

export function markBackground(codes: { color: string }[]): CSSProperties {
  // BODY COPIED VERBATIM from App.tsx's existing function.
}
```

The exact function bodies live in `src/App.tsx` today — copy them as-is. Adjust the `TranscriptPiece` type only if needed to match the shape the function expects (read the function body to see what it dereferences).

- [ ] **5.1.2: Create `src/modes/code/__tests__/transcript.test.ts`**

Five test cases mandated by the spec:

```ts
import { describe, expect, it } from 'vitest'
import { wrapHighlightedTranscript, markBackground } from '../transcript'

const piece = (text: string, codes?: { id: string; color: string; name: string }[]) => ({ text, codes })

describe('wrapHighlightedTranscript', () => {
  it('paragraph mode emits one line per piece, no wrapping', () => {
    const result = wrapHighlightedTranscript(
      [piece('a short line of text')],
      'paragraph',
      10, // width should be ignored in paragraph mode
    )
    // Paragraph mode does not wrap — exactly one line, containing the whole piece.
    expect(result).toHaveLength(1)
    expect(result[0].map((p) => p.text).join('')).toBe('a short line of text')
  })

  it('fixed-width below cap returns a single line', () => {
    const text = 'short line'
    const result = wrapHighlightedTranscript([piece(text)], 'fixed-width', 80)
    expect(result).toHaveLength(1)
  })

  it('fixed-width above cap wraps at a word boundary', () => {
    // Width 10 — text is exactly 22 chars with a space at position 5.
    // Expected: wraps at the space, producing two lines.
    const text = 'first second third forth'
    const result = wrapHighlightedTranscript([piece(text)], 'fixed-width', 10)
    expect(result.length).toBeGreaterThanOrEqual(2)
    // Joining should reconstruct the original (modulo internal newline boundary).
    const reconstructed = result
      .map((line) => line.map((p) => p.text).join(''))
      .join(' ')
    expect(reconstructed).toContain('first')
    expect(reconstructed).toContain('forth')
  })

  it('breaks across long unbreakable words by hard wrapping', () => {
    // No spaces — the function must still produce output (not infinite-loop or drop content).
    const text = 'unbreakablecontiguouswordmuchlongerthancap'
    const result = wrapHighlightedTranscript([piece(text)], 'fixed-width', 10)
    const reconstructed = result.map((line) => line.map((p) => p.text).join('')).join('')
    expect(reconstructed).toBe(text)
  })

  it('preserves code attributions across line breaks', () => {
    const codes = [{ id: 'c1', color: '#000', name: 'C1' }]
    const result = wrapHighlightedTranscript(
      [piece('first second third forth fifth', codes)],
      'fixed-width',
      10,
    )
    // Every text-bearing piece in the output should still carry the codes.
    for (const line of result) {
      for (const p of line) {
        if (p.text.length > 0) {
          expect(p.codes).toEqual(codes)
        }
      }
    }
  })
})

describe('markBackground', () => {
  it('returns a single-color background for one code', () => {
    const result = markBackground([{ color: '#ff0000' }])
    expect(typeof result.background).toBe('string')
    expect(result.background).toContain('#ff0000')
  })

  it('returns a linear-gradient with N stops for N codes', () => {
    const result = markBackground([{ color: '#ff0000' }, { color: '#00ff00' }])
    expect(typeof result.background).toBe('string')
    expect(result.background).toContain('linear-gradient')
    expect(result.background).toContain('#ff0000')
    expect(result.background).toContain('#00ff00')
  })

  it('returns empty object for no codes', () => {
    const result = markBackground([])
    expect(result).toEqual({})
  })
})
```

If a specific test contradicts the actual function behavior (e.g., word-aware vs hard-wrap edge case differs from these expectations), adjust the test to match the actual current behavior — the goal is to **pin** what's there, not change it. Document the actual behavior in test comments where it surprises.

- [ ] **5.1.3: Run tests**

```bash
npx vitest run src/modes/code/__tests__/transcript.test.ts
```

Expected: tests pass against the relocated functions.

- [ ] **5.1.4: Replace App.tsx call sites**

In `src/App.tsx`:
- Remove the inline `function wrapHighlightedTranscript(...)` and `function markBackground(...)` definitions.
- Remove the inline `type TranscriptPiece` declaration if it's now only used via the new `transcript.ts`.
- Add import: `import { wrapHighlightedTranscript, markBackground } from './modes/code/transcript'`.
- All call sites continue to compile unchanged.

- [ ] **5.1.5: Verify + commit (intermediate)**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: 103 + 8 = 111 tests pass (3 markBackground tests + 5 wrapHighlightedTranscript tests).

```bash
git add src/modes/code/transcript.ts src/modes/code/__tests__/transcript.test.ts src/App.tsx
git commit -m "test(code): relocate transcript helpers + unit tests"
```

### Step 5.2: Extract `CodeDetail`

- [ ] **5.2.1: Identify Code's detail JSX in App.tsx**

The block `{activeView === 'code' && (...)}` inside the detail-view section. Contains: active-codes-bar, reader-column wrapper + reader-meta-strip, transcript with multi-code-mark rendering, the QuickCodeMenu floating panel.

- [ ] **5.2.2: Create `src/modes/code/CodeDetail.tsx`**

Lift the detail JSX. Migrate ephemeral state (`quickCodingEnabled`, `quickCodeMenu`, `quickNewCodeName`, `selectionHint`) into the component. Use `useRef<HTMLDivElement>(null)` for `transcriptRef`.

```tsx
import { useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import type { Code, Excerpt, Source } from '../../lib/types'
// + lucide icons used in the JSX

type QuickCodeMenu = { text: string; x: number; y: number }

type Props = {
  // shared data
  activeSource: Source
  codes: Code[]
  sortedCodes: Array<Code & { depth: number }>
  selectedCodeIds: string[]
  highlightedTranscriptLines: Array<Array<{ text: string; codes?: Code[] }>>
  // shared selection
  setSelectedCodeIds: React.Dispatch<React.SetStateAction<string[]>>
  toggleSelectedCode: (codeId: string) => void
  // shared handlers
  codeSelection: () => void
  addCode: () => void
  // any other handlers referenced — read App.tsx and extend
}

export function CodeDetail(props: Props) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [quickCodingEnabled, setQuickCodingEnabled] = useState(true)
  const [quickCodeMenu, setQuickCodeMenu] = useState<QuickCodeMenu | null>(null)
  const [quickNewCodeName, setQuickNewCodeName] = useState('')
  const [selectionHint, setSelectionHint] = useState(
    'Select text in the source, then click Code selection.',
  )

  // The captureQuickCodeSelection function depends on transcriptRef + quickCodingEnabled.
  // Lift it inside CodeDetail.

  // return the existing JSX, adapted: reads use local state where applicable;
  // setSelectionHint stays local; setSelectedCodeIds remains a prop (App owns).
}
```

The exact prop list depends on every value the existing JSX dereferences — read App.tsx and enumerate. Common ones: `setSearchTerm`, `searchTerm` (probably stays in App since it's used by the topbar which isn't extracted), per-piece `multi-code-mark` rendering uses `markBackground` (already imported from `transcript.ts`).

- [ ] **5.2.3: Update App.tsx**

- Drop `quickCodingEnabled`, `setQuickCodingEnabled`, `quickCodeMenu`, `setQuickCodeMenu`, `quickNewCodeName`, `setQuickNewCodeName`, `selectionHint`, `setSelectionHint` `useState` declarations.
- Drop the existing inline Code mode detail JSX.
- Drop the `transcriptRef` ref (it moves into CodeDetail).
- Add import: `import { CodeDetail } from './modes/code/CodeDetail'`.
- Render `<CodeDetail ... />` in place of the removed JSX.

Note: any handlers in App.tsx that read `selectionHint` (e.g., the merge / split / delete confirmation paths that set `selectionHint` to user-facing messages) need refactoring. Two options:
- (a) `selectionHint` becomes a `string | null` returned from the handler so CodeDetail can update its local state. Cleaner.
- (b) Pass `setSelectionHint` from CodeDetail to App via a callback prop. App stores nothing.

Pick (a) for any handler that's only invoked from Code mode. For handlers shared with other modes, the hint setter wasn't theirs to use anyway (search App.tsx for `setSelectionHint(`; if it appears outside Code-related flows, decide case-by-case).

- [ ] **5.2.4: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: 111 tests pass.

### Step 5.3: Extract `CodeInspector`

- [ ] **5.3.1: Identify Code's inspector content**

The shared `panel#codes` block (`(activeView === 'code' || activeView === 'refine') && (...)`) renders an Active Codes / Codebook picker. Splitting this is now appropriate — Code reads `selectedCodeIds`, Refine reads `activeCodeId`.

Two JSX blocks in App.tsx's properties-view section that this task can target:
- The shared `panel#codes` block (split into Code-side + Refine-side).
- The shared `panel#memo` block (`(activeView === 'organize' || activeView === 'code' || activeView === 'refine') && (...)`).

Pragmatic call: don't split the memo panel in this phase; leave it conditionally rendered in App since it's used by 3 modes. Only extract the Code-mode-only inspector pieces into `CodeInspector.tsx`. The codes-panel needs to stay shared OR get duplicated into RefineInspector and CodeInspector. **Choose: keep the codes-panel inline in App.tsx for now**, conditionally rendered for Code and Refine. The full clean-up can be a follow-up — this task is about extracting the Code mode itself, not finishing every shared-panel split.

If after reading App.tsx the conclusion is "Code mode has no Code-only inspector content," skip creating `CodeInspector.tsx` and document the choice in the commit message.

- [ ] **5.3.2: Create `src/modes/code/CodeInspector.tsx` only if there is Code-only content**

If created, follow the typed-Props pattern.

- [ ] **5.3.3: Wire into App.tsx**

If `CodeInspector` was created, add the import and render it in the properties-view next to the existing inspector blocks.

- [ ] **5.3.4: Verify**

```bash
npm run lint && npm run build && npx vitest run
```

Expected: 111 tests pass.

### Step 5.4: Manual smoke + side-by-side regression check

- [ ] **5.4.1: Open `main` and the working branch in two browser tabs (per spec mitigation)**

```bash
git stash         # if any uncommitted work
npm run dev       # this branch
# In a separate terminal:
# git checkout main && npm run dev -- --port 5174
```

Open the same project in both tabs.

In Code mode, on both:
- Same source loaded.
- Same multi-coded segments highlight the same way (same gradient bands, same word breaks).
- Same line numbers at the same positions.
- Selecting text and triggering the quick-code menu produces the same panel position.
- Coding a selection produces the same `selectionHint` text.
- Toggling Quick menu off then on works the same way.

If anything differs visually or behaviorally, debug before continuing.

- [ ] **5.4.2: Smoke test on this branch alone**

Confirm: code a selection; toggle Quick menu off and on; create a new code via the Active Codes picker; select multiple codes; switch sources via the sidebar; merge codes (in Refine); split an excerpt; delete a code with active references.

- [ ] **5.4.3: Commit**

```bash
git add src/modes/code/ src/App.tsx
git commit -m "refactor(modes): extract Code into src/modes/code/, migrate ephemeral state"
```

---

## Task 6: Final verify, push, summary

- [ ] **Step 1: Confirm App.tsx line count**

```bash
wc -l src/App.tsx
```

Target: 1,500–1,800 lines. Actual will vary; if it's much higher, audit for remaining inline mode JSX.

- [ ] **Step 2: Final lint, build, tests**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. 111 tests pass.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Smoke on prod**

Once Vercel rebuilds, sign in to https://fieldnote-seven.vercel.app and run through each mode's core actions. Same thing as the per-task manual smokes, but on prod against real Supabase data.

---

## Self-Review

- **Spec coverage:**
  - Folder shape `src/modes/{name}/{Detail,Sidebar,Inspector}.tsx` → all five tasks.
  - State migration table → Task 2 (`mergeTargetCodeId`), Task 4 (`newFolderName`), Task 5 (Code ephemeral state).
  - `sourceFolderFilter` stays in App → Task 4 step 5 (explicit).
  - `selectedCodeIds` stays in App → Task 5 step 5.2.3 (explicit).
  - `wrapHighlightedTranscript` unit tests on relocation → Task 5 step 5.1.2 (5 tests + 3 for markBackground).
  - Smallest → largest order: Report → Refine → Classify → Organize → Code → Tasks 1, 2, 3, 4, 5.
  - Side-by-side branch comparison for Code mode → Task 5 step 5.4.1.
  - Atomic commits per mode → each task ends with one commit (Task 5 ends with two, splitting the transcript helpers from the component for safer review).
  - Test baseline 103 → 111 after Task 5.1 → confirmed in plan.

- **Placeholder scan:** acceptable. The plan deliberately defers some sub-decisions to "read App.tsx and confirm" because the JSX bodies are large and copying them verbatim into the plan would balloon it past usability. The locations to read are precisely identified in each task; the prop interfaces are typed so the implementer can see the shape they need to produce. If a subagent reports BLOCKED on any step due to ambiguity, the controller resolves it (provides the exact JSX or a more specific prop list) and re-dispatches.

- **Type consistency:** `Code`, `Excerpt`, `Memo`, `Source`, `Case`, `Attribute`, `AttributeValue` all imported from `src/lib/types.ts` consistently. `ReportModel` from `src/report/buildReport`. `TranscriptPiece` and `LineNumberingMode` exported from `src/modes/code/transcript.ts` (Task 5.1).

- **Atomic commits:** Each task ends with a working `main` (lint + build + tests + manual smoke). Task 5 has an intermediate commit at step 5.1.5 to ship the transcript helpers + tests separately from the component extraction — this gives a checkpoint to roll back to if 5.2/5.3 hits trouble.

- **One known imprecision** the implementer must resolve when reading App.tsx for each mode: the exact list of handlers and prop types each component needs. The plan lists likely candidates, but the canonical source is the existing JSX. The convention is: "every value the existing JSX dereferences becomes a prop." Subagents should follow that rule and the typed `Props` interface will catch missing entries at compile time.
