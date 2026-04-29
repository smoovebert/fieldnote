# Fieldnote M5.1 — Analyze Visualizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rich chart visualizations (bars/clouds, heatmaps/networks, heatmaps/grouped-bars) to the three existing Analyze surfaces (word frequency, code co-occurrence, matrix coding) with per-analysis 3-way toggle, persisted view state on saved queries, PNG export, and Top-N controls.

**Architecture:** All new code lives under `src/analyze/`. Three view components (one per analysis) compose a shared toggle, top-N control, export button, and chart primitives. View state lives in `App.tsx` session memory and round-trips through `fieldnote_queries.definition.analyzeView` JSON — no schema migration. Pure helpers (`analyzeViewState.ts`, `exportImage.ts`) are unit-tested with Vitest; visual components are verified via a manual checklist on dev and production.

**Tech Stack:** React 19, TypeScript, Vite. New deps: Recharts, react-wordcloud, react-force-graph-2d, html-to-image, Vitest. Library choices are provisional until the spike in Task 0 passes.

**Spec:** `docs/superpowers/specs/2026-04-29-fieldnote-m5-1-visualizations-design.md`

---

## File Map

**New files:**

```
vitest.config.ts                                    # Vitest config extending vite.config.ts
src/analyze/analyzeViewState.ts                     # Pure persistence helpers
src/analyze/exportImage.ts                          # PNG export helper
src/analyze/ChartViewToggle.tsx                     # 3-way segmented control
src/analyze/TopNControl.tsx                         # Stepper control
src/analyze/ExportImageButton.tsx                   # Export button with async state
src/analyze/charts/BarChart.tsx                     # Recharts bar wrapper
src/analyze/charts/Heatmap.tsx                      # Recharts cell-grid heatmap (shared)
src/analyze/charts/GroupedBars.tsx                  # Recharts grouped bars
src/analyze/charts/WordCloud.tsx                    # react-wordcloud wrapper
src/analyze/charts/NetworkGraph.tsx                 # react-force-graph-2d wrapper
src/analyze/WordFreqView.tsx                        # Composes Bar / Cloud / Table
src/analyze/CooccurrenceView.tsx                    # Composes Heatmap / Network / Table
src/analyze/MatrixView.tsx                          # Composes Heatmap / GroupedBars / Table
src/analyze/__tests__/analyzeViewState.test.ts      # Vitest unit tests
src/analyze/__tests__/exportImage.test.ts           # Vitest unit tests
```

**Modified files:**

```
package.json                                        # Add deps + test script
src/App.tsx                                         # Extend QueryDefinition, integrate views
data-model-plan.md                                  # Document analyzeView JSON shape
handoff.md                                          # Mark M5.1 shipped
```

---

## Task Order Rationale

1. **Spike + setup first** (Task 0). Library risk is real for React 19 — discover swap needs before any other code is written.
2. **Pure helpers next** (Tasks 1–2). TDD-friendly, no UI dependencies, unblocks every component that follows.
3. **Leaf components before composites** (Tasks 3–10). Toggle, TopN, Export, individual chart primitives — each renders with mocked data, no view orchestration.
4. **View composites** (Tasks 11–13). Wire the three primitives + toggle per analysis.
5. **App integration** (Task 14). Extend `QueryDefinition`, replace existing rendering, wire persistence.
6. **Verification gates** (Tasks 15–17). Lint/build/test, manual checklist, doc updates.
7. **Production smoke** (Task 18). Final.

---

## Task 0: Library Spike, Dependencies, and Vitest Setup

**Goal:** Verify the chosen libraries install cleanly against React 19, add Vitest, swap libraries if any fail. Land everything in one preparatory commit.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Confirm clean working tree**

```bash
git status -s
```
Expected: empty output (no uncommitted changes). If output is non-empty, stash or commit before proceeding.

- [ ] **Step 2: Install candidate libraries**

```bash
npm install recharts react-wordcloud react-force-graph-2d html-to-image
```
Expected: install succeeds. **If you see `ERESOLVE` or peer-dep errors involving React 19**, do NOT pass `--legacy-peer-deps`. Instead, document the failure and apply the swap recipe in Step 3.

- [ ] **Step 3: Library swap recipe (only if Step 2 failed)**

If `react-wordcloud` failed:
```bash
npm uninstall react-wordcloud
npm install @visx/wordcloud @visx/scale
```
Note the swap in the eventual handoff update. The `WordCloud.tsx` wrapper in Task 7 must be rewritten to use `@visx/wordcloud` instead. Their APIs differ — `@visx` requires a parent that supplies width/height; `react-wordcloud` is auto-sized.

If `react-force-graph-2d` failed:
```bash
npm uninstall react-force-graph-2d
npm install vis-network vis-data
```
The `NetworkGraph.tsx` wrapper in Task 9 must be rewritten — `vis-network` uses an imperative DOM API rather than declarative props. Build a `useEffect`-mounted instance.

If `html-to-image` failed (unlikely — pure DOM tool):
```bash
npm uninstall html-to-image
npm install dom-to-image-more
```
Update `exportImage.ts` import accordingly.

- [ ] **Step 4: Spike-render each library**

Create `src/analyze/__spike__.tsx` (temporary, deleted at end of step) with one-line smoke renders for each library. Add a temporary route in App.tsx behind `?spike=1` to mount it. Verify each renders without runtime errors in the browser (`npm run dev`).

```tsx
// src/analyze/__spike__.tsx
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import ReactWordcloud from 'react-wordcloud'
import ForceGraph2D from 'react-force-graph-2d'

export function Spike() {
  const data = [{ name: 'a', value: 4 }, { name: 'b', value: 9 }]
  const words = [{ text: 'hello', value: 12 }, { text: 'world', value: 8 }]
  const graph = { nodes: [{ id: 'A' }, { id: 'B' }], links: [{ source: 'A', target: 'B' }] }
  return (
    <div style={{ padding: 16 }}>
      <div style={{ height: 200 }}>
        <ResponsiveContainer><BarChart data={data}><XAxis dataKey="name"/><YAxis/><Bar dataKey="value" fill="#5b8def"/></BarChart></ResponsiveContainer>
      </div>
      <div style={{ height: 200 }}>
        <ReactWordcloud words={words} />
      </div>
      <div style={{ height: 300 }}>
        <ForceGraph2D graphData={graph} width={400} height={300}/>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify spike renders cleanly**

```bash
npm run dev
```
Open `http://127.0.0.1:5173/?spike=1`. Expected: three charts render, no console errors, no React warnings about hooks/peer-deps. If any fails, return to Step 3.

- [ ] **Step 6: Delete spike artifacts**

```bash
rm src/analyze/__spike__.tsx
```
Remove the `?spike=1` branch from App.tsx. Confirm `npm run build` still passes.

- [ ] **Step 7: Add Vitest as a dev dependency**

```bash
npm install -D vitest @vitest/ui jsdom
```
Expected: install succeeds. `jsdom` is needed for `exportImage.ts` test (DOM globals); `@vitest/ui` is optional but useful for local debugging.

- [ ] **Step 8: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 9: Add test script to package.json**

In `package.json`, under `scripts`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 10: Smoke-test Vitest**

Create `src/analyze/__tests__/setup.test.ts` (temporary):

```ts
import { describe, it, expect } from 'vitest'
describe('vitest setup', () => {
  it('runs', () => { expect(1 + 1).toBe(2) })
})
```

Run:
```bash
npm test
```
Expected: PASS. One file, one test.

- [ ] **Step 11: Delete the smoke file**

```bash
rm src/analyze/__tests__/setup.test.ts
```

- [ ] **Step 12: Verify lint and build still pass**

```bash
npm run lint && npm run build
```
Expected: both pass with no new errors. Note the bundle-size delta — record it in the commit message.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "$(cat <<'EOF'
Add chart libs, Vitest, and verify React 19 compatibility

Spike confirmed Recharts, react-wordcloud, react-force-graph-2d, and
html-to-image render cleanly under React 19. Vitest configured with
jsdom for upcoming pure-helper tests in src/analyze/.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 1: `analyzeViewState.ts` — Persistence Helpers (TDD)

**Goal:** Pure module that owns the `analyzeView` JSON schema. `serialize`, `deserialize`, `clampTopN`, plus `DEFAULT_ANALYZE_VIEW`. Never throws.

**Files:**
- Create: `src/analyze/analyzeViewState.ts`
- Create: `src/analyze/__tests__/analyzeViewState.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/analyze/__tests__/analyzeViewState.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_ANALYZE_VIEW,
  serialize,
  deserialize,
  clampTopN,
  type AnalyzeViewState,
} from '../analyzeViewState'

describe('DEFAULT_ANALYZE_VIEW', () => {
  it('matches the spec defaults: bar / heatmap / heatmap', () => {
    expect(DEFAULT_ANALYZE_VIEW.wordFreq.view).toBe('bar')
    expect(DEFAULT_ANALYZE_VIEW.cooccur.view).toBe('heatmap')
    expect(DEFAULT_ANALYZE_VIEW.matrix.view).toBe('heatmap')
  })

  it('uses spec topN defaults', () => {
    expect(DEFAULT_ANALYZE_VIEW.wordFreq.topN).toBe(25)
    expect(DEFAULT_ANALYZE_VIEW.cooccur.topN).toBe(30)
    expect(DEFAULT_ANALYZE_VIEW.matrix.topNRows).toBe(30)
    expect(DEFAULT_ANALYZE_VIEW.matrix.topNCols).toBe(30)
  })
})

describe('serialize / deserialize round-trip', () => {
  it('round-trips an arbitrary state', () => {
    const state: AnalyzeViewState = {
      wordFreq: { view: 'cloud', topN: 50 },
      cooccur:  { view: 'network', topN: 15 },
      matrix:   { view: 'bars', topNRows: 20, topNCols: 25 },
    }
    expect(deserialize({ analyzeView: serialize(state) })).toEqual(state)
  })
})

describe('deserialize fallbacks', () => {
  it('returns DEFAULT_ANALYZE_VIEW for undefined', () => {
    expect(deserialize(undefined)).toEqual(DEFAULT_ANALYZE_VIEW)
  })
  it('returns DEFAULT_ANALYZE_VIEW for empty object', () => {
    expect(deserialize({})).toEqual(DEFAULT_ANALYZE_VIEW)
  })
  it('returns DEFAULT_ANALYZE_VIEW for legacy query (no analyzeView key)', () => {
    expect(deserialize({ text: 'hi', codeId: 'abc' } as any)).toEqual(DEFAULT_ANALYZE_VIEW)
  })
  it('fills missing keys when only one analysis is present', () => {
    const result = deserialize({ analyzeView: { wordFreq: { view: 'cloud', topN: 50 } } } as any)
    expect(result.wordFreq).toEqual({ view: 'cloud', topN: 50 })
    expect(result.cooccur).toEqual(DEFAULT_ANALYZE_VIEW.cooccur)
    expect(result.matrix).toEqual(DEFAULT_ANALYZE_VIEW.matrix)
  })
  it('falls back on malformed shape and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = deserialize({ analyzeView: 'not an object' } as any)
    expect(result).toEqual(DEFAULT_ANALYZE_VIEW)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
  it('falls back on invalid view enum', () => {
    const result = deserialize({ analyzeView: { wordFreq: { view: 'pie', topN: 25 } } } as any)
    expect(result.wordFreq.view).toBe('bar') // default
  })
})

describe('clampTopN', () => {
  it('clamps below min', () => { expect(clampTopN(2, 5, 100)).toBe(5) })
  it('clamps above max', () => { expect(clampTopN(500, 5, 100)).toBe(100) })
  it('passes through valid values', () => { expect(clampTopN(42, 5, 100)).toBe(42) })
  it('handles non-finite inputs', () => { expect(clampTopN(NaN, 5, 100)).toBe(5) })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: ALL FAIL with "Cannot find module '../analyzeViewState'".

- [ ] **Step 3: Create the module skeleton**

Create `src/analyze/analyzeViewState.ts`:

```ts
export type WordFreqView = 'bar' | 'cloud' | 'table'
export type CooccurView  = 'heatmap' | 'network' | 'table'
export type MatrixView   = 'heatmap' | 'bars' | 'table'

export type AnalyzeViewState = {
  wordFreq: { view: WordFreqView; topN: number }
  cooccur:  { view: CooccurView;  topN: number }
  matrix:   { view: MatrixView;   topNRows: number; topNCols: number }
}

export const DEFAULT_ANALYZE_VIEW: AnalyzeViewState = {
  wordFreq: { view: 'bar',     topN: 25 },
  cooccur:  { view: 'heatmap', topN: 30 },
  matrix:   { view: 'heatmap', topNRows: 30, topNCols: 30 },
}

export const TOP_N_BOUNDS = {
  wordFreq:    { min: 5, max: 200 },
  cooccur:     { min: 5, max: 100 },
  matrixRows:  { min: 5, max: 50  },
  matrixCols:  { min: 5, max: 50  },
} as const
```

- [ ] **Step 4: Implement `serialize`**

Append to `src/analyze/analyzeViewState.ts`:

```ts
export function serialize(state: AnalyzeViewState): AnalyzeViewState {
  // Identity for now; named for symmetry and future schema evolution.
  return {
    wordFreq: { view: state.wordFreq.view, topN: state.wordFreq.topN },
    cooccur:  { view: state.cooccur.view,  topN: state.cooccur.topN  },
    matrix:   {
      view: state.matrix.view,
      topNRows: state.matrix.topNRows,
      topNCols: state.matrix.topNCols,
    },
  }
}
```

- [ ] **Step 5: Implement `clampTopN`**

Append:

```ts
export function clampTopN(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.floor(value)))
}
```

- [ ] **Step 6: Implement `deserialize` with safe fallbacks**

Append:

```ts
const WORD_FREQ_VIEWS: WordFreqView[] = ['bar', 'cloud', 'table']
const COOCCUR_VIEWS:   CooccurView[]  = ['heatmap', 'network', 'table']
const MATRIX_VIEWS:    MatrixView[]   = ['heatmap', 'bars', 'table']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickView<T extends string>(raw: unknown, allowed: T[], fallback: T): T {
  return typeof raw === 'string' && (allowed as string[]).includes(raw) ? (raw as T) : fallback
}

export function deserialize(definition: { analyzeView?: unknown } | undefined): AnalyzeViewState {
  if (!definition) return DEFAULT_ANALYZE_VIEW
  const raw = (definition as { analyzeView?: unknown }).analyzeView
  if (raw === undefined) return DEFAULT_ANALYZE_VIEW
  if (!isPlainObject(raw)) {
    console.warn('[analyzeViewState] analyzeView is not an object; using defaults', raw)
    return DEFAULT_ANALYZE_VIEW
  }

  const wf = isPlainObject(raw.wordFreq) ? raw.wordFreq : {}
  const co = isPlainObject(raw.cooccur)  ? raw.cooccur  : {}
  const mx = isPlainObject(raw.matrix)   ? raw.matrix   : {}

  return {
    wordFreq: {
      view: pickView(wf.view, WORD_FREQ_VIEWS, DEFAULT_ANALYZE_VIEW.wordFreq.view),
      topN: clampTopN(
        typeof wf.topN === 'number' ? wf.topN : DEFAULT_ANALYZE_VIEW.wordFreq.topN,
        TOP_N_BOUNDS.wordFreq.min,
        TOP_N_BOUNDS.wordFreq.max,
      ),
    },
    cooccur: {
      view: pickView(co.view, COOCCUR_VIEWS, DEFAULT_ANALYZE_VIEW.cooccur.view),
      topN: clampTopN(
        typeof co.topN === 'number' ? co.topN : DEFAULT_ANALYZE_VIEW.cooccur.topN,
        TOP_N_BOUNDS.cooccur.min,
        TOP_N_BOUNDS.cooccur.max,
      ),
    },
    matrix: {
      view: pickView(mx.view, MATRIX_VIEWS, DEFAULT_ANALYZE_VIEW.matrix.view),
      topNRows: clampTopN(
        typeof mx.topNRows === 'number' ? mx.topNRows : DEFAULT_ANALYZE_VIEW.matrix.topNRows,
        TOP_N_BOUNDS.matrixRows.min,
        TOP_N_BOUNDS.matrixRows.max,
      ),
      topNCols: clampTopN(
        typeof mx.topNCols === 'number' ? mx.topNCols : DEFAULT_ANALYZE_VIEW.matrix.topNCols,
        TOP_N_BOUNDS.matrixCols.min,
        TOP_N_BOUNDS.matrixCols.max,
      ),
    },
  }
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test
```
Expected: 14 tests pass across 5 describe blocks.

- [ ] **Step 8: Run lint and build**

```bash
npm run lint && npm run build
```
Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add src/analyze/analyzeViewState.ts src/analyze/__tests__/analyzeViewState.test.ts
git commit -m "$(cat <<'EOF'
Add analyzeViewState helpers with safe-deserialization tests

Pure module owns the analyzeView JSON schema for saved queries. Never
throws; legacy queries (no analyzeView key) and malformed inputs fall
through to DEFAULT_ANALYZE_VIEW. Establishes Vitest as the unit-test
runner for src/analyze/.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `exportImage.ts` — PNG Export Helper (TDD)

**Goal:** Pure helper for filename construction + a `toPng(ref)` wrapper around `html-to-image` with graceful error handling. Reused by Milestone B for embedded report charts.

**Files:**
- Create: `src/analyze/exportImage.ts`
- Create: `src/analyze/__tests__/exportImage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/analyze/__tests__/exportImage.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { buildExportFilename, exportPng } from '../exportImage'

describe('buildExportFilename', () => {
  it('builds expected shape', () => {
    const date = new Date('2026-04-29T12:00:00Z')
    expect(buildExportFilename('cooccurrence', 'heatmap', date))
      .toBe('fieldnote-cooccurrence-heatmap-2026-04-29.png')
  })
  it('handles all analysis names', () => {
    const date = new Date('2026-04-29T00:00:00Z')
    expect(buildExportFilename('wordFrequency', 'bar', date)).toBe('fieldnote-wordFrequency-bar-2026-04-29.png')
    expect(buildExportFilename('matrix', 'heatmap', date)).toBe('fieldnote-matrix-heatmap-2026-04-29.png')
  })
})

describe('exportPng error path', () => {
  it('returns null when html-to-image throws', async () => {
    vi.mock('html-to-image', () => ({
      toPng: vi.fn().mockRejectedValue(new Error('canvas tainted')),
    }))
    const fakeRef = { current: document.createElement('div') }
    const blob = await exportPng(fakeRef as any)
    expect(blob).toBeNull()
  })
  it('returns null when ref is null', async () => {
    const blob = await exportPng({ current: null })
    expect(blob).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```
Expected: FAIL with "Cannot find module '../exportImage'".

- [ ] **Step 3: Implement the module**

Create `src/analyze/exportImage.ts`:

```ts
import * as htmlToImage from 'html-to-image'
import type { RefObject } from 'react'

export type AnalysisName = 'wordFrequency' | 'cooccurrence' | 'matrix'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildExportFilename(analysis: string, view: string, when: Date = new Date()): string {
  return `fieldnote-${analysis}-${view}-${isoDate(when)}.png`
}

export async function exportPng(ref: RefObject<HTMLElement | null>): Promise<Blob | null> {
  if (!ref.current) return null
  try {
    const dataUrl = await htmlToImage.toPng(ref.current, { pixelRatio: 2, cacheBust: true })
    const res = await fetch(dataUrl)
    return await res.blob()
  } catch (err) {
    console.warn('[exportImage] PNG export failed', err)
    return null
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportCanvasPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png')
    } catch (err) {
      console.warn('[exportImage] canvas export failed', err)
      resolve(null)
    }
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```
Expected: all `exportImage` tests pass; `analyzeViewState` tests still pass.

- [ ] **Step 5: Lint + build**

```bash
npm run lint && npm run build
```
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/analyze/exportImage.ts src/analyze/__tests__/exportImage.test.ts
git commit -m "$(cat <<'EOF'
Add exportImage helpers for PNG chart download

Wraps html-to-image with graceful error handling that returns null
instead of throwing. Adds buildExportFilename, downloadBlob, and a
canvas-direct exportCanvasPng for the wordcloud/network views which
render to canvas natively. Reusable by Milestone B for report chart
embeds.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `ChartViewToggle.tsx` — Segmented Control

**Goal:** Stateless 3-way segmented control. Accepts the three labels and current value, emits change events.

**Files:**
- Create: `src/analyze/ChartViewToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/ChartViewToggle.tsx
import type { ReactNode } from 'react'

export type ChartViewToggleOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type Props<T extends string> = {
  value: T
  options: ChartViewToggleOption<T>[]
  onChange: (next: T) => void
  ariaLabel: string
}

export function ChartViewToggle<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="chart-view-toggle" role="tablist" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon ? <span className="chart-view-toggle-icon">{opt.icon}</span> : null}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add minimal CSS**

In `src/App.css`, append (place near existing `.analyze-tabs` rules):

```css
.chart-view-toggle {
  display: inline-flex;
  border: 1px solid var(--border-subtle, #d8d8d8);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.chart-view-toggle button {
  padding: 4px 10px;
  border: 0;
  border-right: 1px solid var(--border-subtle, #d8d8d8);
  background: transparent;
  font-size: 12px;
  cursor: pointer;
}
.chart-view-toggle button:last-child { border-right: 0; }
.chart-view-toggle button.active {
  background: var(--accent-subtle, #eef3ff);
  font-weight: 600;
}
.chart-view-toggle-icon { margin-right: 4px; display: inline-flex; }
```

If `.analyze-tabs` styles don't exist yet, mirror them — the goal is visual continuity with existing tab UI.

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/analyze/ChartViewToggle.tsx src/App.css
git commit -m "$(cat <<'EOF'
Add ChartViewToggle segmented control

Stateless three-option segmented control reused by every Analyze
view to switch Table / Chart A / Chart B. Generic over the value
union type so each view enforces its own viewset at the call site.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `TopNControl.tsx` — Stepper

**Goal:** Single-value stepper with min/max bounds and an optional second value (for matrix's rows × cols).

**Files:**
- Create: `src/analyze/TopNControl.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/TopNControl.tsx
import { clampTopN } from './analyzeViewState'

type SingleProps = {
  label: string
  value: number
  min: number
  max: number
  onChange: (next: number) => void
}

export function TopNControl({ label, value, min, max, onChange }: SingleProps) {
  return (
    <label className="topn-control">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={5}
        onChange={(e) => onChange(clampTopN(Number(e.target.value), min, max))}
      />
    </label>
  )
}

type DualProps = {
  rowsLabel: string
  colsLabel: string
  rows: number
  cols: number
  rowsMin: number; rowsMax: number
  colsMin: number; colsMax: number
  onRowsChange: (next: number) => void
  onColsChange: (next: number) => void
}

export function TopNControlDual(props: DualProps) {
  return (
    <span className="topn-control-dual">
      <TopNControl
        label={props.rowsLabel}
        value={props.rows}
        min={props.rowsMin}
        max={props.rowsMax}
        onChange={props.onRowsChange}
      />
      <TopNControl
        label={props.colsLabel}
        value={props.cols}
        min={props.colsMin}
        max={props.colsMax}
        onChange={props.onColsChange}
      />
    </span>
  )
}
```

- [ ] **Step 2: Add CSS**

In `src/App.css`:

```css
.topn-control { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.topn-control input { width: 56px; padding: 2px 4px; font-size: 12px; }
.topn-control-dual { display: inline-flex; gap: 12px; }
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/analyze/TopNControl.tsx src/App.css
git commit -m "Add TopNControl stepper for Analyze chart Top-N caps

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: `ExportImageButton.tsx` — Async Export Button

**Goal:** Button that calls `exportPng(ref)` (or a custom export fn), shows "Exporting…" state, downloads the file, surfaces errors as a transient inline message.

**Files:**
- Create: `src/analyze/ExportImageButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/ExportImageButton.tsx
import { useState, type RefObject } from 'react'
import { buildExportFilename, downloadBlob, exportPng, type AnalysisName } from './exportImage'

type Props = {
  containerRef: RefObject<HTMLElement | null>
  analysis: AnalysisName
  view: string
  disabled?: boolean
  /** Optional override for canvas-native exports (wordcloud, network). Returns null on failure. */
  exportOverride?: () => Promise<Blob | null>
}

export function ExportImageButton({ containerRef, analysis, view, disabled, exportOverride }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const blob = exportOverride ? await exportOverride() : await exportPng(containerRef)
      if (!blob) {
        setError("Couldn't export this chart. Try another view.")
        return
      }
      downloadBlob(blob, buildExportFilename(analysis, view))
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="export-image-button">
      <button type="button" onClick={handleClick} disabled={disabled || busy}>
        {busy ? 'Exporting…' : '⤓ PNG'}
      </button>
      {error ? <span className="export-image-error" role="alert">{error}</span> : null}
    </span>
  )
}
```

- [ ] **Step 2: Add CSS**

In `src/App.css`:

```css
.export-image-button { display: inline-flex; align-items: center; gap: 8px; }
.export-image-error { font-size: 11px; color: #b40000; }
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/analyze/ExportImageButton.tsx src/App.css
git commit -m "Add ExportImageButton with async state and error surface

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: `charts/BarChart.tsx` — Recharts Bar Wrapper

**Goal:** Simple horizontal bar chart for word frequency. Accepts `[{label, value}]`, exposes hover tooltip and click-to-drill.

**Files:**
- Create: `src/analyze/charts/BarChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/charts/BarChart.tsx
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export type BarDatum = { label: string; value: number; secondary?: number }

type Props = {
  data: BarDatum[]
  onSelect?: (label: string) => void
  /** Optional secondary tooltip text builder (e.g. percentage). */
  tooltipFormatter?: (d: BarDatum) => string
}

export function BarChart({ data, onSelect, tooltipFormatter }: Props) {
  if (data.length === 0) {
    return <div className="chart-empty-state">No terms yet — adjust filters.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 22)}>
      <RBarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 80 }}>
        <XAxis type="number" />
        <YAxis dataKey="label" type="category" width={80} />
        <Tooltip
          formatter={(value, _name, ctx) => {
            const d = ctx.payload as BarDatum
            return tooltipFormatter ? tooltipFormatter(d) : `${value}`
          }}
        />
        <Bar dataKey="value" cursor={onSelect ? 'pointer' : 'default'}>
          {data.map((d) => (
            <Cell key={d.label} onClick={() => onSelect?.(d.label)} fill="#5b8def" />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Add CSS**

In `src/App.css`:

```css
.chart-empty-state {
  padding: 24px;
  text-align: center;
  color: #666;
  background: #fafafa;
  border: 1px dashed #d8d8d8;
  border-radius: 6px;
}
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/analyze/charts/BarChart.tsx src/App.css
git commit -m "Add BarChart wrapper for word-frequency visualization

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: `charts/WordCloud.tsx` — react-wordcloud Wrapper

**Goal:** Word cloud rendered to canvas. Click-to-drill emits the word.

**Files:**
- Create: `src/analyze/charts/WordCloud.tsx`

> **If Task 0's spike forced a swap to `@visx/wordcloud`,** rewrite this task using `@visx/wordcloud`'s `<Wordcloud>` component. The API surface needed: `words: { text, value }[]`, `width`, `height`, plus a `font`, `fontSize` callback, and click handlers via the rendered text node. Render inside a `<ParentSize>` wrapper (`@visx/responsive`) for sizing.

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/charts/WordCloud.tsx
import { useRef } from 'react'
import ReactWordcloud from 'react-wordcloud'
import { exportCanvasPng } from '../exportImage'

export type WordDatum = { text: string; value: number }

type Props = {
  words: WordDatum[]
  onSelect?: (word: string) => void
  /** Setter the parent uses to register the canvas-export override on the export button. */
  onExporterReady?: (exporter: () => Promise<Blob | null>) => void
}

export function WordCloud({ words, onSelect, onExporterReady }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  if (words.length === 0) {
    return <div className="chart-empty-state">No terms yet — adjust filters.</div>
  }

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node
        if (node && onExporterReady) {
          onExporterReady(async () => {
            const canvas = node.querySelector('canvas')
            return canvas ? exportCanvasPng(canvas) : null
          })
        }
      }}
      style={{ width: '100%', height: 360 }}
    >
      <ReactWordcloud
        words={words}
        callbacks={{
          onWordClick: (w) => onSelect?.(w.text),
        }}
        options={{
          rotations: 2,
          rotationAngles: [0, 0],
          fontSizes: [12, 48],
          padding: 2,
          deterministic: true,
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/analyze/charts/WordCloud.tsx
git commit -m "Add WordCloud wrapper with canvas-direct PNG export

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: `charts/Heatmap.tsx` — Shared Cell-Grid Heatmap

**Goal:** Recharts-free pure-DOM heatmap (CSS grid). Used by both Cooccurrence and Matrix views. Accepts `rows`, `cols`, and a `cells[r][c] = { value, sample? }` matrix.

**Files:**
- Create: `src/analyze/charts/Heatmap.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/charts/Heatmap.tsx
import { useMemo, useState } from 'react'

export type HeatmapCell = { value: number; sample?: string }

type Props = {
  rowLabels: string[]
  colLabels: string[]
  cells: HeatmapCell[][]
  onCellClick?: (rowIndex: number, colIndex: number) => void
  emptyMessage?: string
}

export function Heatmap({ rowLabels, colLabels, cells, onCellClick, emptyMessage }: Props) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)

  const max = useMemo(() => {
    let m = 0
    for (const row of cells) for (const cell of row) if (cell.value > m) m = cell.value
    return m
  }, [cells])

  if (rowLabels.length === 0 || colLabels.length === 0) {
    return <div className="chart-empty-state">{emptyMessage ?? 'No data — adjust filters.'}</div>
  }

  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap-grid"
        style={{ gridTemplateColumns: `120px repeat(${colLabels.length}, minmax(28px, 1fr))` }}
      >
        <div className="heatmap-corner" />
        {colLabels.map((label) => (
          <div key={label} className="heatmap-col-header" title={label}>{label}</div>
        ))}
        {rowLabels.map((rowLabel, r) => (
          <>
            <div key={`row-${r}`} className="heatmap-row-header" title={rowLabel}>{rowLabel}</div>
            {colLabels.map((_, c) => {
              const cell = cells[r]?.[c] ?? { value: 0 }
              const intensity = max > 0 ? cell.value / max : 0
              const bg = intensityToBlue(intensity)
              return (
                <button
                  key={`cell-${r}-${c}`}
                  type="button"
                  className="heatmap-cell"
                  style={{ background: bg, color: intensity > 0.55 ? '#fff' : '#222' }}
                  onClick={() => onCellClick?.(r, c)}
                  onMouseEnter={() => setHover({ r, c })}
                  onMouseLeave={() => setHover(null)}
                >
                  {cell.value > 0 ? cell.value : ''}
                </button>
              )
            })}
          </>
        ))}
      </div>
      {hover ? (
        <div className="heatmap-tooltip" role="status">
          <strong>{rowLabels[hover.r]}</strong> × <strong>{colLabels[hover.c]}</strong>
          <span> — {cells[hover.r]?.[hover.c]?.value ?? 0}</span>
          {cells[hover.r]?.[hover.c]?.sample
            ? <em className="heatmap-sample">"{cells[hover.r]?.[hover.c]?.sample}"</em>
            : null}
        </div>
      ) : null}
    </div>
  )
}

/** Single-hue ColorBrewer-style "Blues" gradient. Colorblind-safe. */
function intensityToBlue(t: number): string {
  // t in [0, 1]
  const start = [247, 251, 255] // very pale
  const end   = [8, 48, 107]    // deep blue
  const r = Math.round(start[0] + (end[0] - start[0]) * t)
  const g = Math.round(start[1] + (end[1] - start[1]) * t)
  const b = Math.round(start[2] + (end[2] - start[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}
```

- [ ] **Step 2: Add CSS**

In `src/App.css`:

```css
.heatmap-wrap { display: flex; flex-direction: column; gap: 8px; }
.heatmap-grid { display: grid; gap: 1px; background: #e5e5e5; padding: 1px; }
.heatmap-corner { background: #fff; }
.heatmap-col-header,
.heatmap-row-header {
  background: #fff;
  font-size: 11px;
  padding: 4px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.heatmap-row-header { text-align: right; }
.heatmap-cell {
  border: 0;
  padding: 0;
  min-height: 24px;
  font-size: 11px;
  cursor: pointer;
}
.heatmap-tooltip {
  font-size: 12px;
  padding: 8px 10px;
  background: #222;
  color: #fff;
  border-radius: 4px;
  align-self: flex-start;
}
.heatmap-sample { display: block; font-style: italic; opacity: 0.85; margin-top: 2px; }
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/analyze/charts/Heatmap.tsx src/App.css
git commit -m "Add shared Heatmap component with single-hue gradient

Used by both Cooccurrence and Matrix views. Pure DOM (no Recharts
dependency), CSS-grid based, colorblind-safe Blues gradient. Click
emits row/col indices for filter drill-down.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: `charts/NetworkGraph.tsx` — react-force-graph-2d Wrapper

**Goal:** Force-directed network of code co-occurrences. Accepts `nodes` and `links`, click-to-drill on a node, canvas-native PNG export.

**Files:**
- Create: `src/analyze/charts/NetworkGraph.tsx`

> **If Task 0's spike forced a swap to `vis-network`,** rewrite using a `useEffect` that mounts `new Network(container, { nodes, edges }, options)` and tears down on cleanup. Click handler via `network.on('click', e => ...)`.

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/charts/NetworkGraph.tsx
import { useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { exportCanvasPng } from '../exportImage'

export type NetworkNode = { id: string; label: string; weight: number }
export type NetworkLink = { source: string; target: string; weight: number }

type Props = {
  nodes: NetworkNode[]
  links: NetworkLink[]
  width: number
  height: number
  onSelect?: (codeId: string) => void
  onExporterReady?: (exporter: () => Promise<Blob | null>) => void
}

export function NetworkGraph({ nodes, links, width, height, onSelect, onExporterReady }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  if (nodes.length < 2) {
    return <div className="chart-empty-state">Network needs ≥ 2 connected codes — adjust filters.</div>
  }

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node
        if (node && onExporterReady) {
          onExporterReady(async () => {
            const canvas = node.querySelector('canvas')
            return canvas ? exportCanvasPng(canvas) : null
          })
        }
      }}
      style={{ width, height }}
    >
      <ForceGraph2D
        graphData={{ nodes, links }}
        width={width}
        height={height}
        nodeLabel="label"
        nodeRelSize={6}
        linkWidth={(l: any) => Math.max(1, Math.log2(l.weight + 1))}
        onNodeClick={(n: any) => onSelect?.(String(n.id))}
        cooldownTicks={120}
      />
    </div>
  )
}
```

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/analyze/charts/NetworkGraph.tsx
git commit -m "Add NetworkGraph wrapper for code co-occurrence

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: `charts/GroupedBars.tsx` — Recharts Grouped Bars

**Goal:** Grouped bar chart for matrix coding (one group per code, bars per case/attr). Click-to-drill on a bar.

**Files:**
- Create: `src/analyze/charts/GroupedBars.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/charts/GroupedBars.tsx
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export type GroupedDatum = { rowLabel: string } & Record<string, string | number>

type Props = {
  data: GroupedDatum[]
  /** Each series is one column in the matrix. */
  seriesKeys: string[]
  /** Tableau 10 categorical colors (cycled). */
  palette?: string[]
  onBarClick?: (rowLabel: string, seriesKey: string) => void
}

const TABLEAU_10 = [
  '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f',
  '#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ac',
]

export function GroupedBars({ data, seriesKeys, palette = TABLEAU_10, onBarClick }: Props) {
  if (data.length === 0 || seriesKeys.length === 0) {
    return <div className="chart-empty-state">No matrix data — adjust filters.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
      <RBarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
        <XAxis dataKey="rowLabel" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        {seriesKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={palette[i % palette.length]}
            onClick={(d: any) => onBarClick?.(d.rowLabel, key)}
            cursor={onBarClick ? 'pointer' : 'default'}
          />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/analyze/charts/GroupedBars.tsx
git commit -m "Add GroupedBars chart for matrix coding

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: `WordFreqView.tsx` — Word Frequency Composite

**Goal:** Wraps Bar / WordCloud / Table behind the toggle. Owns the chart container ref for PNG export. Receives data and view state from App.tsx.

**Files:**
- Create: `src/analyze/WordFreqView.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/WordFreqView.tsx
import { useRef, useState } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControl } from './TopNControl'
import { ExportImageButton } from './ExportImageButton'
import { BarChart, type BarDatum } from './charts/BarChart'
import { WordCloud, type WordDatum } from './charts/WordCloud'
import { TOP_N_BOUNDS, type WordFreqView as ViewKind } from './analyzeViewState'

export type WordFreqRow = {
  word: string
  count: number
  excerptCount: number
}

type Props = {
  rows: WordFreqRow[]
  totalExcerpts: number
  view: ViewKind
  topN: number
  onViewChange: (next: ViewKind) => void
  onTopNChange: (next: number) => void
  onWordSelect?: (word: string) => void
  /** Existing CSV export action wired by App.tsx. */
  onExportCsv?: () => void
}

export function WordFreqView({
  rows, totalExcerpts, view, topN, onViewChange, onTopNChange, onWordSelect, onExportCsv,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [exportOverride, setExportOverride] = useState<(() => Promise<Blob | null>) | undefined>(undefined)

  const truncated = rows.slice(0, topN)
  const barData: BarDatum[] = truncated.map((r) => ({ label: r.word, value: r.count }))
  const cloudData: WordDatum[] = truncated.map((r) => ({ text: r.word, value: r.count }))
  const isEmpty = truncated.length === 0

  return (
    <div className="analyze-view word-freq-view">
      <div className="analyze-view-toolbar">
        <TopNControl
          label="Top"
          value={topN}
          min={TOP_N_BOUNDS.wordFreq.min}
          max={TOP_N_BOUNDS.wordFreq.max}
          onChange={onTopNChange}
        />
        <ChartViewToggle<ViewKind>
          value={view}
          ariaLabel="Word frequency view"
          options={[
            { value: 'bar',   label: 'Bar' },
            { value: 'cloud', label: 'Cloud' },
            { value: 'table', label: 'Table' },
          ]}
          onChange={(next) => {
            onViewChange(next)
            setExportOverride(undefined) // reset on view change
          }}
        />
        {view !== 'table' ? (
          <ExportImageButton
            containerRef={containerRef}
            analysis="wordFrequency"
            view={view}
            disabled={isEmpty}
            exportOverride={view === 'cloud' ? exportOverride : undefined}
          />
        ) : null}
        {onExportCsv ? <button type="button" onClick={onExportCsv}>⤓ CSV</button> : null}
      </div>

      <div className="analyze-view-surface" ref={containerRef}>
        {view === 'bar'  ? <BarChart data={barData} onSelect={onWordSelect}
                            tooltipFormatter={(d) => `${d.label} — ${d.value} (${pct(d.value, totalExcerpts)})`} /> : null}
        {view === 'cloud' ? <WordCloud words={cloudData} onSelect={onWordSelect} onExporterReady={setExportOverride} /> : null}
        {view === 'table' ? (
          <table className="analyze-table">
            <thead><tr><th>Term</th><th>Count</th><th>In excerpts</th></tr></thead>
            <tbody>
              {truncated.map((row) => (
                <tr key={row.word} onClick={() => onWordSelect?.(row.word)} style={{ cursor: 'pointer' }}>
                  <td>{row.word}</td>
                  <td>{row.count}</td>
                  <td>{row.excerptCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}
```

- [ ] **Step 2: Add CSS**

```css
.analyze-view { display: flex; flex-direction: column; gap: 12px; }
.analyze-view-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.analyze-view-surface { min-height: 280px; }
.analyze-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.analyze-table th, .analyze-table td { padding: 6px 8px; border-bottom: 1px solid #ececec; text-align: left; }
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/analyze/WordFreqView.tsx src/App.css
git commit -m "Add WordFreqView composite — Bar / Cloud / Table toggle

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: `CooccurrenceView.tsx` — Co-occurrence Composite

**Goal:** Wraps Heatmap / NetworkGraph / Table behind the toggle. Renders the soft-cap banner on network when code count > 20. Click-to-drill emits filter mutations.

**Files:**
- Create: `src/analyze/CooccurrenceView.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/CooccurrenceView.tsx
import { useMemo, useRef, useState } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControl } from './TopNControl'
import { ExportImageButton } from './ExportImageButton'
import { Heatmap, type HeatmapCell } from './charts/Heatmap'
import { NetworkGraph, type NetworkLink, type NetworkNode } from './charts/NetworkGraph'
import { TOP_N_BOUNDS, type CooccurView as ViewKind } from './analyzeViewState'

export type CooccurPair = {
  codeAId: string; codeAName: string
  codeBId: string; codeBName: string
  count: number
  sampleExcerpt?: string
}

type Props = {
  pairs: CooccurPair[]
  view: ViewKind
  topN: number
  onViewChange: (next: ViewKind) => void
  onTopNChange: (next: number) => void
  onPairSelect?: (codeAId: string, codeBId: string) => void
  onCodeSelect?: (codeId: string) => void
  onExportCsv?: () => void
}

const NETWORK_SOFT_CAP = 20

export function CooccurrenceView({
  pairs, view, topN, onViewChange, onTopNChange, onPairSelect, onCodeSelect, onExportCsv,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [exportOverride, setExportOverride] = useState<(() => Promise<Blob | null>) | undefined>(undefined)

  // Build a unique code list from pairs, ranked by total connections.
  const { ranked, heatmapCells, networkData } = useMemo(() => {
    const totals = new Map<string, { id: string; name: string; weight: number }>()
    for (const p of pairs) {
      const a = totals.get(p.codeAId) ?? { id: p.codeAId, name: p.codeAName, weight: 0 }
      a.weight += p.count
      totals.set(p.codeAId, a)
      const b = totals.get(p.codeBId) ?? { id: p.codeBId, name: p.codeBName, weight: 0 }
      b.weight += p.count
      totals.set(p.codeBId, b)
    }
    const ranked = [...totals.values()].sort((x, y) => y.weight - x.weight).slice(0, topN)
    const indexById = new Map(ranked.map((c, i) => [c.id, i]))

    const cells: HeatmapCell[][] = ranked.map(() => ranked.map(() => ({ value: 0 })))
    for (const p of pairs) {
      const i = indexById.get(p.codeAId)
      const j = indexById.get(p.codeBId)
      if (i === undefined || j === undefined) continue
      cells[i][j] = { value: p.count, sample: p.sampleExcerpt }
      cells[j][i] = { value: p.count, sample: p.sampleExcerpt }
    }

    const nodes: NetworkNode[] = ranked.map((c) => ({ id: c.id, label: c.name, weight: c.weight }))
    const links: NetworkLink[] = pairs
      .filter((p) => indexById.has(p.codeAId) && indexById.has(p.codeBId))
      .map((p) => ({ source: p.codeAId, target: p.codeBId, weight: p.count }))

    return { ranked, heatmapCells: cells, networkData: { nodes, links } }
  }, [pairs, topN])

  const totalCodeCount = new Set([...pairs.map((p) => p.codeAId), ...pairs.map((p) => p.codeBId)]).size
  const showSoftCap = view === 'network' && totalCodeCount > NETWORK_SOFT_CAP

  return (
    <div className="analyze-view cooccur-view">
      <div className="analyze-view-toolbar">
        <TopNControl
          label="Top codes"
          value={topN}
          min={TOP_N_BOUNDS.cooccur.min}
          max={TOP_N_BOUNDS.cooccur.max}
          onChange={onTopNChange}
        />
        <ChartViewToggle<ViewKind>
          value={view}
          ariaLabel="Co-occurrence view"
          options={[
            { value: 'heatmap', label: 'Heatmap' },
            { value: 'network', label: 'Network' },
            { value: 'table',   label: 'Table' },
          ]}
          onChange={(next) => { onViewChange(next); setExportOverride(undefined) }}
        />
        {view !== 'table' ? (
          <ExportImageButton
            containerRef={containerRef}
            analysis="cooccurrence"
            view={view}
            disabled={ranked.length === 0}
            exportOverride={view === 'network' ? exportOverride : undefined}
          />
        ) : null}
        {onExportCsv ? <button type="button" onClick={onExportCsv}>⤓ CSV</button> : null}
      </div>

      {showSoftCap ? (
        <div className="soft-cap-banner" role="status">
          Showing top {Math.min(topN, NETWORK_SOFT_CAP)} of {totalCodeCount} codes. Network view becomes hard to read past {NETWORK_SOFT_CAP} — switch to Heatmap to see all data, or use filters to narrow.
          <button type="button" onClick={() => onViewChange('heatmap')}>Switch to Heatmap</button>
        </div>
      ) : null}

      <div className="analyze-view-surface" ref={containerRef}>
        {view === 'heatmap' ? (
          <Heatmap
            rowLabels={ranked.map((c) => c.name)}
            colLabels={ranked.map((c) => c.name)}
            cells={heatmapCells}
            onCellClick={(r, c) => onPairSelect?.(ranked[r].id, ranked[c].id)}
            emptyMessage="No co-occurring codes yet — adjust filters."
          />
        ) : null}
        {view === 'network' ? (
          <NetworkGraph
            nodes={networkData.nodes.slice(0, NETWORK_SOFT_CAP)}
            links={networkData.links.filter((l) =>
              networkData.nodes.slice(0, NETWORK_SOFT_CAP).some((n) => n.id === l.source) &&
              networkData.nodes.slice(0, NETWORK_SOFT_CAP).some((n) => n.id === l.target),
            )}
            width={640}
            height={420}
            onSelect={onCodeSelect}
            onExporterReady={setExportOverride}
          />
        ) : null}
        {view === 'table' ? (
          <table className="analyze-table">
            <thead><tr><th>Code A</th><th>Code B</th><th>Count</th></tr></thead>
            <tbody>
              {pairs.slice(0, topN * topN).map((p) => (
                <tr key={`${p.codeAId}-${p.codeBId}`}
                    onClick={() => onPairSelect?.(p.codeAId, p.codeBId)}
                    style={{ cursor: 'pointer' }}>
                  <td>{p.codeAName}</td>
                  <td>{p.codeBName}</td>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS**

```css
.soft-cap-banner {
  background: #fff8e1;
  border: 1px solid #f0d471;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.soft-cap-banner button { margin-left: auto; }
```

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/analyze/CooccurrenceView.tsx src/App.css
git commit -m "Add CooccurrenceView composite with network soft-cap banner

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: `MatrixView.tsx` — Matrix Coding Composite

**Goal:** Wraps Heatmap / GroupedBars / Table behind the toggle for codes × cases or codes × attribute values.

**Files:**
- Create: `src/analyze/MatrixView.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/analyze/MatrixView.tsx
import { useMemo, useRef } from 'react'
import { ChartViewToggle } from './ChartViewToggle'
import { TopNControlDual } from './TopNControl'
import { ExportImageButton } from './ExportImageButton'
import { Heatmap, type HeatmapCell } from './charts/Heatmap'
import { GroupedBars, type GroupedDatum } from './charts/GroupedBars'
import { TOP_N_BOUNDS, type MatrixView as ViewKind } from './analyzeViewState'

export type MatrixCellInput = {
  rowId: string
  rowLabel: string
  colId: string
  colLabel: string
  count: number
  sampleExcerpt?: string
}

type Props = {
  rowLabels: string[]
  colLabels: string[]
  cells: MatrixCellInput[]
  view: ViewKind
  topNRows: number
  topNCols: number
  onViewChange: (next: ViewKind) => void
  onTopNRowsChange: (next: number) => void
  onTopNColsChange: (next: number) => void
  onCellSelect?: (rowId: string, colId: string) => void
  onExportCsv?: () => void
  /** Empty-state message override when classification is missing. */
  classifyEmptyMessage?: string
}

export function MatrixView({
  rowLabels, colLabels, cells, view, topNRows, topNCols,
  onViewChange, onTopNRowsChange, onTopNColsChange,
  onCellSelect, onExportCsv, classifyEmptyMessage,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const { rows, cols, heatmapCells, groupedData } = useMemo(() => {
    const truncRows = rowLabels.slice(0, topNRows)
    const truncCols = colLabels.slice(0, topNCols)
    const rowIndex = new Map(truncRows.map((label, i) => [label, i]))
    const colIndex = new Map(truncCols.map((label, i) => [label, i]))

    const heat: HeatmapCell[][] = truncRows.map(() => truncCols.map(() => ({ value: 0 })))
    const groupedById = new Map<string, GroupedDatum>()
    for (const row of truncRows) groupedById.set(row, { rowLabel: row })

    for (const c of cells) {
      const r = rowIndex.get(c.rowLabel)
      const k = colIndex.get(c.colLabel)
      if (r === undefined || k === undefined) continue
      heat[r][k] = { value: c.count, sample: c.sampleExcerpt }
      const g = groupedById.get(c.rowLabel)
      if (g) g[c.colLabel] = c.count
    }
    return { rows: truncRows, cols: truncCols, heatmapCells: heat, groupedData: [...groupedById.values()] }
  }, [cells, rowLabels, colLabels, topNRows, topNCols])

  const cellByLabels = useMemo(() => {
    const m = new Map<string, MatrixCellInput>()
    for (const c of cells) m.set(`${c.rowLabel}__${c.colLabel}`, c)
    return m
  }, [cells])

  const isEmpty = rows.length === 0 || cols.length === 0

  return (
    <div className="analyze-view matrix-view">
      <div className="analyze-view-toolbar">
        <TopNControlDual
          rowsLabel="Rows"
          colsLabel="Cols"
          rows={topNRows}
          cols={topNCols}
          rowsMin={TOP_N_BOUNDS.matrixRows.min}
          rowsMax={TOP_N_BOUNDS.matrixRows.max}
          colsMin={TOP_N_BOUNDS.matrixCols.min}
          colsMax={TOP_N_BOUNDS.matrixCols.max}
          onRowsChange={onTopNRowsChange}
          onColsChange={onTopNColsChange}
        />
        <ChartViewToggle<ViewKind>
          value={view}
          ariaLabel="Matrix view"
          options={[
            { value: 'heatmap', label: 'Heatmap' },
            { value: 'bars',    label: 'Bars' },
            { value: 'table',   label: 'Table' },
          ]}
          onChange={onViewChange}
        />
        {view !== 'table' ? (
          <ExportImageButton
            containerRef={containerRef}
            analysis="matrix"
            view={view}
            disabled={isEmpty}
          />
        ) : null}
        {onExportCsv ? <button type="button" onClick={onExportCsv}>⤓ CSV</button> : null}
      </div>

      <div className="analyze-view-surface" ref={containerRef}>
        {view === 'heatmap' ? (
          <Heatmap
            rowLabels={rows}
            colLabels={cols}
            cells={heatmapCells}
            onCellClick={(r, c) => {
              const m = cellByLabels.get(`${rows[r]}__${cols[c]}`)
              if (m) onCellSelect?.(m.rowId, m.colId)
            }}
            emptyMessage={classifyEmptyMessage ?? 'Matrix needs cases or attribute values — go to Classify mode.'}
          />
        ) : null}
        {view === 'bars' ? (
          <GroupedBars
            data={groupedData}
            seriesKeys={cols}
            onBarClick={(rowLabel, colLabel) => {
              const m = cellByLabels.get(`${rowLabel}__${colLabel}`)
              if (m) onCellSelect?.(m.rowId, m.colId)
            }}
          />
        ) : null}
        {view === 'table' ? (
          <table className="analyze-table">
            <thead>
              <tr><th>Code</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((rowLabel, r) => (
                <tr key={rowLabel}>
                  <td>{rowLabel}</td>
                  {cols.map((colLabel, c) => (
                    <td
                      key={colLabel}
                      onClick={() => {
                        const m = cellByLabels.get(`${rowLabel}__${colLabel}`)
                        if (m) onCellSelect?.(m.rowId, m.colId)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {heatmapCells[r]?.[c]?.value ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/analyze/MatrixView.tsx
git commit -m "Add MatrixView composite — Heatmap / GroupedBars / Table

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 14: Integrate Views into App.tsx

**Goal:** Extend `QueryDefinition` with `analyzeView`, wire `normalizeQueryDefinition` and `applyQueryDefinition`, add `analyzeView` session state, and replace the existing inline rendering of frequency / co-occurrence / matrix panels with the new view components. The query panel (`analyzePanel === 'query'`) is unchanged.

**Files:**
- Modify: `src/App.tsx`

This task has more steps than usual because integration touches multiple anchors. **Read each step in full before applying — keep changes localized to the named anchors.**

- [ ] **Step 1: Extend the `QueryDefinition` type**

Find the `QueryDefinition` type declaration near the top of App.tsx. It currently has shape `{ text, codeId, caseId, attributeId, attributeValue }`. Add an optional field:

```ts
import { type AnalyzeViewState } from './analyze/analyzeViewState'

type QueryDefinition = {
  text: string
  codeId: string
  caseId: string
  attributeId: string
  attributeValue: string
  analyzeView?: AnalyzeViewState
}
```

(Keep the field optional in the type — `normalizeQueryDefinition` always populates it.)

- [ ] **Step 2: Update `normalizeQueryDefinition`**

Find `normalizeQueryDefinition` (around line 426). Add the analyzeView line at the bottom, importing `deserialize`:

```ts
import { deserialize as deserializeAnalyzeView } from './analyze/analyzeViewState'

function normalizeQueryDefinition(definition?: Partial<QueryDefinition> | null): QueryDefinition {
  return {
    text: definition?.text ?? '',
    codeId: definition?.codeId ?? '',
    caseId: definition?.caseId ?? '',
    attributeId: definition?.attributeId ?? '',
    attributeValue: definition?.attributeValue ?? '',
    analyzeView: deserializeAnalyzeView(definition as { analyzeView?: unknown } | undefined),
  }
}
```

- [ ] **Step 3: Add `analyzeView` session state**

Near the existing `analyzePanel` state (around line 683), add:

```ts
import { DEFAULT_ANALYZE_VIEW, type AnalyzeViewState } from './analyze/analyzeViewState'

const [analyzeView, setAnalyzeView] = useState<AnalyzeViewState>(DEFAULT_ANALYZE_VIEW)
```

- [ ] **Step 4: Update `applyQueryDefinition`**

Find `applyQueryDefinition` (around line 1757). Append a setter for `analyzeView`:

```ts
function applyQueryDefinition(definition: QueryDefinition) {
  setQueryText(definition.text)
  setQueryCodeId(definition.codeId)
  setQueryCaseId(definition.caseId)
  setQueryAttributeId(definition.attributeId)
  setQueryAttributeValue(definition.attributeValue)
  setAnalyzeView(definition.analyzeView ?? DEFAULT_ANALYZE_VIEW)
}
```

- [ ] **Step 5: Include `analyzeView` in saved-query writes**

Find where `currentQueryDefinition` is built (around line 1771 in the save query handler). Add `analyzeView` to the object:

```ts
import { serialize as serializeAnalyzeView } from './analyze/analyzeViewState'

const currentQueryDefinition: QueryDefinition = {
  text: queryText,
  codeId: queryCodeId,
  caseId: queryCaseId,
  attributeId: queryAttributeId,
  attributeValue: queryAttributeValue,
  analyzeView: serializeAnalyzeView(analyzeView),
}
```

- [ ] **Step 6: Replace the frequency panel rendering**

Find the section `{analyzePanel === 'frequency' && ( ... )}` near line 2913+. Replace its body with:

```tsx
import { WordFreqView } from './analyze/WordFreqView'

{analyzePanel === 'frequency' && (
  <WordFreqView
    rows={wordFrequencyRows}
    totalExcerpts={analyzeResults.length}
    view={analyzeView.wordFreq.view}
    topN={analyzeView.wordFreq.topN}
    onViewChange={(next) => setAnalyzeView((s) => ({ ...s, wordFreq: { ...s.wordFreq, view: next } }))}
    onTopNChange={(next) => setAnalyzeView((s) => ({ ...s, wordFreq: { ...s.wordFreq, topN: next } }))}
    onWordSelect={(word) => setQueryText(word)}
    onExportCsv={exportWordFrequencyCsv} // existing handler
  />
)}
```

(Adapt the CSV handler name to the existing one in App.tsx — search for `downloadCsv` or `word-frequency` to find it.)

- [ ] **Step 7: Replace the co-occurrence panel rendering**

Find `{analyzePanel === 'cooccurrence' && ( ... )}`. Replace with:

```tsx
import { CooccurrenceView } from './analyze/CooccurrenceView'

{analyzePanel === 'cooccurrence' && (
  <CooccurrenceView
    pairs={codeCooccurrenceRows /* see existing memoized rows; adapt the field names */}
    view={analyzeView.cooccur.view}
    topN={analyzeView.cooccur.topN}
    onViewChange={(next) => setAnalyzeView((s) => ({ ...s, cooccur: { ...s.cooccur, view: next } }))}
    onTopNChange={(next) => setAnalyzeView((s) => ({ ...s, cooccur: { ...s.cooccur, topN: next } }))}
    onPairSelect={(a, _b) => setQueryCodeId(a)}
    onCodeSelect={(id) => setQueryCodeId(id)}
    onExportCsv={exportCooccurrenceCsv}
  />
)}
```

The existing `wordFrequencyRows` and co-occurrence memos in App.tsx may have a slightly different shape than `WordFreqRow` / `CooccurPair`. **If the shapes differ:** add a small adapter inline (or a `useMemo` adapter near the existing memo) that maps the existing shape to the new component's input. Do NOT modify the existing memo computation — keep the analytic source of truth where it is.

- [ ] **Step 8: Replace the matrix panel rendering**

Find `{analyzePanel === 'matrix' && ( ... )}`. The existing rendering uses `matrixResults`, `matrixRows`, `matrixColumns`. Replace its rendering with:

```tsx
import { MatrixView, type MatrixCellInput } from './analyze/MatrixView'

const matrixCellInputs: MatrixCellInput[] = useMemo(
  () => matrixResults.flatMap((row) =>
    row.cells.map((cell, i) => ({
      rowId: row.code.id,
      rowLabel: row.code.name,
      colId: matrixColumns[i].id,
      colLabel: matrixColumns[i].label,
      count: cell.excerpts.length,
      sampleExcerpt: cell.excerpts[0]?.text,
    }))
  ),
  [matrixResults, matrixColumns],
)

{analyzePanel === 'matrix' && (
  <MatrixView
    rowLabels={matrixRows.map((c) => c.name)}
    colLabels={matrixColumns.map((c) => c.label)}
    cells={matrixCellInputs}
    view={analyzeView.matrix.view}
    topNRows={analyzeView.matrix.topNRows}
    topNCols={analyzeView.matrix.topNCols}
    onViewChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, view: next } }))}
    onTopNRowsChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, topNRows: next } }))}
    onTopNColsChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, topNCols: next } }))}
    onCellSelect={(rowId, colId) => {
      setQueryCodeId(rowId)
      if (matrixColumnMode === 'case') setQueryCaseId(colId)
      else setQueryAttributeValue(colId)
    }}
    onExportCsv={exportMatrixCsv}
    classifyEmptyMessage={
      cases.length === 0 && attributes.length === 0
        ? 'Matrix needs cases or attribute values — go to Classify mode.'
        : undefined
    }
  />
)}
```

- [ ] **Step 9: Type-check and build**

```bash
npm run lint && npm run build
```
Expected: passes. **If TypeScript complains about adapter shapes**, fix the adapter at the call site — don't disable strictness.

- [ ] **Step 10: Run unit tests**

```bash
npm test
```
Expected: 14 tests still pass.

- [ ] **Step 11: Manual sanity in dev**

```bash
npm run dev
```
Open the local URL. With a project that has coded excerpts and cases, switch to Analyze mode and confirm:
- Frequency tab renders bar chart by default.
- Co-occurrence tab renders heatmap by default.
- Matrix tab renders heatmap by default.
- Query tab renders unchanged.

If anything blanks, fix before commit. Browser console must be clean.

- [ ] **Step 12: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
Integrate Analyze visualization views with saved-query persistence

Extends QueryDefinition with optional analyzeView; normalizeQueryDefinition
fills via deserialize, applyQueryDefinition restores on saved-query open,
and saves serialize the active view state. Replaces inline frequency,
co-occurrence, and matrix panels with the new src/analyze/ composites.
The query panel and existing CSV exports are unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Quality Gates

**Goal:** Final lint + build + test sweep on the integrated app. Capture the bundle-size delta.

- [ ] **Step 1: Lint**

```bash
npm run lint
```
Expected: zero new warnings or errors.

- [ ] **Step 2: Type + production build**

```bash
npm run build
```
Expected: passes. Note the printed bundle sizes. Compute delta vs. pre-Task-0 baseline (from your spike commit) and confirm it's ≤250kb gzipped.

- [ ] **Step 3: Run all tests**

```bash
npm test
```
Expected: all tests pass.

- [ ] **Step 4: Visual smoke on dev server**

```bash
npm run dev
```
Run the manual checklist (Task 16). Fix any item that fails before proceeding to Task 17.

---

## Task 16: Manual Verification Checklist

**Goal:** Walk through every behavior the spec promises. Run on `npm run dev` first, then again on production after Task 18.

Use a project with at least: 6 sources, 12 codes, 30 coded excerpts, 5 cases, 1 attribute with 3 distinct values.

- [ ] Word frequency: bar chart renders with seed data
- [ ] Word frequency: word cloud renders, no overflow, click selects word
- [ ] Word frequency: table renders (regression check)
- [ ] Co-occurrence: heatmap renders with hover tooltip showing sample excerpt
- [ ] Co-occurrence: network renders, drag node works, click filters to that code
- [ ] Co-occurrence: table renders (regression check)
- [ ] Matrix: heatmap renders for codes × cases
- [ ] Matrix: heatmap renders for codes × attribute values (toggle column mode)
- [ ] Matrix: grouped bars renders
- [ ] Matrix: table renders (regression check)
- [ ] Toggle persists view across page reload of a saved query (save query in non-default views, refresh, reopen → views restored)
- [ ] Toggle does NOT mark project dirty (autosave indicator stays clean while toggling)
- [ ] PNG export downloads valid file for each chart variant (open files; verify they render)
- [ ] Empty state shows for each analysis when filters return nothing (apply a filter that yields zero excerpts)
- [ ] Network soft-cap banner appears when code count > 20; "Switch to Heatmap" CTA flips view
- [ ] Click-to-drill on each chart adds the expected filter (chip appears in filter rail)
- [ ] Click-to-drill is reversible via existing filter chip removal
- [ ] Existing CSV export still works alongside new PNG export
- [ ] Saved queries created BEFORE this slice still load with default views (open one of your existing saved queries)
- [ ] Lint + build + tests all green

If any item fails, stop, fix, re-run lint+build+tests, then resume the checklist from the failed item.

---

## Task 17: Update Planning Docs

**Goal:** Reflect the shipped slice in `data-model-plan.md` and `handoff.md` so future conversations have accurate context.

**Files:**
- Modify: `data-model-plan.md`
- Modify: `handoff.md`

- [ ] **Step 1: Update `data-model-plan.md`**

Find the Phase 4 section. Append a subsection:

```markdown
#### Saved Query View Persistence (M5.1)

`fieldnote_queries.definition` JSON now includes an optional `analyzeView` key:

```json
{
  "analyzeView": {
    "wordFreq": { "view": "bar" | "cloud" | "table", "topN": 25 },
    "cooccur":  { "view": "heatmap" | "network" | "table", "topN": 30 },
    "matrix":   { "view": "heatmap" | "bars" | "table", "topNRows": 30, "topNCols": 30 }
  }
}
```

This is additive and requires no migration. Legacy queries (no `analyzeView`) deserialize to defaults via `src/analyze/analyzeViewState.ts`. Future first-class viz objects (named, shareable) will live in `fieldnote_visualizations` per the rest of this Phase; `analyzeView` is the lightweight predecessor for per-saved-query view memory.
```

- [ ] **Step 2: Update `handoff.md`**

In the **Analyze** section under "Current Implemented Behavior", add bullet points:

```markdown
- Word frequency, code co-occurrence, and matrix coding each have a 3-way toggle: Table / Chart A / Chart B.
  - Word frequency → Bar chart, Word cloud, Table.
  - Co-occurrence → Heatmap, Network graph (force-directed), Table.
  - Matrix → Heatmap, Grouped bars, Table.
- Each chart supports click-to-drill — clicking a bar/cell/node adds the corresponding filter chip.
- PNG export per chart, in addition to existing CSV export.
- Top-N controls per chart (defaults: word freq 25, co-occurrence 30, matrix 30 × 30). Network view shows a soft-cap banner past 20 codes.
- Saved queries persist the active view per analysis on `fieldnote_queries.definition.analyzeView`. No migration; legacy queries deserialize to defaults.
```

In the **Mode Shell Status** "Still needed" section, remove the now-shipped item about Analyze visualizations and replace with the next slice:

```markdown
- M5.2 (crosstabs): codes × N attribute groups, totals, percentages.
- M5.3 (query result snapshots): persist `fieldnote_query_results` rows for point-in-time captures.
```

In **Required Next Step**, replace the milestone-5 line with:

```markdown
Next implementation should pick up either:
- Milestone B (M6 Report mode): report preview / formatted Word/PDF outputs, reusing src/analyze/exportImage.ts.
- Or M5.2 (crosstabs) before Milestone B if the analysis depth matters more than report depth right now.
```

In **Recent Commits**, prepend:

```markdown
- `<commit-hash>` Add M5.1 Analyze visualizations
```
(Fill in the actual integrating commit hash from `git log` after Task 14.)

- [ ] **Step 3: Commit**

```bash
git add data-model-plan.md handoff.md
git commit -m "$(cat <<'EOF'
Document M5.1 visualizations in planning docs

data-model-plan.md gains an analyzeView subsection under Phase 4.
handoff.md reflects shipped capabilities and points to M5.2 crosstabs
or Milestone B (Report) as the next slice.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Production Deploy and Smoke

**Goal:** Ship to production and re-run the manual checklist against `https://fieldnote-seven.vercel.app`.

- [ ] **Step 1: Deploy to production**

```bash
npx vercel deploy --prod -y
```
Expected: deployment succeeds; URL printed. (Vercel already has the required `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` per `handoff.md`.)

- [ ] **Step 2: Re-run the Task 16 manual checklist** against `https://fieldnote-seven.vercel.app` with a real project.

If any item fails on production but passed on dev, investigate before declaring done. Likely culprits:
- Missing or stale environment variables.
- Bundle-splitting differences breaking a chart library's CSS.
- Production minification stripping a non-pure side effect.

- [ ] **Step 3: Tag the milestone**

```bash
git tag -a m5.1-visualizations -m "M5.1 Analyze visualizations shipped"
git push origin m5.1-visualizations
```

- [ ] **Step 4: Final commit if any production-only fixes were needed**

If Step 2 surfaced fixes, commit them with a clear `fix: ...` subject, then redeploy.

---

## Done Definition

This milestone is complete when:

- [ ] All Task 16 manual checklist items pass on production (`https://fieldnote-seven.vercel.app`).
- [ ] No new ESLint warnings.
- [ ] `npm run build` shows bundle delta documented in commit message and ≤250kb gzipped vs. baseline.
- [ ] `npm test` shows ≥14 unit tests passing across `analyzeViewState` and `exportImage`.
- [ ] `data-model-plan.md` documents the `analyzeView` JSON shape under Phase 4.
- [ ] `handoff.md` reflects shipped capabilities and names the next slice (M5.2 crosstabs or Milestone B).
- [ ] Git tag `m5.1-visualizations` exists on `main`.

## Forward Pointers

- **M5.2 (Crosstabs):** Reuses `ChartViewToggle`, `TopNControl`, and `Heatmap` primitives. Spec → plan → build cycle starts after this ships.
- **M5.3 (Query result snapshots):** New table `fieldnote_query_results` (migration). Saved-query reload behavior in `applyQueryDefinition` extends to "load a snapshot" semantics.
- **Milestone B (Report mode):** Calls `exportImage.ts` directly to embed charts in DOCX/PDF outputs. Renderer ships in this slice; report mode wires it.
