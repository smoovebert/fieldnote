# M6 Report Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Report mode renders a comprehensive HTML preview of a 6-section research report, with PDF + Word exports of the same model and the existing CSV exports moved to the sidebar.

**Architecture:** A pure `buildReport()` produces a typed `ReportModel` from project state. Three independent renderers (preview React component, PDF via `jspdf`, Word via `docx`) consume the same model, so the report content lives in one place. Heavy export libs are dynamically imported on first click — initial bundle unchanged.

**Tech Stack:** React + TypeScript + Vite. New deps: `jspdf` (~50KB gz), `docx` (~150KB gz), both lazy-loaded.

**Spec:** `docs/superpowers/specs/2026-04-29-report-mode-design.md`

---

## File Structure

**Create:**
- `src/report/buildReport.ts` — pure data builder.
- `src/report/__tests__/buildReport.test.ts` — unit tests with inline fixtures.
- `src/report/ReportPreview.tsx` — presentational component.
- `src/report/ReportPreview.css` — scoped styles.
- `src/report/exportPdf.ts` — `exportReportPdf(model, projectTitle)` via lazy-imported `jspdf`.
- `src/report/exportDocx.ts` — `exportReportDocx(model, projectTitle)` via lazy-imported `docx`.

**Modify:**
- `src/App.tsx` — Report-mode main pane swap, topbar export buttons, sidebar Raw-data section, conditional ListView change.
- `src/App.css` — minor styles for the Raw-data sidebar block.
- `package.json` — add `jspdf` and `docx`.

---

## Task 1: `buildReport` data builder + tests (TDD)

**Files:**
- Create: `src/report/buildReport.ts`
- Create: `src/report/__tests__/buildReport.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/report/__tests__/buildReport.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildReport } from '../buildReport'
import type { Attribute, AttributeValue, Case, Code, Excerpt, Memo, Source } from '../../lib/types'

const FIXED_DATE = new Date('2026-04-29T12:00:00Z')

const code = (id: string, name: string, parentCodeId?: string): Code => ({
  id, name, color: '#000', description: `${name} description`, parentCodeId,
})
const excerpt = (id: string, sourceId: string, codeIds: string[], text: string): Excerpt => ({
  id, sourceId, sourceTitle: sourceId, codeIds, text, note: '',
})
const source = (id: string, title: string): Source => ({
  id, title, kind: 'Transcript', folder: 'Internals', content: '',
})

describe('buildReport', () => {
  it('renders zero counts and skipped sections for an empty project', () => {
    const m = buildReport({
      projectTitle: 'Empty',
      sources: [],
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.cover).toEqual({
      title: 'Empty',
      dateIso: '2026-04-29',
      counts: { sources: 0, codes: 0, references: 0, cases: 0 },
    })
    expect(m.projectMemo).toBe(null)
    expect(m.codebook).toEqual([])
    expect(m.sampleExcerpts).toEqual([])
    expect(m.cases).toEqual([])
    expect(m.sourceMemos).toEqual([])
  })

  it('includes the project memo body when present', () => {
    const memos: Memo[] = [
      { id: 'pm', title: 'Project memo', body: 'methodology notes', linkedType: 'project' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [],
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.projectMemo).toBe('methodology notes')
  })

  it('skips the project memo if body is empty', () => {
    const memos: Memo[] = [
      { id: 'pm', title: 'Project memo', body: '   ', linkedType: 'project' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [],
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.projectMemo).toBe(null)
  })

  it('renders the codebook with hierarchy depth 0/1', () => {
    const codes = [
      code('c1', 'Trust'),
      code('c2', 'Subtrust', 'c1'),
      code('c3', 'Risk'),
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [],
      codes,
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.codebook).toEqual([
      { id: 'c1', name: 'Trust', description: 'Trust description', refCount: 0, depth: 0 },
      { id: 'c2', name: 'Subtrust', description: 'Subtrust description', refCount: 0, depth: 1 },
      { id: 'c3', name: 'Risk', description: 'Risk description', refCount: 0, depth: 0 },
    ])
  })

  it('counts excerpt references per code', () => {
    const codes = [code('c1', 'Trust'), code('c2', 'Risk')]
    const excerpts = [
      excerpt('e1', 's1', ['c1'], 'first'),
      excerpt('e2', 's1', ['c1', 'c2'], 'second'),
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [source('s1', 'S1')],
      codes,
      excerpts,
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    const trust = m.codebook.find((c) => c.id === 'c1')
    const risk = m.codebook.find((c) => c.id === 'c2')
    expect(trust?.refCount).toBe(2)
    expect(risk?.refCount).toBe(1)
  })

  it('caps sample excerpts at 3 per code and skips codes with no references', () => {
    const codes = [code('c1', 'Trust'), code('c2', 'Empty')]
    const excerpts = Array.from({ length: 5 }, (_, i) =>
      excerpt(`e${i}`, 's1', ['c1'], `text-${i}`),
    )
    const m = buildReport({
      projectTitle: 'P',
      sources: [source('s1', 'S1')],
      codes,
      excerpts,
      cases: [],
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.sampleExcerpts).toHaveLength(1) // only c1 (Empty has 0 refs)
    expect(m.sampleExcerpts[0].code.id).toBe('c1')
    expect(m.sampleExcerpts[0].samples).toHaveLength(3)
  })

  it('attaches the code memo to its sample-excerpts entry', () => {
    const codes = [code('c1', 'Trust')]
    const excerpts = [excerpt('e1', 's1', ['c1'], 'sample')]
    const memos: Memo[] = [
      { id: 'cm', title: 'Trust memo', body: 'evolving definition', linkedType: 'code', linkedId: 'c1' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources: [source('s1', 'S1')],
      codes,
      excerpts,
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.sampleExcerpts[0].codeMemo).toBe('evolving definition')
  })

  it('renders cases with attribute key/value pairs and linked sources', () => {
    const sources = [source('s1', 'S1'), source('s2', 'S2')]
    const cases: Case[] = [
      { id: 'C1', name: 'Renata', description: 'lead participant', sourceIds: ['s1', 's2'] },
    ]
    const attributes: Attribute[] = [
      { id: 'gender', name: 'Gender', valueType: 'text' },
      { id: 'cohort', name: 'Cohort', valueType: 'text' },
    ]
    const attributeValues: AttributeValue[] = [
      { caseId: 'C1', attributeId: 'gender', value: 'female' },
      { caseId: 'C1', attributeId: 'cohort', value: 'pilot' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources,
      codes: [],
      excerpts: [],
      cases,
      attributes,
      attributeValues,
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.cases).toHaveLength(1)
    const c = m.cases[0]
    expect(c.id).toBe('C1')
    expect(c.attributes).toEqual([
      { name: 'Gender', value: 'female' },
      { name: 'Cohort', value: 'pilot' },
    ])
    expect(c.sources.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it('renders source memos only for sources with non-empty memo bodies', () => {
    const sources = [source('s1', 'S1'), source('s2', 'S2'), source('s3', 'S3')]
    const memos: Memo[] = [
      { id: 'm1', title: '', body: 'first source notes', linkedType: 'source', linkedId: 's1' },
      { id: 'm2', title: '', body: '   ', linkedType: 'source', linkedId: 's2' },
      { id: 'm3', title: '', body: 'third source notes', linkedType: 'source', linkedId: 's3' },
    ]
    const m = buildReport({
      projectTitle: 'P',
      sources,
      codes: [],
      excerpts: [],
      cases: [],
      attributes: [],
      attributeValues: [],
      memos,
      now: FIXED_DATE,
    })
    expect(m.sourceMemos.map((sm) => sm.sourceId)).toEqual(['s1', 's3'])
    expect(m.sourceMemos[0].body).toBe('first source notes')
  })

  it('produces correct cover stat counts', () => {
    const sources = [source('s1', 'S1')]
    const codes = [code('c1', 'Trust')]
    const excerpts = [excerpt('e1', 's1', ['c1'], 'x'), excerpt('e2', 's1', ['c1'], 'y')]
    const cases: Case[] = [{ id: 'C1', name: 'C', description: '', sourceIds: ['s1'] }]
    const m = buildReport({
      projectTitle: 'P',
      sources,
      codes,
      excerpts,
      cases,
      attributes: [],
      attributeValues: [],
      memos: [],
      now: FIXED_DATE,
    })
    expect(m.cover.counts).toEqual({ sources: 1, codes: 1, references: 2, cases: 1 })
  })
})
```

- [ ] **Step 2: Run the test, expect FAIL (module not found)**

Run: `npx vitest run src/report/__tests__/buildReport.test.ts`

- [ ] **Step 3: Implement `src/report/buildReport.ts`**

```ts
import type {
  Attribute, AttributeValue, Case, Code, Excerpt, Memo, Source,
} from '../lib/types'

export type ReportModel = {
  cover: {
    title: string
    dateIso: string
    counts: { sources: number; codes: number; references: number; cases: number }
  }
  projectMemo: string | null
  codebook: Array<{
    id: string
    name: string
    description: string
    refCount: number
    depth: 0 | 1
  }>
  sampleExcerpts: Array<{
    code: { id: string; name: string }
    codeMemo: string | null
    samples: Array<{ excerptId: string; sourceTitle: string; text: string; note: string }>
  }>
  cases: Array<{
    id: string
    name: string
    description: string
    attributes: Array<{ name: string; value: string }>
    sources: Array<{ id: string; title: string }>
  }>
  sourceMemos: Array<{ sourceId: string; sourceTitle: string; body: string }>
}

export type BuildReportInput = {
  projectTitle: string
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  cases: Case[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  memos: Memo[]
  now?: Date
}

const SAMPLE_CAP = 3

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildReport(input: BuildReportInput): ReportModel {
  const { projectTitle, sources, codes, excerpts, cases, attributes, attributeValues, memos } = input
  const dateIso = isoDate(input.now ?? new Date())

  const projectMemoBody = memos.find((m) => m.linkedType === 'project')?.body?.trim() ?? ''
  const projectMemo = projectMemoBody.length > 0 ? projectMemoBody : null

  // Codebook: top-level codes first, then their children, in order.
  const topLevel = codes.filter((c) => !c.parentCodeId)
  const childrenByParent = new Map<string, Code[]>()
  for (const c of codes) {
    if (!c.parentCodeId) continue
    const list = childrenByParent.get(c.parentCodeId) ?? []
    list.push(c)
    childrenByParent.set(c.parentCodeId, list)
  }

  const refCounts = new Map<string, number>()
  for (const e of excerpts) {
    for (const codeId of e.codeIds) {
      refCounts.set(codeId, (refCounts.get(codeId) ?? 0) + 1)
    }
  }

  const codebook: ReportModel['codebook'] = []
  for (const parent of topLevel) {
    codebook.push({
      id: parent.id,
      name: parent.name,
      description: parent.description,
      refCount: refCounts.get(parent.id) ?? 0,
      depth: 0,
    })
    for (const child of childrenByParent.get(parent.id) ?? []) {
      codebook.push({
        id: child.id,
        name: child.name,
        description: child.description,
        refCount: refCounts.get(child.id) ?? 0,
        depth: 1,
      })
    }
  }

  // Sample excerpts: only codes with at least one ref; up to SAMPLE_CAP each.
  const codeMemoByCodeId = new Map<string, string>()
  for (const m of memos) {
    if (m.linkedType === 'code' && m.linkedId && m.body.trim()) {
      codeMemoByCodeId.set(m.linkedId, m.body.trim())
    }
  }

  const sampleExcerpts: ReportModel['sampleExcerpts'] = []
  for (const c of codes) {
    const matching = excerpts.filter((e) => e.codeIds.includes(c.id))
    if (matching.length === 0) continue
    sampleExcerpts.push({
      code: { id: c.id, name: c.name },
      codeMemo: codeMemoByCodeId.get(c.id) ?? null,
      samples: matching.slice(0, SAMPLE_CAP).map((e) => ({
        excerptId: e.id,
        sourceTitle: e.sourceTitle,
        text: e.text,
        note: e.note,
      })),
    })
  }

  // Cases: lookup attributes by name.
  const attributeNameById = new Map(attributes.map((a) => [a.id, a.name]))
  const sourceById = new Map(sources.map((s) => [s.id, s]))
  const reportCases: ReportModel['cases'] = cases.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    attributes: attributeValues
      .filter((v) => v.caseId === c.id && v.value.trim().length > 0)
      .map((v) => ({
        name: attributeNameById.get(v.attributeId) ?? 'Unknown attribute',
        value: v.value,
      })),
    sources: c.sourceIds
      .map((id) => sourceById.get(id))
      .filter((s): s is Source => s !== undefined)
      .map((s) => ({ id: s.id, title: s.title })),
  }))

  // Source memos: only sources with non-empty memo body, in source order.
  const sourceMemoBySourceId = new Map<string, string>()
  for (const m of memos) {
    if (m.linkedType === 'source' && m.linkedId && m.body.trim()) {
      sourceMemoBySourceId.set(m.linkedId, m.body.trim())
    }
  }
  const sourceMemos: ReportModel['sourceMemos'] = sources
    .filter((s) => sourceMemoBySourceId.has(s.id))
    .map((s) => ({
      sourceId: s.id,
      sourceTitle: s.title,
      body: sourceMemoBySourceId.get(s.id)!,
    }))

  return {
    cover: {
      title: projectTitle,
      dateIso,
      counts: {
        sources: sources.length,
        codes: codes.length,
        references: excerpts.length,
        cases: cases.length,
      },
    },
    projectMemo,
    codebook,
    sampleExcerpts,
    cases: reportCases,
    sourceMemos,
  }
}
```

- [ ] **Step 4: Run the tests, expect all pass**

Run: `npx vitest run src/report/__tests__/buildReport.test.ts`
Expected: 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/report/buildReport.ts src/report/__tests__/buildReport.test.ts
git commit -m "feat(report): add buildReport pure data builder"
```

---

## Task 2: `ReportPreview` component + scoped CSS

**Files:**
- Create: `src/report/ReportPreview.tsx`
- Create: `src/report/ReportPreview.css`

- [ ] **Step 1: Create `src/report/ReportPreview.tsx`**

```tsx
import type { ReportModel } from './buildReport'
import './ReportPreview.css'

type Props = { model: ReportModel }

export function ReportPreview({ model }: Props) {
  return (
    <article className="report-preview">
      <header className="report-cover">
        <p className="report-eyebrow">Research report</p>
        <h1 className="report-title">{model.cover.title}</h1>
        <p className="report-stats fn-meta">
          {model.cover.dateIso}
          {' · '}
          {model.cover.counts.sources} sources
          {' · '}
          {model.cover.counts.codes} codes
          {' · '}
          {model.cover.counts.references} coded references
          {' · '}
          {model.cover.counts.cases} cases
        </p>
      </header>

      {model.projectMemo && (
        <section className="report-section report-project-memo">
          <h2>Project memo</h2>
          <p>{model.projectMemo}</p>
        </section>
      )}

      {model.codebook.length > 0 && (
        <section className="report-section report-codebook">
          <h2>Codebook</h2>
          <ol className="report-codebook-list">
            {model.codebook.map((entry) => (
              <li key={entry.id} className={`report-code-row depth-${entry.depth}`}>
                <div className="report-code-row-head">
                  {entry.depth === 1 ? <span className="report-child-arrow" aria-hidden="true">→ </span> : null}
                  <strong className="report-code-name">{entry.name}</strong>
                  <span className="report-code-refs fn-mono">{entry.refCount} refs</span>
                </div>
                {entry.description ? <p className="report-code-desc">{entry.description}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      {model.sampleExcerpts.length > 0 && (
        <section className="report-section report-samples">
          <h2>Sample excerpts</h2>
          {model.sampleExcerpts.map((entry) => (
            <div key={entry.code.id} className="report-sample-block">
              <h3 className="report-sample-code">{entry.code.name}</h3>
              {entry.codeMemo ? <p className="report-sample-memo">{entry.codeMemo}</p> : null}
              {entry.samples.map((sample) => (
                <blockquote key={sample.excerptId} className="report-sample-quote">
                  <p className="report-sample-text">{sample.text}</p>
                  <cite className="fn-meta">
                    {sample.sourceTitle}
                    {sample.note ? ` — ${sample.note}` : ''}
                  </cite>
                </blockquote>
              ))}
            </div>
          ))}
        </section>
      )}

      {model.cases.length > 0 && (
        <section className="report-section report-cases">
          <h2>Cases</h2>
          {model.cases.map((c) => (
            <div key={c.id} className="report-case-block">
              <h3 className="report-case-name">{c.name}</h3>
              {c.description ? <p className="report-case-desc">{c.description}</p> : null}
              {c.attributes.length > 0 && (
                <dl className="report-case-attrs">
                  {c.attributes.map((a) => (
                    <div key={a.name} className="report-case-attr-row">
                      <dt>{a.name}</dt>
                      <dd>{a.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {c.sources.length > 0 && (
                <ul className="report-case-sources fn-meta">
                  {c.sources.map((s) => (
                    <li key={s.id}>{s.title}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {model.sourceMemos.length > 0 && (
        <section className="report-section report-source-memos">
          <h2>Source memos</h2>
          {model.sourceMemos.map((sm) => (
            <div key={sm.sourceId} className="report-source-memo-block">
              <h3 className="report-source-memo-title">{sm.sourceTitle}</h3>
              <p>{sm.body}</p>
            </div>
          ))}
        </section>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Create `src/report/ReportPreview.css`**

```css
/* Scoped under .report-preview so it can't leak. */

.report-preview {
  max-width: var(--reader-measure);
  margin: 0 auto;
  padding: var(--reader-pad-y) var(--reader-pad-x);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-reader);
  font-size: 17px;
  line-height: 1.7;
}

.report-preview .report-eyebrow {
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-size: 11px;
  margin: 0 0 var(--s-2);
}

.report-preview .report-title {
  font-family: var(--font-reader);
  font-weight: 500;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0 0 var(--s-3);
}

.report-preview .report-stats {
  color: var(--ink-3);
  margin: 0 0 var(--s-7);
}

.report-preview .report-section {
  padding-top: var(--s-7);
  border-top: 1px solid var(--rule-soft);
  margin-top: var(--s-7);
  page-break-before: always;
}

.report-preview .report-section h2 {
  font-family: var(--font-ui);
  font-size: 18px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-2);
  margin: 0 0 var(--s-4);
}

.report-preview .report-section h3 {
  font-family: var(--font-ui);
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin: var(--s-5) 0 var(--s-2);
}

.report-preview .report-codebook-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.report-preview .report-code-row.depth-1 {
  margin-left: var(--s-5);
}

.report-preview .report-code-row-head {
  display: flex;
  align-items: baseline;
  gap: var(--s-2);
}

.report-preview .report-code-name {
  font-weight: 600;
}

.report-preview .report-code-refs {
  margin-left: auto;
  color: var(--ink-3);
  font-size: 12px;
}

.report-preview .report-code-desc {
  font-size: 15px;
  color: var(--ink-2);
  margin: var(--s-1) 0 0;
}

.report-preview .report-sample-quote {
  margin: var(--s-3) 0;
  padding: var(--s-3) var(--s-4);
  border-left: 3px solid var(--rule);
  background: var(--paper-tint);
  font-style: italic;
}

.report-preview .report-sample-text {
  margin: 0 0 var(--s-2);
}

.report-preview .report-sample-memo {
  font-size: 15px;
  color: var(--ink-2);
  margin: 0 0 var(--s-2);
}

.report-preview .report-case-attrs {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--s-1) var(--s-4);
  margin: var(--s-2) 0;
  font-family: var(--font-ui);
  font-size: 14px;
}

.report-preview .report-case-attrs dt {
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 11px;
  font-weight: 600;
  align-self: center;
}

.report-preview .report-case-attrs dd {
  margin: 0;
  color: var(--ink);
}

.report-preview .report-case-sources {
  margin: var(--s-2) 0 0;
  padding-left: var(--s-5);
}

.report-preview .report-source-memo-block {
  margin-bottom: var(--s-5);
}

@media print {
  .report-preview .report-section {
    page-break-before: always;
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/report/ReportPreview.tsx src/report/ReportPreview.css
git commit -m "feat(report): add ReportPreview component"
```

---

## Task 3: PDF + Word exporters + dep install

**Files:**
- Modify: `package.json`
- Create: `src/report/exportPdf.ts`
- Create: `src/report/exportDocx.ts`

- [ ] **Step 1: Install deps**

```bash
npm install jspdf docx
```

Expected: `package.json` and `package-lock.json` updated; both packages added under `dependencies`.

- [ ] **Step 2: Add `slugify` helper inline (no new dep)**

Both exporters need a filename slug. Create `src/report/exportPdf.ts` with the slug helper at the top:

```ts
import type { ReportModel } from './buildReport'
import { downloadBlob } from '../analyze/exportImage'

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'
}

export async function exportReportPdf(
  model: ReportModel,
  projectTitle: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 54 // 0.75in
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const writeWrapped = (
    text: string,
    options: { size: number; bold?: boolean; color?: number; gap?: number },
  ) => {
    doc.setFontSize(options.size)
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal')
    if (options.color !== undefined) doc.setTextColor(options.color)
    else doc.setTextColor(20)
    const lines = doc.splitTextToSize(text, contentWidth) as string[]
    const lineHeight = options.size * 1.4
    for (const line of lines) {
      ensureSpace(lineHeight)
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += options.gap ?? 0
  }

  const sectionBreak = () => {
    doc.addPage()
    y = margin
  }

  // Cover
  writeWrapped('RESEARCH REPORT', { size: 11, bold: true, color: 120, gap: 12 })
  writeWrapped(model.cover.title, { size: 28, bold: true, gap: 8 })
  writeWrapped(
    `${model.cover.dateIso} · ${model.cover.counts.sources} sources · ${model.cover.counts.codes} codes · ${model.cover.counts.references} coded references · ${model.cover.counts.cases} cases`,
    { size: 10, color: 120, gap: 0 },
  )

  // Project memo
  if (model.projectMemo) {
    sectionBreak()
    writeWrapped('PROJECT MEMO', { size: 14, bold: true, gap: 16 })
    writeWrapped(model.projectMemo, { size: 11, gap: 0 })
  }

  // Codebook
  if (model.codebook.length > 0) {
    sectionBreak()
    writeWrapped('CODEBOOK', { size: 14, bold: true, gap: 16 })
    for (const entry of model.codebook) {
      const indent = entry.depth === 1 ? '   → ' : ''
      writeWrapped(`${indent}${entry.name}  (${entry.refCount} refs)`, {
        size: 11,
        bold: true,
        gap: 2,
      })
      if (entry.description) {
        writeWrapped(`${indent}${entry.description}`, { size: 10, color: 100, gap: 6 })
      } else {
        y += 4
      }
    }
  }

  // Sample excerpts
  if (model.sampleExcerpts.length > 0) {
    sectionBreak()
    writeWrapped('SAMPLE EXCERPTS', { size: 14, bold: true, gap: 16 })
    for (const entry of model.sampleExcerpts) {
      writeWrapped(entry.code.name, { size: 13, bold: true, gap: 6 })
      if (entry.codeMemo) {
        writeWrapped(entry.codeMemo, { size: 10, color: 100, gap: 6 })
      }
      for (const sample of entry.samples) {
        writeWrapped(`"${sample.text}"`, { size: 11, gap: 2 })
        const cite = sample.note ? `— ${sample.sourceTitle} — ${sample.note}` : `— ${sample.sourceTitle}`
        writeWrapped(cite, { size: 9, color: 120, gap: 8 })
      }
      y += 6
    }
  }

  // Cases
  if (model.cases.length > 0) {
    sectionBreak()
    writeWrapped('CASES', { size: 14, bold: true, gap: 16 })
    for (const c of model.cases) {
      writeWrapped(c.name, { size: 13, bold: true, gap: 4 })
      if (c.description) writeWrapped(c.description, { size: 11, gap: 6 })
      for (const a of c.attributes) {
        writeWrapped(`${a.name}: ${a.value}`, { size: 10, color: 100, gap: 2 })
      }
      if (c.sources.length > 0) {
        writeWrapped(`Sources: ${c.sources.map((s) => s.title).join(', ')}`, {
          size: 10,
          color: 100,
          gap: 12,
        })
      } else {
        y += 12
      }
    }
  }

  // Source memos
  if (model.sourceMemos.length > 0) {
    sectionBreak()
    writeWrapped('SOURCE MEMOS', { size: 14, bold: true, gap: 16 })
    for (const sm of model.sourceMemos) {
      writeWrapped(sm.sourceTitle, { size: 12, bold: true, gap: 4 })
      writeWrapped(sm.body, { size: 11, gap: 12 })
    }
  }

  const blob = doc.output('blob')
  downloadBlob(blob, `fieldnote-${slugify(projectTitle)}-${model.cover.dateIso}.pdf`)
}
```

- [ ] **Step 3: Create `src/report/exportDocx.ts`**

```ts
import type { ReportModel } from './buildReport'
import { downloadBlob } from '../analyze/exportImage'

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report'
}

export async function exportReportDocx(
  model: ReportModel,
  projectTitle: string,
): Promise<void> {
  const docx = await import('docx')
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = docx

  const para = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
    new Paragraph({
      children: [
        new TextRun({
          text,
          bold: opts.bold ?? false,
          size: opts.size ?? 22, // half-points; 22 = 11pt
          color: opts.color ?? '202020',
        }),
      ],
      spacing: { after: 120 },
    })

  const heading = (text: string, level: 1 | 2 | 3) =>
    new Paragraph({
      text,
      heading:
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 },
    })

  const sections: typeof Paragraph.prototype[] = []

  // Cover
  sections.push(heading(model.cover.title, 1))
  sections.push(
    para(
      `${model.cover.dateIso} · ${model.cover.counts.sources} sources · ${model.cover.counts.codes} codes · ${model.cover.counts.references} coded references · ${model.cover.counts.cases} cases`,
      { color: '707070', size: 20 },
    ),
  )

  // Project memo
  if (model.projectMemo) {
    sections.push(heading('Project memo', 2))
    sections.push(para(model.projectMemo))
  }

  // Codebook
  if (model.codebook.length > 0) {
    sections.push(heading('Codebook', 2))
    for (const entry of model.codebook) {
      const indent = entry.depth === 1 ? '   → ' : ''
      sections.push(para(`${indent}${entry.name}  (${entry.refCount} refs)`, { bold: true }))
      if (entry.description) sections.push(para(`${indent}${entry.description}`, { color: '606060' }))
    }
  }

  // Sample excerpts
  if (model.sampleExcerpts.length > 0) {
    sections.push(heading('Sample excerpts', 2))
    for (const entry of model.sampleExcerpts) {
      sections.push(heading(entry.code.name, 3))
      if (entry.codeMemo) sections.push(para(entry.codeMemo, { color: '606060' }))
      for (const sample of entry.samples) {
        sections.push(para(`"${sample.text}"`))
        const cite = sample.note ? `— ${sample.sourceTitle} — ${sample.note}` : `— ${sample.sourceTitle}`
        sections.push(para(cite, { color: '707070', size: 20 }))
      }
    }
  }

  // Cases
  if (model.cases.length > 0) {
    sections.push(heading('Cases', 2))
    for (const c of model.cases) {
      sections.push(heading(c.name, 3))
      if (c.description) sections.push(para(c.description))
      for (const a of c.attributes) sections.push(para(`${a.name}: ${a.value}`, { color: '606060' }))
      if (c.sources.length > 0) {
        sections.push(para(`Sources: ${c.sources.map((s) => s.title).join(', ')}`, { color: '606060' }))
      }
    }
  }

  // Source memos
  if (model.sourceMemos.length > 0) {
    sections.push(heading('Source memos', 2))
    for (const sm of model.sourceMemos) {
      sections.push(heading(sm.sourceTitle, 3))
      sections.push(para(sm.body))
    }
  }

  const docFile = new Document({ sections: [{ children: sections }] })
  const blob = await Packer.toBlob(docFile)
  downloadBlob(blob, `fieldnote-${slugify(projectTitle)}-${model.cover.dateIso}.docx`)
}
```

- [ ] **Step 4: Type-check + build**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

Expected: clean. Build output should show new chunks for `jspdf` and `docx` (lazy-loaded — they don't appear in the main bundle).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/report/exportPdf.ts src/report/exportDocx.ts
git commit -m "feat(report): add PDF + Word exporters (lazy-imported jspdf and docx)"
```

---

## Task 4: Wire into App.tsx — preview, export buttons, sidebar Raw-data

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css` (minor — sidebar Raw-data styling)

- [ ] **Step 1: Add imports**

In `src/App.tsx`'s import block (next to other local-component imports), add:

```ts
import { buildReport } from './report/buildReport'
import { exportReportPdf } from './report/exportPdf'
import { exportReportDocx } from './report/exportDocx'
import { ReportPreview } from './report/ReportPreview'
```

- [ ] **Step 2: Compute `reportModel` via useMemo**

Find the useMemo block where other analyze/report data is computed (search for `crosstabResult = useMemo`). Add directly below it:

```ts
const reportModel = useMemo(
  () =>
    buildReport({
      projectTitle,
      sources,
      codes,
      excerpts,
      cases,
      attributes,
      attributeValues,
      memos,
    }),
  [projectTitle, sources, codes, excerpts, cases, attributes, attributeValues, memos],
)
```

- [ ] **Step 3: Replace the Report-mode main pane**

Find the `{activeView === 'report' && (` block (around line 3307) that renders `<article className="detail-card report-surface">` with the 6 export-card buttons. Replace the entire block with:

```tsx
{activeView === 'report' && (
  <ReportPreview model={reportModel} />
)}
```

The 6 CSV-export functions (`exportCsv`, `exportCodebookCsv`, `exportCaseSheetCsv`, `exportCaseExcerptCsv`, `exportAnalyzeCsv`, `exportMemosCsv`) stay defined in App.tsx — they just lose this UI surface. The sidebar (Step 5) is the new home.

- [ ] **Step 4: Add Report-mode export buttons to the topbar**

Find the `<div className="detail-toolbar-tools">` block and the `{activeView === 'code' && ...}` Code-selection-button branch within it. Right after the Code-selection branch, add a Report-mode branch:

```tsx
{activeView === 'report' && (
  <>
    <button
      type="button"
      className="primary-button toolbar-code-action"
      onClick={() => void exportReportPdf(reportModel, projectTitle)}
    >
      <Download size={18} aria-hidden="true" />
      Export PDF
    </button>
    <button
      type="button"
      className="primary-button toolbar-code-action"
      onClick={() => void exportReportDocx(reportModel, projectTitle)}
    >
      <FileText size={18} aria-hidden="true" />
      Export Word
    </button>
  </>
)}
```

- [ ] **Step 5: Re-enable the Report sidebar with a Raw-data section**

Phase 3-top-nav hid the sidebar list-view in Report mode. Re-enable it for Report and render Raw-data CSV rows.

Find the `{activeView !== 'organize' && activeView !== 'report' && (` conditional that wraps `<section className="list-view">`. Change it to `activeView !== 'organize' && (` so the sidebar shows in Report mode.

Then find the `<ListView ...>` mount inside that section. Above the `<ListView>`, add:

```tsx
{activeView === 'report' && (
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
)}
```

In Report mode, the ListView is hidden too — wrap the existing `<ListView ... />` with `{activeView !== 'report' && (...)}`:

```tsx
{activeView !== 'report' && (
  <ListView
    activeView={activeView}
    ...
  />
)}
```

- [ ] **Step 6: Append CSS for the Raw-data sidebar block**

Append to `src/App.css`:

```css
/* Report-mode Raw-data sidebar list */
.app-shell[data-shell="new"] .raw-data-panel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-3) var(--s-3) var(--s-2);
}

.app-shell[data-shell="new"] .raw-data-heading {
  color: var(--shell-ink-3);
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 10px;
  margin: 0 0 var(--s-2);
  padding: 0 var(--s-2);
}

.app-shell[data-shell="new"] .raw-data-row {
  display: inline-flex;
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

.app-shell[data-shell="new"] .raw-data-row:hover {
  background: var(--shell-deep);
  color: var(--shell-ink);
}
```

- [ ] **Step 7: Build, lint, test**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. Tests: previous total + 10 (buildReport).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat(report): wire ReportPreview + topbar exports + sidebar Raw-data"
```

---

## Task 5: Manual sanity check + push

- [ ] **Step 1: Dev smoke test**

```bash
npm run dev
```

Sign in to a project that has sources, codes, coded excerpts, cases (with attributes), memos.

1. Switch to Report mode → main pane shows the rendered preview. Cover with stat line; Project memo if present; Codebook with hierarchy; Sample excerpts (≤3 per code, code memos prefacing samples); Cases with attribute key/values + linked source list; Source memos.
2. Empty sub-data is silently skipped (no awkward "No data" placeholders).
3. Sidebar shows "Raw data" with 6 CSV rows. Click each → existing behavior preserved (CSV downloads).
4. Click `Export PDF` (topbar) → file `fieldnote-{slug}-{date}.pdf` downloads. Open in any PDF reader. Multi-page; sections paginated; all 6 sections present; text is selectable (not images).
5. Click `Export Word` → file `fieldnote-{slug}-{date}.docx` downloads. Open in Word / Google Docs / Pages. Editable; section headings styled as Word heading levels.
6. Switch to other modes → sidebar reverts to its mode-appropriate ListView. Detail view stays per-mode as before. No regressions.

Stop the dev server (Ctrl-C).

- [ ] **Step 2: Final lint/build/test**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. All tests pass.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Smoke-test on prod**

Once Vercel finishes the build, open https://fieldnote-seven.vercel.app, sign in, repeat the manual check from Step 1 against prod.

---

## Self-Review

- **Spec coverage:**
  - Cover, project memo, codebook, sample excerpts, cases, source memos sections → Task 1 (builder) + Task 2 (preview).
  - 3-sample-per-code cap → Task 1 with explicit test.
  - Hierarchy depth 0/1 → Task 1 with explicit test.
  - Empty-section skipping → Task 1 (data-level) + Task 2 (component-level conditional render).
  - PDF export → Task 3 (`exportPdf.ts`).
  - Word export → Task 3 (`exportDocx.ts`).
  - Lazy-loaded heavy deps → both exporters use `await import('jspdf')` / `await import('docx')`.
  - Preview replaces main pane → Task 4 step 3.
  - Topbar export buttons → Task 4 step 4.
  - Sidebar Raw-data section → Task 4 step 5 (re-enables sidebar in Report; hides ListView).
  - Existing CSV handlers unchanged → confirmed in Task 4 step 3.

- **Placeholders:** none. Every code block is concrete.

- **Type consistency:** `ReportModel` exported from `buildReport.ts`; consumed unchanged by `ReportPreview.tsx`, `exportPdf.ts`, `exportDocx.ts`. `BuildReportInput` accepts the existing domain types from `src/lib/types.ts`. Filename pattern (`fieldnote-{slug}-{date}.{ext}`) consistent across PDF and Word.

- **Atomic commits:** each task ends with a working `main`. Task 1 ships pure module + tests. Task 2 ships unused component + CSS. Task 3 ships unused exporters + deps. Task 4 wires them. Task 5 verifies + pushes.
