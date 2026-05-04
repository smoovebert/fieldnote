# RAG / "Ask your data" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Fieldnote's RAG / Ask-your-data feature — evidence-finder default with opt-in synthesis, BYOK-only, page-anchored citations, verified-quote highlighting — as a new "Ask" question type in Analyze mode.

**Architecture:** Three new Supabase Edge Functions (`ai-rag-ingest`, `ai-rag-query`, `ai-rag-synthesize`) sibling to the existing `ai-call`, sharing the same JWT-verify-via-service-role pattern. New pgvector-backed `fieldnote_source_chunks` table with three partial HNSW indexes (one per supported embedding dimension). New `fieldnote_rag_asks` audit table. Two pure-function modules — chunker and quote verifier — co-located in a new `supabase/functions/_shared/` directory and aliased into the client via Vite. UI lives in Analyze mode as a new question type alongside Find excerpts.

**Tech Stack:** React 19 + TypeScript + Vite + Supabase Postgres (pgvector) + Supabase Edge Functions (Deno) + per-provider BYOK embeddings (Gemini / OpenAI / Voyage) + per-provider BYOK generation (Gemini / OpenAI / Anthropic).

**Spec:** `docs/superpowers/specs/2026-05-04-rag-ask-your-data-design.md` — read this first. The plan implements that spec; design rationale lives there.

---

## File map

**Created:**

Database
- `supabase/migrations/20260504190000_add_rag_tables.sql`

Shared (new directory — first time the project uses `_shared/`)
- `supabase/functions/_shared/chunker.ts`
- `supabase/functions/_shared/embeddings/gemini.ts`
- `supabase/functions/_shared/embeddings/openai.ts`
- `supabase/functions/_shared/embeddings/voyage.ts`

Edge Functions
- `supabase/functions/ai-rag-ingest/index.ts`
- `supabase/functions/ai-rag-query/index.ts`
- `supabase/functions/ai-rag-synthesize/index.ts`

Client modules
- `src/ai/ragModels.ts`
- `src/ai/pricing.ts`
- `src/ai/rag.ts`
- `src/ai/quoteVerify.ts`
- `src/lib/chunker.ts` (re-export from `_shared/chunker.ts` via Vite alias)

UI
- `src/analyze/panels/AskPanel.tsx`
- `src/analyze/panels/AskIndexBanner.tsx`

Tests
- `src/lib/__tests__/chunker.test.ts`
- `src/lib/__tests__/sourcePages.offsets.test.ts` (new file, additive — leaves existing `sourcePages.test.ts` alone)
- `src/ai/__tests__/quoteVerify.test.ts`
- `src/ai/__tests__/ragModels.test.ts`

**Modified:**

- `src/lib/sourcePages.ts` — extend `SourcePage` with `charStart`, `charEnd`; have `parseSourcePages` track offsets during parse
- `src/lib/types.ts` — extend `SnapshotResults` and `AnalysisSnapshotKind` with `'ask'` variant; add `RagChunkCitation` type
- `src/ai/types.ts` — extend with ask-related types and error reasons
- `src/analyze/queryDefinition.ts` — extend question-type union with `'ask'`
- `src/analyze/AnalyzeSidebar.tsx` — add "Ask" entry under Evidence group
- `src/analyze/AnalyzeInspector.tsx` — handle `'ask'` mode (current-question sentence, Pin, Send to Report)
- `src/components/AiSettingsPanel.tsx` — add embedding-provider select + per-project estimated index cost
- `src/report/ReportPreview.tsx` (or equivalent) — render `'ask'` snapshots
- `src/report/exporters/{pdf,docx,csv,xlsx}.ts` — render `'ask'` snapshots in each export format
- `src/App.tsx` — debounced `embedSourceIfStale` call after source content edit; pass `rag_embedding_model` / `rag_indexed_at` through autosave; route `'ask'` panel in Analyze
- `vite.config.ts` — add `@shared` alias pointing at `supabase/functions/_shared/`
- `tsconfig.json` and `tsconfig.app.json` — mirror the alias for TypeScript path resolution
- `docs/privacy-policy.md` — addendum paragraph (mirrored to `public/privacy-policy.md` via existing symlink)
- `handoff.md` — wave entry under Mode Shell Status when complete

---

## Conventions

- **Test framework:** Vitest. Tests live in `src/<area>/__tests__/<name>.test.ts` per existing pattern.
- **Test commands:** `npm test -- <path>` for a single file; `npm test` for the full suite.
- **Edge Function deploys:** `supabase functions deploy <name>` after each function is complete.
- **Migrations:** apply locally with `supabase db push` (or `supabase db reset` for a clean slate during dev).
- **Commit style:** match recent history — `feat(<area>): <change>` / `test(<area>): <change>` / `refactor(<area>): <change>`. The Task headers below show the message for each commit.
- **TDD discipline:** every code change starts with a failing test where the test framework supports it. Edge Function code (Deno) and React-UI code do not have integration test coverage in this repo per the handoff convention; for those, the verification step is "implement → run dev/deploy → exercise the path manually per spec §11".

---

## Task 0: Database migration — pgvector + RAG tables + project columns

**Files:**
- Create: `supabase/migrations/20260504190000_add_rag_tables.sql`

Spec §"Data model".

- [ ] **Step 0.1: Write the migration**

```sql
-- supabase/migrations/20260504190000_add_rag_tables.sql

-- 1. Enable pgvector. Idempotent.
create extension if not exists vector;

-- 2. New table: source chunks with embeddings.
create table public.fieldnote_source_chunks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.fieldnote_projects(id) on delete cascade,
  source_id       uuid not null,
  foreign key (project_id, source_id)
    references public.fieldnote_sources(project_id, id) on delete cascade,

  chunk_index     int  not null,
  page_number     int,
  char_start      int  not null,
  char_end        int  not null,
  content         text not null,

  embedding_model text not null,
  embedding_dim   int  not null,
  embedding_768   vector(768),
  embedding_1024  vector(1024),
  embedding_1536  vector(1536),

  token_count     int  not null,
  content_hash    text not null,
  created_at      timestamptz not null default now(),
  unique (project_id, source_id, chunk_index)
);

create index fieldnote_source_chunks_project_idx
  on public.fieldnote_source_chunks (project_id);
create index fieldnote_source_chunks_source_idx
  on public.fieldnote_source_chunks (project_id, source_id);

create index fieldnote_chunks_emb_768_idx
  on public.fieldnote_source_chunks
  using hnsw (embedding_768 vector_cosine_ops)
  where embedding_768 is not null;
create index fieldnote_chunks_emb_1024_idx
  on public.fieldnote_source_chunks
  using hnsw (embedding_1024 vector_cosine_ops)
  where embedding_1024 is not null;
create index fieldnote_chunks_emb_1536_idx
  on public.fieldnote_source_chunks
  using hnsw (embedding_1536 vector_cosine_ops)
  where embedding_1536 is not null;

alter table public.fieldnote_source_chunks enable row level security;
revoke all on public.fieldnote_source_chunks from anon, authenticated;

-- 3. New table: ask audit.
create table public.fieldnote_rag_asks (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.fieldnote_projects(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  question           text not null,

  embedding_model    text not null,
  generation_model   text,

  retrieval          jsonb not null,
  synthesis          text,
  quote_audit        jsonb,

  prompt_tokens      int,
  completion_tokens  int,
  estimated_cost_usd numeric(10, 6),
  status             text not null default 'ok',
  failure_reason     text,

  created_at         timestamptz not null default now()
);

create index fieldnote_rag_asks_project_recent_idx
  on public.fieldnote_rag_asks (project_id, created_at desc);

alter table public.fieldnote_rag_asks enable row level security;
revoke all on public.fieldnote_rag_asks from anon, authenticated;

-- 4. Project-level state.
alter table public.fieldnote_projects
  add column rag_embedding_model text,
  add column rag_indexed_at      timestamptz;
```

- [ ] **Step 0.2: Apply locally**

Run: `supabase db push` (or `supabase db reset` if rebuilding).
Expected: migration applied without error; `\d public.fieldnote_source_chunks` and `\d public.fieldnote_rag_asks` show the new tables; `\dx vector` shows the extension; `\d public.fieldnote_projects` shows the two new columns.

- [ ] **Step 0.3: Verify HNSW indexes exist**

```sql
select indexname from pg_indexes
 where tablename = 'fieldnote_source_chunks'
 order by indexname;
```
Expected: includes `fieldnote_chunks_emb_768_idx`, `fieldnote_chunks_emb_1024_idx`, `fieldnote_chunks_emb_1536_idx`.

- [ ] **Step 0.4: Verify RLS lockdown**

```sql
select grantee, privilege_type from information_schema.role_table_grants
 where table_name = 'fieldnote_source_chunks'
   and grantee in ('anon', 'authenticated');
```
Expected: zero rows.

- [ ] **Step 0.5: Commit**

```bash
git add supabase/migrations/20260504190000_add_rag_tables.sql
git commit -m "feat(db): RAG tables (source_chunks, rag_asks) + pgvector"
```

---

## Task 1: Extend `parseSourcePages` with character offsets

**Files:**
- Modify: `src/lib/sourcePages.ts`
- Create: `src/lib/__tests__/sourcePages.offsets.test.ts`

Spec §"Chunking pipeline" — the chunker needs `(charStart, charEnd)` on each page so chunk offsets reconstruct verbatim into the source content.

- [ ] **Step 1.1: Write the failing test**

```ts
// src/lib/__tests__/sourcePages.offsets.test.ts
import { describe, expect, it } from 'vitest'
import { parseSourcePages } from '../sourcePages'

describe('parseSourcePages — offsets', () => {
  it('returns charStart/charEnd that round-trip into content for a simple PDF', () => {
    const content =
      '--- Page 1 ---\n\nfirst page body\n\n--- Page 2 ---\n\nsecond page body\n'
    const pages = parseSourcePages(content)
    expect(pages).toHaveLength(2)
    for (const p of pages) {
      expect(content.slice(p.charStart, p.charEnd)).toBe(p.body)
    }
    expect(pages[0].pageNumber).toBe(1)
    expect(pages[1].pageNumber).toBe(2)
  })

  it('returns charStart=0, charEnd=content.length for a marker-less synthetic single page', () => {
    const content = 'plain transcript with no markers'
    const pages = parseSourcePages(content)
    expect(pages).toHaveLength(1)
    expect(pages[0].charStart).toBe(0)
    expect(pages[0].charEnd).toBe(content.length)
    expect(content.slice(pages[0].charStart, pages[0].charEnd)).toBe(content)
  })

  it('returns charStart/charEnd matching the trimmed body, not the marker', () => {
    const content = '--- Page 1 ---\n\n   alpha   \n\n--- Page 2 ---\n\nbeta'
    const pages = parseSourcePages(content)
    expect(pages[0].body).toBe('alpha')
    expect(content.slice(pages[0].charStart, pages[0].charEnd)).toBe('alpha')
    expect(pages[1].body).toBe('beta')
    expect(content.slice(pages[1].charStart, pages[1].charEnd)).toBe('beta')
  })

  it('returns [] for empty content', () => {
    expect(parseSourcePages('')).toEqual([])
  })
})
```

- [ ] **Step 1.2: Run the test — confirm it fails**

Run: `npm test -- src/lib/__tests__/sourcePages.offsets.test.ts`
Expected: FAIL — `charStart` and `charEnd` are undefined on the returned objects.

- [ ] **Step 1.3: Update `SourcePage` type and `parseSourcePages` to track offsets**

Replace the contents of `src/lib/sourcePages.ts`:

```ts
// src/lib/sourcePages.ts

export type SourcePage = {
  pageNumber: number
  body: string
  charStart: number
  charEnd: number
}

const PAGE_MARKER_GLOBAL = /^---\s*Page\s+(\d+)\s*---\s*$/gm

export function isPdfSource(content: string): boolean {
  PAGE_MARKER_GLOBAL.lastIndex = 0
  return PAGE_MARKER_GLOBAL.test(content)
}

export function parseSourcePages(content: string): SourcePage[] {
  if (!content) return []
  PAGE_MARKER_GLOBAL.lastIndex = 0

  type Marker = { pageNumber: number; markerStart: number; markerEnd: number }
  const markers: Marker[] = []
  let m: RegExpExecArray | null
  while ((m = PAGE_MARKER_GLOBAL.exec(content)) !== null) {
    markers.push({
      pageNumber: Number(m[1]),
      markerStart: m.index,
      markerEnd: m.index + m[0].length,
    })
  }

  if (markers.length === 0) {
    const trimmed = content.trim()
    if (!trimmed) return []
    return [{ pageNumber: 1, body: content, charStart: 0, charEnd: content.length }]
  }

  const pages: SourcePage[] = []
  for (let i = 0; i < markers.length; i++) {
    const cur = markers[i]
    const bodyStartRaw = cur.markerEnd
    const bodyEndRaw = i + 1 < markers.length ? markers[i + 1].markerStart : content.length
    const raw = content.slice(bodyStartRaw, bodyEndRaw)
    const leading = raw.length - raw.trimStart().length
    const trailing = raw.length - raw.trimEnd().length
    const body = raw.slice(leading, raw.length - trailing)
    if (!body) continue
    if (!Number.isFinite(cur.pageNumber) || cur.pageNumber <= 0) continue

    pages.push({
      pageNumber: cur.pageNumber,
      body,
      charStart: bodyStartRaw + leading,
      charEnd: bodyEndRaw - trailing,
    })
  }
  return pages
}
```

Note: the synthetic-page case keeps `body = content` (not trimmed) so the round-trip identity holds. The earlier behavior trimmed the body; consumers that displayed it didn't care about leading/trailing whitespace, but if any do, the chunker will trim per-chunk.

- [ ] **Step 1.4: Run the new tests + the existing sourcePages tests**

Run: `npm test -- src/lib/__tests__/sourcePages`
Expected: both files pass.

- [ ] **Step 1.5: If existing test fails on body-trimming changes**

If `src/lib/__tests__/sourcePages.test.ts` has a case where the body was previously trimmed but the synthetic page is no longer trimmed, update those test expectations to match the new contract OR re-introduce trimming on the synthetic-page body and accept that the round-trip property only holds for PDF pages (in which case `chunker.ts` Task 2 must use the marker-aware path for offsets, never the synthetic-page body).

Recommended: update the existing test if it asserts trimming on the synthetic page; document the offset contract in the type doc.

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/sourcePages.ts src/lib/__tests__/sourcePages.offsets.test.ts src/lib/__tests__/sourcePages.test.ts
git commit -m "feat(sources): track charStart/charEnd in parseSourcePages"
```

---

## Task 2: Shared chunker module + Vite alias

**Files:**
- Create: `supabase/functions/_shared/chunker.ts`
- Create: `src/lib/chunker.ts` (re-export)
- Create: `src/lib/__tests__/chunker.test.ts`
- Modify: `vite.config.ts` (alias `@shared`)
- Modify: `tsconfig.json` and `tsconfig.app.json` (mirror alias)

Spec §"Chunking pipeline".

- [ ] **Step 2.1: Add the Vite alias**

Modify `vite.config.ts` — add to the `resolve.alias` object (create the section if absent):

```ts
import path from 'node:path'
// inside defineConfig({ ... }):
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, 'supabase/functions/_shared'),
  },
},
```

- [ ] **Step 2.2: Mirror the alias in TypeScript**

In `tsconfig.app.json` (and `tsconfig.json` if it has its own `paths`), add to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["supabase/functions/_shared/*"]
    }
  }
}
```

- [ ] **Step 2.3: Write the failing test**

```ts
// src/lib/__tests__/chunker.test.ts
import { describe, expect, it } from 'vitest'
import { chunkSource } from '../chunker'

describe('chunkSource — non-PDF', () => {
  it('returns [] for empty content', async () => {
    expect(await chunkSource({ content: '' })).toEqual([])
  })

  it('packs paragraphs into a single chunk under target', async () => {
    const content = 'short paragraph one.\n\nshort paragraph two.'
    const chunks = await chunkSource({ content }, { targetTokens: 600, maxTokens: 1200 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].pageNumber).toBeNull()
    expect(content.slice(chunks[0].charStart, chunks[0].charEnd)).toBe(chunks[0].content)
    expect(chunks[0].chunkIndex).toBe(0)
  })

  it('splits across paragraphs when target exceeded', async () => {
    const para = (n: number) => `paragraph ${n} ` + 'word '.repeat(20)
    const content = `${para(1)}\n\n${para(2)}\n\n${para(3)}`
    const chunks = await chunkSource({ content }, { targetTokens: 20, maxTokens: 60 })
    expect(chunks.length).toBeGreaterThanOrEqual(3)
    chunks.forEach((c, i) => {
      expect(c.chunkIndex).toBe(i)
      expect(c.pageNumber).toBeNull()
      expect(content.slice(c.charStart, c.charEnd)).toBe(c.content)
    })
  })

  it('drops content under the 20-char floor', async () => {
    expect(await chunkSource({ content: 'hi' })).toEqual([])
  })
})

describe('chunkSource — PDF', () => {
  it('emits one chunk per page for short pages', async () => {
    const content =
      '--- Page 1 ---\n\nshort first page content here.\n\n' +
      '--- Page 2 ---\n\nshort second page content here.'
    const chunks = await chunkSource({ content })
    expect(chunks).toHaveLength(2)
    expect(chunks[0].pageNumber).toBe(1)
    expect(chunks[1].pageNumber).toBe(2)
    chunks.forEach((c) => {
      expect(content.slice(c.charStart, c.charEnd)).toBe(c.content)
    })
  })

  it('splits an oversized page on paragraph boundaries, all sub-chunks share pageNumber', async () => {
    const para = 'x '.repeat(200)
    const bigPage = `${para}\n\n${para}\n\n${para}\n\n${para}`
    const content = `--- Page 1 ---\n\n${bigPage}`
    const chunks = await chunkSource({ content }, { targetTokens: 100, maxTokens: 150 })
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    chunks.forEach((c) => expect(c.pageNumber).toBe(1))
    chunks.forEach((c) => {
      expect(content.slice(c.charStart, c.charEnd)).toBe(c.content)
    })
  })
})

describe('chunkSource — round-trip property', () => {
  it('every chunk content equals source.content.slice(charStart, charEnd)', async () => {
    const seeds = [
      'plain transcript with no markers but some\n\nparagraph breaks.',
      '--- Page 1 ---\n\nalpha\n\n--- Page 2 ---\n\nbeta gamma delta epsilon zeta',
      '--- Page 1 ---\n\n' + 'word '.repeat(500),
    ]
    for (const content of seeds) {
      const chunks = await chunkSource({ content })
      for (const c of chunks) {
        expect(content.slice(c.charStart, c.charEnd)).toBe(c.content)
      }
    }
  })
})
```

- [ ] **Step 2.4: Run the test — confirm it fails (module missing)**

Run: `npm test -- src/lib/__tests__/chunker.test.ts`
Expected: FAIL — `Cannot find module '../chunker'`.

- [ ] **Step 2.5: Implement the shared chunker**

```ts
// supabase/functions/_shared/chunker.ts

const PAGE_MARKER_GLOBAL = /^---\s*Page\s+(\d+)\s*---\s*$/gm
const MIN_CONTENT_CHARS = 20

export type Chunk = {
  chunkIndex: number
  pageNumber: number | null
  charStart: number
  charEnd: number
  content: string
  tokenCount: number
  contentHash: string
}

export type ChunkOpts = {
  targetTokens?: number
  maxTokens?: number
}

const DEFAULT_TARGET = 600
const DEFAULT_MAX = 1200

export function approxTokenCount(s: string): number {
  return Math.ceil(s.length / 4)
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

type PageRef = { pageNumber: number | null; charStart: number; charEnd: number; body: string }

function isPdfContent(content: string): boolean {
  PAGE_MARKER_GLOBAL.lastIndex = 0
  return PAGE_MARKER_GLOBAL.test(content)
}

function parsePageRefs(content: string): PageRef[] {
  if (isPdfContent(content)) {
    PAGE_MARKER_GLOBAL.lastIndex = 0
    const refs: PageRef[] = []
    type Marker = { pageNumber: number; markerStart: number; markerEnd: number }
    const markers: Marker[] = []
    let m: RegExpExecArray | null
    while ((m = PAGE_MARKER_GLOBAL.exec(content)) !== null) {
      markers.push({ pageNumber: Number(m[1]), markerStart: m.index, markerEnd: m.index + m[0].length })
    }
    for (let i = 0; i < markers.length; i++) {
      const cur = markers[i]
      const bodyStartRaw = cur.markerEnd
      const bodyEndRaw = i + 1 < markers.length ? markers[i + 1].markerStart : content.length
      const raw = content.slice(bodyStartRaw, bodyEndRaw)
      const leading = raw.length - raw.trimStart().length
      const trailing = raw.length - raw.trimEnd().length
      const body = raw.slice(leading, raw.length - trailing)
      if (!body) continue
      refs.push({ pageNumber: cur.pageNumber, charStart: bodyStartRaw + leading, charEnd: bodyEndRaw - trailing, body })
    }
    return refs
  }
  const trimmed = content.trim()
  if (!trimmed) return []
  return [{ pageNumber: null, charStart: 0, charEnd: content.length, body: content }]
}

function packParagraphs(
  body: string,
  bodyCharStart: number,
  pageNumber: number | null,
  startChunkIndex: number,
  targetTokens: number,
): Array<Omit<Chunk, 'contentHash'>> {
  const out: Array<Omit<Chunk, 'contentHash'>> = []
  type Para = { text: string; charStart: number; charEnd: number }
  const paras: Para[] = []
  const paraSplit = /\n\n+/g
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = paraSplit.exec(body)) !== null) {
    if (m.index > lastEnd) {
      paras.push({ text: body.slice(lastEnd, m.index), charStart: bodyCharStart + lastEnd, charEnd: bodyCharStart + m.index })
    }
    lastEnd = m.index + m[0].length
  }
  if (lastEnd < body.length) {
    paras.push({ text: body.slice(lastEnd), charStart: bodyCharStart + lastEnd, charEnd: bodyCharStart + body.length })
  }

  let buf: Para[] = []
  let bufTokens = 0
  let chunkIndex = startChunkIndex
  const flush = () => {
    if (buf.length === 0) return
    const charStart = buf[0].charStart
    const charEnd = buf[buf.length - 1].charEnd
    const rel = charStart - bodyCharStart
    const relEnd = charEnd - bodyCharStart
    const content = body.slice(rel, relEnd)
    if (content.trim().length >= MIN_CONTENT_CHARS) {
      out.push({
        chunkIndex,
        pageNumber,
        charStart,
        charEnd,
        content,
        tokenCount: approxTokenCount(content),
      })
      chunkIndex++
    }
    buf = []
    bufTokens = 0
  }
  for (const p of paras) {
    const t = approxTokenCount(p.text)
    if (bufTokens > 0 && bufTokens + t > targetTokens) flush()
    buf.push(p)
    bufTokens += t
  }
  flush()
  return out
}

export async function chunkSource(
  source: { content: string },
  opts?: ChunkOpts,
): Promise<Chunk[]> {
  const targetTokens = opts?.targetTokens ?? DEFAULT_TARGET
  const maxTokens = opts?.maxTokens ?? DEFAULT_MAX
  const refs = parsePageRefs(source.content)
  const result: Chunk[] = []
  let nextIndex = 0
  for (const r of refs) {
    const t = approxTokenCount(r.body)
    if (t <= maxTokens) {
      if (r.body.trim().length < MIN_CONTENT_CHARS) continue
      result.push({
        chunkIndex: nextIndex++,
        pageNumber: r.pageNumber,
        charStart: r.charStart,
        charEnd: r.charEnd,
        content: r.body,
        tokenCount: t,
        contentHash: '',
      })
    } else {
      const subs = packParagraphs(r.body, r.charStart, r.pageNumber, nextIndex, targetTokens)
      for (const s of subs) {
        result.push({ ...s, contentHash: '' })
      }
      nextIndex = result.length
    }
  }
  for (const c of result) {
    c.contentHash = await sha256Hex(c.content)
  }
  return result
}
```

- [ ] **Step 2.6: Create the client re-export**

```ts
// src/lib/chunker.ts
export * from '@shared/chunker'
```

- [ ] **Step 2.7: Run the chunker tests**

Run: `npm test -- src/lib/__tests__/chunker.test.ts`
Expected: PASS — all four describe blocks. The round-trip property test exercises the most important invariant.

- [ ] **Step 2.8: Run the full test suite to confirm no regressions**

Run: `npm test`
Expected: PASS, including all existing `__tests__/`.

- [ ] **Step 2.9: Commit**

```bash
git add supabase/functions/_shared/chunker.ts src/lib/chunker.ts src/lib/__tests__/chunker.test.ts vite.config.ts tsconfig.json tsconfig.app.json
git commit -m "feat(rag): structure-aware chunker (PDF page-per-chunk + paragraph packing)"
```

---

## Task 3: RAG model constants + pricing module

**Files:**
- Create: `src/ai/ragModels.ts`
- Create: `src/ai/pricing.ts`
- Create: `src/ai/__tests__/ragModels.test.ts`

Spec §"Generation model per provider" + §"Embedding model per provider".

- [ ] **Step 3.1: Write the failing test**

```ts
// src/ai/__tests__/ragModels.test.ts
import { describe, expect, it } from 'vitest'
import { EMBEDDING_MODELS, GENERATION_MODELS, embeddingDimFor, embeddingColumnFor } from '../ragModels'

describe('EMBEDDING_MODELS', () => {
  it('includes all three providers with non-overlapping dimensions', () => {
    expect(EMBEDDING_MODELS.gemini.dim).toBe(768)
    expect(EMBEDDING_MODELS.openai.dim).toBe(1536)
    expect(EMBEDDING_MODELS.voyage.dim).toBe(1024)
  })
})

describe('embeddingDimFor', () => {
  it('maps a model name to its dim', () => {
    expect(embeddingDimFor(EMBEDDING_MODELS.gemini.name)).toBe(768)
    expect(embeddingDimFor(EMBEDDING_MODELS.openai.name)).toBe(1536)
    expect(embeddingDimFor(EMBEDDING_MODELS.voyage.name)).toBe(1024)
  })
  it('throws on unknown model', () => {
    expect(() => embeddingDimFor('mystery-model-v9')).toThrow()
  })
})

describe('embeddingColumnFor', () => {
  it('returns the literal SQL column name for the project dim', () => {
    expect(embeddingColumnFor(768)).toBe('embedding_768')
    expect(embeddingColumnFor(1024)).toBe('embedding_1024')
    expect(embeddingColumnFor(1536)).toBe('embedding_1536')
  })
  it('throws on unknown dim', () => {
    expect(() => embeddingColumnFor(512 as 768)).toThrow()
  })
})

describe('GENERATION_MODELS', () => {
  it('has exactly three providers', () => {
    expect(Object.keys(GENERATION_MODELS).sort()).toEqual(['anthropic', 'gemini', 'openai'])
  })
})
```

- [ ] **Step 3.2: Run test — confirm fail**

Run: `npm test -- src/ai/__tests__/ragModels.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3.3: Implement the model constants**

```ts
// src/ai/ragModels.ts

export type EmbeddingProviderId = 'gemini' | 'openai' | 'voyage'
export type GenerationProviderId = 'gemini' | 'openai' | 'anthropic'

export const EMBEDDING_MODELS: Record<EmbeddingProviderId, { name: string; dim: 768 | 1024 | 1536 }> = {
  gemini: { name: 'text-embedding-004', dim: 768 },
  openai: { name: 'text-embedding-3-small', dim: 1536 },
  voyage: { name: 'voyage-3', dim: 1024 },
}

export const GENERATION_MODELS: Record<GenerationProviderId, string> = {
  gemini: 'gemini-2.5-pro',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
}

const MODEL_TO_DIM = new Map<string, 768 | 1024 | 1536>()
for (const m of Object.values(EMBEDDING_MODELS)) {
  MODEL_TO_DIM.set(m.name, m.dim)
}

export function embeddingDimFor(modelName: string): 768 | 1024 | 1536 {
  const dim = MODEL_TO_DIM.get(modelName)
  if (!dim) throw new Error(`Unknown embedding model: ${modelName}`)
  return dim
}

export function embeddingColumnFor(dim: 768 | 1024 | 1536): 'embedding_768' | 'embedding_1024' | 'embedding_1536' {
  switch (dim) {
    case 768: return 'embedding_768'
    case 1024: return 'embedding_1024'
    case 1536: return 'embedding_1536'
    default: throw new Error(`Unknown embedding dim: ${dim}`)
  }
}

export function embeddingProviderFor(modelName: string): EmbeddingProviderId {
  for (const [pid, m] of Object.entries(EMBEDDING_MODELS)) {
    if (m.name === modelName) return pid as EmbeddingProviderId
  }
  throw new Error(`Unknown embedding model: ${modelName}`)
}
```

- [ ] **Step 3.4: Implement the pricing module**

```ts
// src/ai/pricing.ts

import type { EmbeddingProviderId } from './ragModels'

export const EMBEDDING_PRICE_USD_PER_M_TOKENS: Record<EmbeddingProviderId, number> = {
  gemini: 0.00,
  openai: 0.02,
  voyage: 0.06,
}

export function estimateEmbeddingCostUsd(tokens: number, provider: EmbeddingProviderId): number {
  return (tokens / 1_000_000) * EMBEDDING_PRICE_USD_PER_M_TOKENS[provider]
}
```

- [ ] **Step 3.5: Run test, confirm pass**

Run: `npm test -- src/ai/__tests__/ragModels.test.ts`
Expected: PASS.

- [ ] **Step 3.6: Commit**

```bash
git add src/ai/ragModels.ts src/ai/pricing.ts src/ai/__tests__/ragModels.test.ts
git commit -m "feat(rag): model + pricing constants"
```

---

## Task 4: Quote verification module

**Files:**
- Create: `src/ai/quoteVerify.ts`
- Create: `src/ai/__tests__/quoteVerify.test.ts`

Spec §"Synthesis + quote verification".

- [ ] **Step 4.1: Write the failing test**

```ts
// src/ai/__tests__/quoteVerify.test.ts
import { describe, expect, it } from 'vitest'
import { verifyQuotes, normalizeForMatch } from '../quoteVerify'

const chunks = [
  { id: 'c1', content: 'I waited three weeks for a callback from the office.' },
  { id: 'c2', content: 'Nobody told us the form had moved to the new portal.' },
]

describe('normalizeForMatch', () => {
  it('collapses whitespace, normalizes curly quotes and dashes, lowercases', () => {
    expect(normalizeForMatch('“Foo—bar  baz”')).toBe('"foo-bar baz"')
  })
})

describe('verifyQuotes', () => {
  it('marks a verbatim straight-quoted span as verified when [N] points at the matching chunk', () => {
    const synthesis = 'Participants describe waiting: "I waited three weeks for a callback" [1].'
    const audit = verifyQuotes(synthesis, chunks)
    expect(audit).toHaveLength(1)
    expect(audit[0].verified).toBe(true)
    expect(audit[0].matchedChunkId).toBe('c1')
  })

  it('matches across smart-quote and dash variants', () => {
    const synthesis = 'A participant said, “I waited three weeks for a callback” [1].'
    const audit = verifyQuotes(synthesis, chunks)
    expect(audit[0].verified).toBe(true)
  })

  it('marks a fabricated quote as unverified', () => {
    const synthesis = 'A participant said: "I sent the form by fax" [1].'
    const audit = verifyQuotes(synthesis, chunks)
    expect(audit[0].verified).toBe(false)
    expect(audit[0].matchedChunkId).toBeNull()
  })

  it('considers all citations within ~30 chars after the close quote', () => {
    const synthesis = 'Two voices align: "Nobody told us the form had moved" [1][2].'
    const audit = verifyQuotes(synthesis, chunks)
    expect(audit[0].verified).toBe(true)
    expect(audit[0].matchedChunkId).toBe('c2')
  })

  it('returns [] when no quoted spans appear', () => {
    expect(verifyQuotes('Plain prose with no quotes [1].', chunks)).toEqual([])
  })

  it('quote with no nearby citation falls back to scanning all chunks', () => {
    const synthesis = '"I waited three weeks for a callback" — clearly a strong theme.'
    const audit = verifyQuotes(synthesis, chunks)
    expect(audit[0].verified).toBe(true)
    expect(audit[0].matchedChunkId).toBe('c1')
  })
})
```

- [ ] **Step 4.2: Run — confirm fail**

Run: `npm test -- src/ai/__tests__/quoteVerify.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 4.3: Implement `quoteVerify.ts`**

```ts
// src/ai/quoteVerify.ts

const QUOTE_OPEN_CLOSE: Array<[string, string]> = [
  ['"', '"'],
  ['“', '”'],
  ['‟', '”'],
]

const CITATION_PATTERN = /\[(\d+)\]/g

export type QuoteAudit = {
  spanStart: number
  spanEnd: number
  verified: boolean
  matchedChunkId: string | null
}

export function normalizeForMatch(s: string): string {
  return s
    .replace(/[“”‟]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

type ChunkRef = { id: string; content: string }

function findQuotedSpans(synthesis: string): Array<{ start: number; end: number; quote: string }> {
  const spans: Array<{ start: number; end: number; quote: string }> = []
  let i = 0
  while (i < synthesis.length) {
    const ch = synthesis[i]
    let pair: [string, string] | null = null
    for (const [o, c] of QUOTE_OPEN_CLOSE) {
      if (ch === o) { pair = [o, c]; break }
    }
    if (!pair) { i++; continue }
    const close = synthesis.indexOf(pair[1], i + 1)
    if (close < 0) break
    spans.push({ start: i, end: close + 1, quote: synthesis.slice(i + 1, close) })
    i = close + 1
  }
  return spans
}

function citationsNear(synthesis: string, fromIndex: number, windowChars = 30): number[] {
  const slice = synthesis.slice(fromIndex, Math.min(synthesis.length, fromIndex + windowChars))
  const out: number[] = []
  let m: RegExpExecArray | null
  CITATION_PATTERN.lastIndex = 0
  while ((m = CITATION_PATTERN.exec(slice)) !== null) {
    out.push(Number(m[1]))
  }
  return out
}

export function verifyQuotes(synthesis: string, evidence: ChunkRef[]): QuoteAudit[] {
  const spans = findQuotedSpans(synthesis)
  const audits: QuoteAudit[] = []
  for (const span of spans) {
    const normQuote = normalizeForMatch(span.quote)
    const targets = citationsNear(synthesis, span.end)
    const candidateIds = targets.length > 0
      ? targets.map((n) => evidence[n - 1]?.id).filter((x): x is string => !!x)
      : evidence.map((e) => e.id)
    let matched: string | null = null
    for (const id of candidateIds) {
      const chunk = evidence.find((e) => e.id === id)
      if (!chunk) continue
      if (normalizeForMatch(chunk.content).includes(normQuote)) {
        matched = id
        break
      }
    }
    audits.push({
      spanStart: span.start,
      spanEnd: span.end,
      verified: matched !== null,
      matchedChunkId: matched,
    })
  }
  return audits
}
```

- [ ] **Step 4.4: Run, confirm pass**

Run: `npm test -- src/ai/__tests__/quoteVerify.test.ts`
Expected: PASS.

- [ ] **Step 4.5: Commit**

```bash
git add src/ai/quoteVerify.ts src/ai/__tests__/quoteVerify.test.ts
git commit -m "feat(rag): quote verification post-process for synthesis"
```

---

## Task 5: RAG types + browser client wrapper

**Files:**
- Modify: `src/ai/types.ts`
- Modify: `src/lib/types.ts`
- Create: `src/ai/rag.ts`

- [ ] **Step 5.1: Extend `src/ai/types.ts` with RAG result types**

Append to `src/ai/types.ts`:

```ts
// Added 2026-05-04: RAG / Ask.

export type RagChunkCitation = {
  chunkId: string
  sourceId: string
  sourceTitle: string
  pageNumber: number | null
  charStart: number
  charEnd: number
  text: string
  score: number
}

export type AskEvidenceResult =
  | { ok: true; askId: string; embeddingModel: string; chunks: RagChunkCitation[] }
  | { ok: false; reason: AiCallErrorReason | 'not-indexed' | 'dim-mismatch' | 'no-key'; message: string }

export type QuoteAuditEntry = {
  spanStart: number
  spanEnd: number
  verified: boolean
  matchedChunkId: string | null
}

export type AskSynthesizeResult =
  | { ok: true; askId: string; synthesis: string; quoteAudit: QuoteAuditEntry[]; generationModel: string; usage: AiUsage }
  | { ok: false; reason: AiCallErrorReason; message: string }

export type IngestResult =
  | { ok: true; chunksAdded: number; chunksUpdated: number; chunksDeleted: number; tokens: number }
  | { ok: false; reason: AiCallErrorReason | 'no-key' | 'not-indexed-yet' | 'dim-mismatch'; message: string }
```

- [ ] **Step 5.2: Extend `src/lib/types.ts` snapshot union**

Find the `AnalysisSnapshotKind` union and the `SnapshotResults` discriminated union. Add `'ask'`:

```ts
export type AnalysisSnapshotKind =
  | 'coded_excerpt'
  | 'matrix'
  | 'frequency'
  | 'cooccurrence'
  | 'crosstab'
  | 'ask'

// In SnapshotResults union, add:
| { kind: 'ask'
    question: string
    synthesis: string | null
    quoteAudit: Array<{ spanStart: number; spanEnd: number; verified: boolean; matchedChunkId: string | null }>
    evidence: Array<{
      sourceId: string
      sourceTitle: string
      pageNumber: number | null
      charStart: number
      charEnd: number
      text: string
      score: number
    }>
    embeddingModel: string
    generationModel: string | null
  }
```

- [ ] **Step 5.3: Implement the browser client**

```ts
// src/ai/rag.ts

import { supabase } from '../lib/supabase'
import type { AskEvidenceResult, AskSynthesizeResult, IngestResult } from './types'

const FUNCTIONS_BASE = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '') + '/functions/v1'

async function bearerToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function embedSourceIfStale(input: { projectId: string; sourceId: string }): Promise<IngestResult> {
  const token = await bearerToken()
  if (!token) return { ok: false, reason: 'auth', message: 'Not signed in.' }
  let res: Response
  try {
    res = await fetch(`${FUNCTIONS_BASE}/ai-rag-ingest`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch (e) {
    return { ok: false, reason: 'network', message: e instanceof Error ? e.message : 'Network error' }
  }
  return await res.json() as IngestResult
}

export async function reindexProject(input: { projectId: string }): Promise<IngestResult> {
  const token = await bearerToken()
  if (!token) return { ok: false, reason: 'auth', message: 'Not signed in.' }
  const res = await fetch(`${FUNCTIONS_BASE}/ai-rag-ingest`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, mode: 'reindex' }),
  })
  return await res.json() as IngestResult
}

export async function askEvidence(input: { projectId: string; question: string }): Promise<AskEvidenceResult> {
  const token = await bearerToken()
  if (!token) return { ok: false, reason: 'auth', message: 'Not signed in.' }
  const res = await fetch(`${FUNCTIONS_BASE}/ai-rag-query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return await res.json() as AskEvidenceResult
}

export async function askSynthesize(input: { askId: string; includedChunkIds: string[] }): Promise<AskSynthesizeResult> {
  const token = await bearerToken()
  if (!token) return { ok: false, reason: 'auth', message: 'Not signed in.' }
  const res = await fetch(`${FUNCTIONS_BASE}/ai-rag-synthesize`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  return await res.json() as AskSynthesizeResult
}
```

- [ ] **Step 5.4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — types unify across `src/ai/types.ts`, `src/lib/types.ts`, and `src/ai/rag.ts`.

- [ ] **Step 5.5: Commit**

```bash
git add src/ai/types.ts src/lib/types.ts src/ai/rag.ts
git commit -m "feat(rag): types + browser client wrappers"
```

---

## Task 6: Embedding provider adapters (shared)

**Files:**
- Create: `supabase/functions/_shared/embeddings/gemini.ts`
- Create: `supabase/functions/_shared/embeddings/openai.ts`
- Create: `supabase/functions/_shared/embeddings/voyage.ts`

Spec §"Embedding model per provider". Pattern mirrors `supabase/functions/ai-call/providers/*.ts`. Each adapter takes `(apiKey, model, texts: string[])` and returns `{ embeddings: number[][], promptTokens: number }`.

- [ ] **Step 6.1: Gemini adapter**

```ts
// supabase/functions/_shared/embeddings/gemini.ts
export type EmbeddingResponse = {
  embeddings: number[][]
  promptTokens: number
}

export async function embedGemini(input: { apiKey: string; model: string; texts: string[] }): Promise<EmbeddingResponse> {
  if (input.texts.length === 0) return { embeddings: [], promptTokens: 0 }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:batchEmbedContents?key=${encodeURIComponent(input.apiKey)}`
  const body = {
    requests: input.texts.map((t) => ({
      model: `models/${input.model}`,
      content: { parts: [{ text: t }] },
    })),
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const embeddings: number[][] = (json?.embeddings ?? []).map((e: any) => e.values)
  const promptTokens = Math.ceil(input.texts.reduce((n, t) => n + t.length, 0) / 4)
  return { embeddings, promptTokens }
}
```

- [ ] **Step 6.2: OpenAI adapter**

```ts
// supabase/functions/_shared/embeddings/openai.ts
import type { EmbeddingResponse } from './gemini.ts'

export async function embedOpenAI(input: { apiKey: string; model: string; texts: string[] }): Promise<EmbeddingResponse> {
  if (input.texts.length === 0) return { embeddings: [], promptTokens: 0 }
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { authorization: `Bearer ${input.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: input.model, input: input.texts }),
  })
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const embeddings: number[][] = (json?.data ?? []).map((d: any) => d.embedding)
  const promptTokens = json?.usage?.total_tokens ?? Math.ceil(input.texts.reduce((n, t) => n + t.length, 0) / 4)
  return { embeddings, promptTokens }
}
```

- [ ] **Step 6.3: Voyage adapter**

```ts
// supabase/functions/_shared/embeddings/voyage.ts
import type { EmbeddingResponse } from './gemini.ts'

export async function embedVoyage(input: { apiKey: string; model: string; texts: string[]; inputType?: 'document' | 'query' }): Promise<EmbeddingResponse> {
  if (input.texts.length === 0) return { embeddings: [], promptTokens: 0 }
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { authorization: `Bearer ${input.apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: input.model,
      input: input.texts,
      input_type: input.inputType ?? 'document',
    }),
  })
  if (!res.ok) throw new Error(`Voyage embed ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const embeddings: number[][] = (json?.data ?? []).map((d: any) => d.embedding)
  const promptTokens = json?.usage?.total_tokens ?? Math.ceil(input.texts.reduce((n, t) => n + t.length, 0) / 4)
  return { embeddings, promptTokens }
}
```

- [ ] **Step 6.4: Commit**

```bash
git add supabase/functions/_shared/embeddings/
git commit -m "feat(rag): embedding provider adapters (Gemini, OpenAI, Voyage)"
```

---

## Task 7: Edge Function `ai-rag-ingest`

**Files:**
- Create: `supabase/functions/ai-rag-ingest/index.ts`
- Create: `supabase/migrations/20260504190100_advisory_lock_text_wrapper.sql`

Spec §"Ingestion entrypoint". Mirrors the JWT-verify-via-service-role pattern from `supabase/functions/ai-call/index.ts`.

- [ ] **Step 7.1: Implement the function**

```ts
// supabase/functions/ai-rag-ingest/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { chunkSource, type Chunk } from '../_shared/chunker.ts'
import { embedGemini } from '../_shared/embeddings/gemini.ts'
import { embedOpenAI } from '../_shared/embeddings/openai.ts'
import { embedVoyage } from '../_shared/embeddings/voyage.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_SECRET = Deno.env.get('AI_KEY_ENCRYPTION_SECRET') ?? ''
const ALL_KILL = Deno.env.get('ALL_AI_KILL_SWITCH') === '1'

const BATCH_SIZE = 100

const EMBEDDING_MODELS = {
  gemini: { name: 'text-embedding-004', dim: 768 },
  openai: { name: 'text-embedding-3-small', dim: 1536 },
  voyage: { name: 'voyage-3', dim: 1024 },
} as const
type EmbProvider = keyof typeof EMBEDDING_MODELS

function embeddingColumnFor(dim: number): 'embedding_768' | 'embedding_1024' | 'embedding_1536' {
  if (dim === 768) return 'embedding_768'
  if (dim === 1024) return 'embedding_1024'
  if (dim === 1536) return 'embedding_1536'
  throw new Error(`Unknown embedding dim: ${dim}`)
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' } })
  }
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, reason: 'method', message: 'POST only' })
  if (ALL_KILL) return jsonResponse(503, { ok: false, reason: 'kill-switch-all', message: 'AI features temporarily disabled.' })

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Missing bearer token' })
  const userJwt = auth.slice('Bearer '.length)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await supabase.auth.getUser(userJwt)
  if (userErr || !userData.user) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Invalid session' })
  const userId = userData.user.id

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { ok: false, reason: 'parse', message: 'Body is not JSON' }) }
  const projectId = String(body?.projectId ?? '')
  const sourceId = body?.sourceId ? String(body.sourceId) : null
  const mode = body?.mode === 'reindex' ? 'reindex' : 'incremental'
  if (!projectId) return jsonResponse(400, { ok: false, reason: 'input', message: 'projectId required' })

  const { data: project, error: projectErr } = await supabase
    .from('fieldnote_projects')
    .select('id, owner_id, rag_embedding_model')
    .eq('id', projectId)
    .maybeSingle()
  if (projectErr || !project) return jsonResponse(404, { ok: false, reason: 'input', message: 'Project not found' })
  if (project.owner_id !== userId) return jsonResponse(403, { ok: false, reason: 'auth', message: 'Not your project' })

  const { data: settings } = await supabase
    .from('fieldnote_user_settings')
    .select('encrypted_keys')
    .eq('user_id', userId)
    .maybeSingle()
  const encrypted = settings?.encrypted_keys ?? {}

  let modelName = project.rag_embedding_model as string | null
  if (!modelName) {
    if (encrypted.gemini) modelName = EMBEDDING_MODELS.gemini.name
    else if (encrypted.openai) modelName = EMBEDDING_MODELS.openai.name
    else if (encrypted.voyage) modelName = EMBEDDING_MODELS.voyage.name
  }
  if (!modelName) return jsonResponse(400, { ok: false, reason: 'no-key', message: 'No embedding-capable key saved.' })
  const provider = (Object.entries(EMBEDDING_MODELS).find(([, m]) => m.name === modelName)?.[0] ?? null) as EmbProvider | null
  if (!provider) return jsonResponse(400, { ok: false, reason: 'dim-mismatch', message: `Unknown embedding model on project: ${modelName}` })
  const dim = EMBEDDING_MODELS[provider].dim

  const ciphertext = encrypted[provider]
  if (!ciphertext) return jsonResponse(400, { ok: false, reason: 'no-key', message: `No ${provider} key saved.` })
  const { data: decrypted } = await supabase.rpc('ai_key_decrypt', { p_ciphertext_b64: ciphertext, p_secret: ENCRYPTION_SECRET })
  if (!decrypted) return jsonResponse(500, { ok: false, reason: 'decrypt', message: 'Could not decrypt key' })
  const apiKey = String(decrypted)

  let sources: Array<{ id: string; content: string }> = []
  if (mode === 'reindex' || !sourceId) {
    const { data } = await supabase
      .from('fieldnote_sources')
      .select('id, content, archived')
      .eq('project_id', projectId)
      .eq('archived', false)
    sources = (data ?? []).map((r: any) => ({ id: r.id, content: r.content }))
    if (mode === 'reindex') {
      await supabase.from('fieldnote_source_chunks').delete().eq('project_id', projectId)
    }
  } else {
    const { data: src } = await supabase
      .from('fieldnote_sources')
      .select('id, content')
      .eq('project_id', projectId)
      .eq('id', sourceId)
      .maybeSingle()
    if (!src) return jsonResponse(404, { ok: false, reason: 'input', message: 'Source not found' })
    sources = [{ id: src.id, content: src.content }]
  }

  let chunksAdded = 0, chunksUpdated = 0, chunksDeleted = 0, totalTokens = 0

  for (const source of sources) {
    const lockKey = source.id
    const { data: lockData } = await supabase.rpc('rag_try_advisory_lock_text', { lock_key: lockKey }).maybeSingle()
    if (lockData && lockData.locked === false) continue

    const newChunks = await chunkSource(source, { targetTokens: 600, maxTokens: 1200 })
    const { data: existing } = await supabase
      .from('fieldnote_source_chunks')
      .select('chunk_index, content_hash')
      .eq('project_id', projectId)
      .eq('source_id', source.id)
    const existingByIdx = new Map<number, string>(((existing ?? []) as any[]).map((r) => [r.chunk_index, r.content_hash]))

    const toUpsert: Chunk[] = []
    const toDeleteIdx: number[] = []
    const newIdxSet = new Set(newChunks.map((c) => c.chunkIndex))

    for (const c of newChunks) {
      if (existingByIdx.get(c.chunkIndex) !== c.contentHash) toUpsert.push(c)
    }
    for (const idx of existingByIdx.keys()) {
      if (!newIdxSet.has(idx)) toDeleteIdx.push(idx)
    }

    if (toDeleteIdx.length) {
      await supabase.from('fieldnote_source_chunks').delete()
        .eq('project_id', projectId).eq('source_id', source.id)
        .in('chunk_index', toDeleteIdx)
      chunksDeleted += toDeleteIdx.length
    }

    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
      const batch = toUpsert.slice(i, i + BATCH_SIZE)
      const texts = batch.map((c) => c.content)
      let embeds
      if (provider === 'gemini')      embeds = await embedGemini({ apiKey, model: modelName, texts })
      else if (provider === 'openai') embeds = await embedOpenAI({ apiKey, model: modelName, texts })
      else                            embeds = await embedVoyage({ apiKey, model: modelName, texts, inputType: 'document' })
      totalTokens += embeds.promptTokens

      const column = embeddingColumnFor(dim)
      const rows = batch.map((c, j) => ({
        project_id: projectId,
        source_id: source.id,
        chunk_index: c.chunkIndex,
        page_number: c.pageNumber,
        char_start: c.charStart,
        char_end: c.charEnd,
        content: c.content,
        embedding_model: modelName,
        embedding_dim: dim,
        [column]: embeds.embeddings[j],
        token_count: c.tokenCount,
        content_hash: c.contentHash,
      }))
      const { error: upErr } = await supabase
        .from('fieldnote_source_chunks')
        .upsert(rows, { onConflict: 'project_id,source_id,chunk_index' })
      if (upErr) return jsonResponse(500, { ok: false, reason: 'db', message: upErr.message })
      chunksAdded += batch.length
    }
  }

  const updates: any = { rag_indexed_at: new Date().toISOString() }
  if (!project.rag_embedding_model) updates.rag_embedding_model = modelName
  await supabase.from('fieldnote_projects').update(updates).eq('id', projectId)

  return jsonResponse(200, { ok: true, chunksAdded, chunksUpdated, chunksDeleted, tokens: totalTokens })
})
```

- [ ] **Step 7.2: Add the advisory-lock RPC migration**

```sql
-- supabase/migrations/20260504190100_advisory_lock_text_wrapper.sql
create or replace function public.rag_try_advisory_lock_text(lock_key text)
returns table(locked boolean)
language sql
security definer
set search_path = public
as $$
  select pg_try_advisory_xact_lock(hashtextextended(lock_key, 0));
$$;

revoke all on function public.rag_try_advisory_lock_text(text) from anon, authenticated;
```

Apply: `supabase db push`.

- [ ] **Step 7.3: Deploy the function**

Run: `supabase functions deploy ai-rag-ingest`
Expected: deployment succeeds.

- [ ] **Step 7.4: Manual smoke test against a sample project**

Sign in to a dev account with a saved Gemini key. Trigger the function via:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-rag-ingest" \
  -H "authorization: Bearer $JWT" \
  -H "content-type: application/json" \
  -d '{"projectId":"<sample-project-id>","mode":"reindex"}'
```

Expected: `{ ok: true, chunksAdded: <N>, ... }`. Inspect `fieldnote_source_chunks` table — N rows with `embedding_768` populated, `embedding_model = 'text-embedding-004'`, `embedding_dim = 768`, `char_start`/`char_end` correct.

- [ ] **Step 7.5: Commit**

```bash
git add supabase/functions/ai-rag-ingest/index.ts supabase/migrations/20260504190100_advisory_lock_text_wrapper.sql
git commit -m "feat(rag): ai-rag-ingest Edge Function + advisory lock RPC"
```

---

## Task 8: Edge Function `ai-rag-query`

**Files:**
- Create: `supabase/functions/ai-rag-query/index.ts`
- Create: `supabase/migrations/20260504190200_rag_knn_rpc.sql`

Spec §"Retrieval".

- [ ] **Step 8.1: Implement the function**

```ts
// supabase/functions/ai-rag-query/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { embedGemini } from '../_shared/embeddings/gemini.ts'
import { embedOpenAI } from '../_shared/embeddings/openai.ts'
import { embedVoyage } from '../_shared/embeddings/voyage.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_SECRET = Deno.env.get('AI_KEY_ENCRYPTION_SECRET') ?? ''
const ALL_KILL = Deno.env.get('ALL_AI_KILL_SWITCH') === '1'

const TOP_K = 12
const RELEVANCE_FLOOR = 0.3
const RPM_LIMIT = 30
const QUESTION_MAX_TOKENS = 2000

const EMBEDDING_MODELS = {
  gemini: { name: 'text-embedding-004', dim: 768 },
  openai: { name: 'text-embedding-3-small', dim: 1536 },
  voyage: { name: 'voyage-3', dim: 1024 },
} as const
type EmbProvider = keyof typeof EMBEDDING_MODELS

const rateBuckets = new Map<string, { tokens: number; refillAt: number }>()
function rpmCheck(userId: string, limit: number): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(userId) ?? { tokens: limit, refillAt: now + 60_000 }
  if (now >= bucket.refillAt) { bucket.tokens = limit; bucket.refillAt = now + 60_000 }
  if (bucket.tokens <= 0) { rateBuckets.set(userId, bucket); return false }
  bucket.tokens -= 1; rateBuckets.set(userId, bucket); return true
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' } })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, reason: 'method', message: 'POST only' })
  if (ALL_KILL) return jsonResponse(503, { ok: false, reason: 'kill-switch-all', message: 'AI features temporarily disabled.' })

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Missing bearer token' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice('Bearer '.length))
  if (userErr || !userData.user) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Invalid session' })
  const userId = userData.user.id

  if (!rpmCheck(userId, RPM_LIMIT)) return jsonResponse(429, { ok: false, reason: 'rate-limit', message: 'Slow down — 30 requests/minute max.' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { ok: false, reason: 'parse', message: 'Body is not JSON' }) }
  const projectId = String(body?.projectId ?? '')
  const question = String(body?.question ?? '').trim()
  if (!projectId || !question) return jsonResponse(400, { ok: false, reason: 'input', message: 'projectId + question required' })
  if (Math.ceil(question.length / 4) > QUESTION_MAX_TOKENS) return jsonResponse(413, { ok: false, reason: 'too-large', message: `Question exceeds ${QUESTION_MAX_TOKENS} tokens.` })

  const { data: project } = await supabase
    .from('fieldnote_projects')
    .select('id, owner_id, rag_embedding_model')
    .eq('id', projectId).maybeSingle()
  if (!project) return jsonResponse(404, { ok: false, reason: 'input', message: 'Project not found' })
  if (project.owner_id !== userId) return jsonResponse(403, { ok: false, reason: 'auth', message: 'Not your project' })
  if (!project.rag_embedding_model) return jsonResponse(400, { ok: false, reason: 'not-indexed', message: 'Project not indexed yet.' })

  const provider = (Object.entries(EMBEDDING_MODELS).find(([, m]) => m.name === project.rag_embedding_model)?.[0] ?? null) as EmbProvider | null
  if (!provider) return jsonResponse(400, { ok: false, reason: 'dim-mismatch', message: `Project's embedding model is unknown: ${project.rag_embedding_model}` })
  const dim = EMBEDDING_MODELS[provider].dim

  const { data: settings } = await supabase.from('fieldnote_user_settings').select('encrypted_keys').eq('user_id', userId).maybeSingle()
  const ciphertext = settings?.encrypted_keys?.[provider]
  if (!ciphertext) return jsonResponse(400, { ok: false, reason: 'no-key', message: `No ${provider} key saved.` })
  const { data: decrypted } = await supabase.rpc('ai_key_decrypt', { p_ciphertext_b64: ciphertext, p_secret: ENCRYPTION_SECRET })
  const apiKey = String(decrypted)

  let queryEmb: number[]
  let promptTokens: number
  try {
    const r = provider === 'gemini'
      ? await embedGemini({ apiKey, model: project.rag_embedding_model, texts: [question] })
      : provider === 'openai'
        ? await embedOpenAI({ apiKey, model: project.rag_embedding_model, texts: [question] })
        : await embedVoyage({ apiKey, model: project.rag_embedding_model, texts: [question], inputType: 'query' })
    queryEmb = r.embeddings[0]
    promptTokens = r.promptTokens
  } catch (e: any) {
    return jsonResponse(502, { ok: false, reason: 'provider', message: e?.message ?? 'Embed failed' })
  }

  // Call the dim-specific kNN RPC. Three RPCs, one per dim — no dynamic SQL.
  const rpcName = dim === 768 ? 'rag_knn_768' : dim === 1024 ? 'rag_knn_1024' : 'rag_knn_1536'
  const { data: rows, error: queryErr } = await supabase.rpc(rpcName, {
    p_project_id: projectId,
    p_vector: JSON.stringify(queryEmb),
    p_top_k: TOP_K,
  })
  if (queryErr) return jsonResponse(500, { ok: false, reason: 'db', message: queryErr.message })
  const chunks = (rows ?? []) as Array<{ id: string; source_id: string; source_title: string; page_number: number | null; char_start: number; char_end: number; content: string; score: number }>

  if (chunks.length === 0 || chunks[0].score < RELEVANCE_FLOOR) {
    return jsonResponse(200, { ok: true, askId: null, embeddingModel: project.rag_embedding_model, chunks: [] })
  }

  const retrieval = chunks.map((c) => ({ chunk_id: c.id, score: c.score }))
  const { data: askRow, error: askErr } = await supabase
    .from('fieldnote_rag_asks')
    .insert({ project_id: projectId, user_id: userId, question, embedding_model: project.rag_embedding_model, retrieval, prompt_tokens: promptTokens })
    .select('id').single()
  if (askErr) return jsonResponse(500, { ok: false, reason: 'db', message: askErr.message })

  return jsonResponse(200, {
    ok: true,
    askId: askRow.id,
    embeddingModel: project.rag_embedding_model,
    chunks: chunks.map((c) => ({
      chunkId: c.id,
      sourceId: c.source_id,
      sourceTitle: c.source_title,
      pageNumber: c.page_number,
      charStart: c.char_start,
      charEnd: c.char_end,
      text: c.content,
      score: c.score,
    })),
  })
})
```

- [ ] **Step 8.2: Add three dim-specific kNN RPCs**

Three definer-mode RPCs — one per supported dim — replace the dynamic-SQL approach entirely. Each is a single static SELECT that pgvector can plan against the matching HNSW index.

```sql
-- supabase/migrations/20260504190200_rag_knn_rpc.sql

create or replace function public.rag_knn_768(p_project_id uuid, p_vector text, p_top_k int)
returns table (
  id uuid,
  source_id uuid,
  source_title text,
  page_number int,
  char_start int,
  char_end int,
  content text,
  score float
) language sql security definer set search_path = public, extensions as $$
  select c.id, c.source_id, s.title as source_title, c.page_number,
         c.char_start, c.char_end, c.content,
         1 - (c.embedding_768 <=> p_vector::vector) as score
    from public.fieldnote_source_chunks c
    join public.fieldnote_sources s
      on s.project_id = c.project_id and s.id = c.source_id
   where c.project_id = p_project_id
     and c.embedding_768 is not null
     and s.archived = false
   order by c.embedding_768 <=> p_vector::vector
   limit p_top_k;
$$;

create or replace function public.rag_knn_1024(p_project_id uuid, p_vector text, p_top_k int)
returns table (
  id uuid, source_id uuid, source_title text, page_number int,
  char_start int, char_end int, content text, score float
) language sql security definer set search_path = public, extensions as $$
  select c.id, c.source_id, s.title, c.page_number,
         c.char_start, c.char_end, c.content,
         1 - (c.embedding_1024 <=> p_vector::vector)
    from public.fieldnote_source_chunks c
    join public.fieldnote_sources s
      on s.project_id = c.project_id and s.id = c.source_id
   where c.project_id = p_project_id
     and c.embedding_1024 is not null
     and s.archived = false
   order by c.embedding_1024 <=> p_vector::vector
   limit p_top_k;
$$;

create or replace function public.rag_knn_1536(p_project_id uuid, p_vector text, p_top_k int)
returns table (
  id uuid, source_id uuid, source_title text, page_number int,
  char_start int, char_end int, content text, score float
) language sql security definer set search_path = public, extensions as $$
  select c.id, c.source_id, s.title, c.page_number,
         c.char_start, c.char_end, c.content,
         1 - (c.embedding_1536 <=> p_vector::vector)
    from public.fieldnote_source_chunks c
    join public.fieldnote_sources s
      on s.project_id = c.project_id and s.id = c.source_id
   where c.project_id = p_project_id
     and c.embedding_1536 is not null
     and s.archived = false
   order by c.embedding_1536 <=> p_vector::vector
   limit p_top_k;
$$;

revoke all on function public.rag_knn_768(uuid, text, int) from anon, authenticated;
revoke all on function public.rag_knn_1024(uuid, text, int) from anon, authenticated;
revoke all on function public.rag_knn_1536(uuid, text, int) from anon, authenticated;
```

Apply: `supabase db push`.

- [ ] **Step 8.3: Deploy + smoke test**

Run: `supabase functions deploy ai-rag-query`. Then:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ai-rag-query" \
  -H "authorization: Bearer $JWT" \
  -H "content-type: application/json" \
  -d '{"projectId":"<sample-project-id>","question":"what do participants say about access?"}'
```

Expected: `{ ok: true, askId: "...", chunks: [...] }` with up to 12 chunks; top score > 0.3 if the project has any access-related content. Verify a row appears in `fieldnote_rag_asks`.

- [ ] **Step 8.4: Commit**

```bash
git add supabase/functions/ai-rag-query/index.ts supabase/migrations/20260504190200_rag_knn_rpc.sql
git commit -m "feat(rag): ai-rag-query Edge Function + dim-specific kNN RPCs"
```

---

## Task 9: Edge Function `ai-rag-synthesize`

**Files:**
- Create: `supabase/functions/ai-rag-synthesize/index.ts`

Spec §"Synthesis + quote verification". Reuses existing generation provider adapters by importing from `../ai-call/providers/`.

Note: `quoteVerify.ts` lives in `src/ai/`. To use it server-side we move it to `_shared/`. Single source of truth. Adjust the client import accordingly.

- [ ] **Step 9.1: Move `quoteVerify` to shared, re-export from client**

```bash
git mv src/ai/quoteVerify.ts supabase/functions/_shared/quoteVerify.ts
```

Create `src/ai/quoteVerify.ts`:

```ts
// src/ai/quoteVerify.ts
export * from '@shared/quoteVerify'
```

Update tests: existing test import path `from '../quoteVerify'` keeps working unchanged because the re-export preserves the path.

Run: `npm test -- src/ai/__tests__/quoteVerify.test.ts`. Expected: PASS.

- [ ] **Step 9.2: Implement the function**

```ts
// supabase/functions/ai-rag-synthesize/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callGemini } from '../ai-call/providers/gemini.ts'
import { callOpenAI } from '../ai-call/providers/openai.ts'
import { callAnthropic } from '../ai-call/providers/anthropic.ts'
import { verifyQuotes } from '../_shared/quoteVerify.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_SECRET = Deno.env.get('AI_KEY_ENCRYPTION_SECRET') ?? ''
const ALL_KILL = Deno.env.get('ALL_AI_KILL_SWITCH') === '1'

const RPM_LIMIT = 10
const PROMPT_MAX_TOKENS = 50_000

const GENERATION_MODELS = {
  gemini: 'gemini-2.5-pro',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
} as const

const SYSTEM_PROMPT = `You are helping a qualitative researcher analyze interview/document data.
Answer the question using ONLY the evidence provided. Cite each claim with [N]
referring to the numbered evidence below. When quoting a participant verbatim,
use double quotes and ensure the quote appears in the cited evidence exactly
as written. If the evidence does not support an answer, say so plainly.`

const rateBuckets = new Map<string, { tokens: number; refillAt: number }>()
function rpmCheck(userId: string, limit: number): boolean {
  const now = Date.now()
  const b = rateBuckets.get(userId) ?? { tokens: limit, refillAt: now + 60_000 }
  if (now >= b.refillAt) { b.tokens = limit; b.refillAt = now + 60_000 }
  if (b.tokens <= 0) { rateBuckets.set(userId, b); return false }
  b.tokens -= 1; rateBuckets.set(userId, b); return true
}

function jsonResponse(s: number, b: unknown): Response {
  return new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' } })
}

function approxTokens(s: string): number { return Math.ceil(s.length / 4) }

function citationLine(c: { source_title: string; page_number: number | null }): string {
  return c.page_number != null ? `(${c.source_title}, p. ${c.page_number})` : `(${c.source_title})`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, content-type' } })
  if (req.method !== 'POST') return jsonResponse(405, { ok: false, reason: 'method', message: 'POST only' })
  if (ALL_KILL) return jsonResponse(503, { ok: false, reason: 'kill-switch-all', message: 'AI features temporarily disabled.' })

  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Missing bearer token' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.slice('Bearer '.length))
  if (userErr || !userData.user) return jsonResponse(401, { ok: false, reason: 'auth', message: 'Invalid session' })
  const userId = userData.user.id
  if (!rpmCheck(userId, RPM_LIMIT)) return jsonResponse(429, { ok: false, reason: 'rate-limit', message: 'Slow down — 10 requests/minute max.' })

  let body: any
  try { body = await req.json() } catch { return jsonResponse(400, { ok: false, reason: 'parse', message: 'Body is not JSON' }) }
  const askId = String(body?.askId ?? '')
  const includedChunkIds: string[] = Array.isArray(body?.includedChunkIds) ? body.includedChunkIds.map(String) : []
  if (!askId || includedChunkIds.length === 0) return jsonResponse(400, { ok: false, reason: 'input', message: 'askId + non-empty includedChunkIds required' })

  const { data: ask } = await supabase.from('fieldnote_rag_asks').select('id, user_id, project_id, question, retrieval').eq('id', askId).maybeSingle()
  if (!ask) return jsonResponse(404, { ok: false, reason: 'input', message: 'Ask not found' })
  if (ask.user_id !== userId) return jsonResponse(403, { ok: false, reason: 'auth', message: 'Not your ask' })

  const { data: chunkRows } = await supabase
    .from('fieldnote_source_chunks')
    .select('id, source_id, page_number, content, project_id')
    .in('id', includedChunkIds)
    .eq('project_id', ask.project_id)
  const { data: srcRows } = await supabase
    .from('fieldnote_sources')
    .select('id, title')
    .eq('project_id', ask.project_id)
  const titleById = new Map<string, string>(((srcRows ?? []) as any[]).map((s) => [s.id, s.title]))
  const orderedChunks = includedChunkIds
    .map((id) => (chunkRows ?? []).find((c: any) => c.id === id))
    .filter((c): c is any => !!c)
    .map((c: any) => ({ id: c.id, source_title: titleById.get(c.source_id) ?? '(unknown)', page_number: c.page_number, content: c.content }))

  const { data: settings } = await supabase.from('fieldnote_user_settings').select('ai_provider, encrypted_keys').eq('user_id', userId).maybeSingle()
  const aiProvider = settings?.ai_provider ?? 'gemini-free'
  const genProvider: 'gemini' | 'openai' | 'anthropic' =
    aiProvider === 'openai-byok' ? 'openai' :
    aiProvider === 'anthropic-byok' ? 'anthropic' :
    'gemini'
  if (aiProvider === 'gemini-free') return jsonResponse(412, { ok: false, reason: 'no-key', message: 'RAG requires a BYOK provider key. Add a Gemini, OpenAI, or Anthropic key in Settings.' })
  const ciphertext = settings?.encrypted_keys?.[genProvider]
  if (!ciphertext) return jsonResponse(400, { ok: false, reason: 'no-key', message: `No ${genProvider} key saved.` })
  const { data: decrypted } = await supabase.rpc('ai_key_decrypt', { p_ciphertext_b64: ciphertext, p_secret: ENCRYPTION_SECRET })
  const apiKey = String(decrypted)
  const model = GENERATION_MODELS[genProvider]

  const evidenceBlock = orderedChunks
    .map((c, i) => `[${i + 1}] ${citationLine(c)} "${c.content.replace(/"/g, '\\"')}"`)
    .join('\n\n')
  const userPrompt = `Question: ${ask.question}\n\nEvidence:\n${evidenceBlock}`
  if (approxTokens(SYSTEM_PROMPT + userPrompt) > PROMPT_MAX_TOKENS) {
    return jsonResponse(413, { ok: false, reason: 'too-large', message: 'Synthesis prompt exceeds 50k tokens.' })
  }

  let providerResp
  try {
    if (genProvider === 'gemini') providerResp = await callGemini({ apiKey, model, systemPrompt: SYSTEM_PROMPT, userPrompt })
    else if (genProvider === 'openai') providerResp = await callOpenAI({ apiKey, model, systemPrompt: SYSTEM_PROMPT, userPrompt })
    else providerResp = await callAnthropic({ apiKey, model, systemPrompt: SYSTEM_PROMPT, userPrompt })
  } catch (e: any) {
    await supabase.from('fieldnote_rag_asks').update({ status: 'failed', failure_reason: String(e?.message ?? e) }).eq('id', askId)
    return jsonResponse(502, { ok: false, reason: 'provider', message: e?.message ?? 'Provider call failed' })
  }

  const synthesis = providerResp.text
  const audit = verifyQuotes(synthesis, orderedChunks.map((c) => ({ id: c.id, content: c.content })))

  await supabase.from('fieldnote_rag_asks').update({
    synthesis,
    quote_audit: audit,
    generation_model: model,
    prompt_tokens: providerResp.promptTokens,
    completion_tokens: providerResp.completionTokens,
  }).eq('id', askId)

  return jsonResponse(200, {
    ok: true,
    askId,
    synthesis,
    quoteAudit: audit,
    generationModel: model,
    usage: { promptTokens: providerResp.promptTokens, completionTokens: providerResp.completionTokens, costUsd: null },
  })
})
```

- [ ] **Step 9.3: Deploy + smoke test**

```bash
supabase functions deploy ai-rag-synthesize

curl -X POST "$SUPABASE_URL/functions/v1/ai-rag-synthesize" \
  -H "authorization: Bearer $JWT" \
  -H "content-type: application/json" \
  -d '{"askId":"<id-from-query>","includedChunkIds":["<id1>","<id2>","<id3>"]}'
```

Expected: `{ ok: true, synthesis: "...", quoteAudit: [...] }` with at least one `verified: true` quote if the model quoted a real chunk.

- [ ] **Step 9.4: Commit**

```bash
git add supabase/functions/_shared/quoteVerify.ts src/ai/quoteVerify.ts supabase/functions/ai-rag-synthesize/index.ts
git commit -m "feat(rag): ai-rag-synthesize Edge Function with quote verification"
```

---

## Task 10: AnalyzeSidebar entry + queryDefinition extension

**Files:**
- Modify: `src/analyze/queryDefinition.ts`
- Modify: `src/analyze/AnalyzeSidebar.tsx`

- [ ] **Step 10.1: Extend the question-type union**

In `src/analyze/queryDefinition.ts`, find the existing `queryType` union (likely `'find_excerpts' | 'matrix' | 'frequency' | 'cooccurrence' | 'crosstab'`). Add `'ask'`:

```ts
export type AnalyzeQueryType =
  | 'find_excerpts'
  | 'matrix'
  | 'frequency'
  | 'cooccurrence'
  | 'crosstab'
  | 'ask'
```

If `QueryDefinition` carries a payload, ask uses an empty/default shape — RAG question state lives in component state, not in the saved-query mechanism. Only pinning a snapshot persists state, and that uses the existing snapshot pipeline.

- [ ] **Step 10.2: Add the sidebar entry**

In `src/analyze/AnalyzeSidebar.tsx`, find the Evidence group entries (likely near "Find excerpts"). Add:

```tsx
<button
  className={isActive('ask') ? 'analyze-sidebar-item active' : 'analyze-sidebar-item'}
  onClick={() => onSelectQueryType('ask')}
>
  Ask
</button>
```

Match the surrounding style/className convention exactly. The label is **"Ask"** per spec §"UI surface".

- [ ] **Step 10.3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 10.4: Commit**

```bash
git add src/analyze/queryDefinition.ts src/analyze/AnalyzeSidebar.tsx
git commit -m "feat(analyze): register Ask question type + sidebar entry"
```

---

## Task 11: AskPanel center component

**Files:**
- Create: `src/analyze/panels/AskPanel.tsx`
- Create: `src/analyze/panels/AskIndexBanner.tsx`
- Modify: `src/App.tsx` (route `'ask'` to `AskPanel`)
- Modify: `src/persistence/shape.ts` (round-trip new project columns)
- Modify: `src/App.css`

Spec §"UI surface (Analyze mode)".

- [ ] **Step 11.1: Implement the index status banner**

```tsx
// src/analyze/panels/AskIndexBanner.tsx
import { useState } from 'react'
import { reindexProject } from '../../ai/rag'

type Props = {
  projectId: string
  state: 'uninitialized' | 'stale' | 'dim-mismatch' | 'ok'
  estimatedTokens: number
  estimatedCostUsd: number
  staleSourceCount?: number
  onIndexed: () => void
}

export function AskIndexBanner({ projectId, state, estimatedTokens, estimatedCostUsd, staleSourceCount, onIndexed }: Props) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (state === 'ok') return null

  const message =
    state === 'uninitialized' ? `This project hasn't been indexed yet. ${estimatedTokens.toLocaleString()} tokens, est. $${estimatedCostUsd.toFixed(3)}.`
    : state === 'stale' ? `${staleSourceCount} source${staleSourceCount === 1 ? '' : 's'} updated since the last index.`
    : 'Embedding model changed since this project was indexed. Re-index to switch.'

  const buttonLabel = state === 'uninitialized' ? 'Index now' : 'Re-index now'

  const onClick = async () => {
    setBusy(true); setErr(null)
    const r = await reindexProject({ projectId })
    setBusy(false)
    if (r.ok) onIndexed()
    else setErr(r.message)
  }

  return (
    <div className="ask-index-banner" data-state={state}>
      <div className="ask-index-banner-message">{message}</div>
      <button className="secondary-button" disabled={busy} onClick={onClick}>
        {busy ? 'Indexing…' : buttonLabel}
      </button>
      {err && <div className="ask-index-banner-error">{err}</div>}
    </div>
  )
}
```

- [ ] **Step 11.2: Implement the AskPanel**

```tsx
// src/analyze/panels/AskPanel.tsx
import { useMemo, useState } from 'react'
import { askEvidence, askSynthesize } from '../../ai/rag'
import type { RagChunkCitation, QuoteAuditEntry } from '../../ai/types'
import { AskIndexBanner } from './AskIndexBanner'
import { approxTokenCount } from '@shared/chunker'
import { estimateEmbeddingCostUsd } from '../../ai/pricing'
import { embeddingProviderFor } from '../../ai/ragModels'

type Props = {
  projectId: string
  ragEmbeddingModel: string | null
  ragIndexedAt: string | null
  sources: Array<{ id: string; content: string; updatedAt: string | null; archived: boolean }>
  onPinSnapshot: (payload: AskSnapshotPayload) => void
  onSendToReport: (payload: AskSnapshotPayload) => void
}

export type AskSnapshotPayload = {
  question: string
  synthesis: string | null
  quoteAudit: QuoteAuditEntry[]
  evidence: Array<{
    sourceId: string
    sourceTitle: string
    pageNumber: number | null
    charStart: number
    charEnd: number
    text: string
    score: number
  }>
  embeddingModel: string
  generationModel: string | null
}

export function AskPanel(props: Props) {
  const { projectId, ragEmbeddingModel, ragIndexedAt, sources } = props
  const [question, setQuestion] = useState('')
  const [askId, setAskId] = useState<string | null>(null)
  const [chunks, setChunks] = useState<RagChunkCitation[]>([])
  const [included, setIncluded] = useState<Set<string>>(new Set())
  const [synthesis, setSynthesis] = useState<string | null>(null)
  const [quoteAudit, setQuoteAudit] = useState<QuoteAuditEntry[]>([])
  const [generationModel, setGenerationModel] = useState<string | null>(null)
  const [busy, setBusy] = useState<'evidence' | 'synthesis' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [embeddingModelUsed, setEmbeddingModelUsed] = useState<string | null>(ragEmbeddingModel)

  const indexState: 'uninitialized' | 'stale' | 'dim-mismatch' | 'ok' = useMemo(() => {
    if (!ragEmbeddingModel || !ragIndexedAt) return 'uninitialized'
    const lastIndex = new Date(ragIndexedAt).getTime()
    const stale = sources.some((s) => !s.archived && s.updatedAt && new Date(s.updatedAt).getTime() > lastIndex)
    return stale ? 'stale' : 'ok'
  }, [ragEmbeddingModel, ragIndexedAt, sources])

  const totalTokens = useMemo(
    () => sources.filter((s) => !s.archived).reduce((n, s) => n + approxTokenCount(s.content), 0),
    [sources],
  )
  const estCost = useMemo(() => {
    if (!ragEmbeddingModel) return 0
    try {
      const provider = embeddingProviderFor(ragEmbeddingModel)
      return estimateEmbeddingCostUsd(totalTokens, provider)
    } catch { return 0 }
  }, [ragEmbeddingModel, totalTokens])

  const onFindEvidence = async () => {
    if (!question.trim()) return
    setBusy('evidence'); setErr(null); setSynthesis(null); setQuoteAudit([]); setAskId(null)
    const r = await askEvidence({ projectId, question })
    setBusy(null)
    if (!r.ok) { setErr(r.message); return }
    setAskId(r.askId)
    setEmbeddingModelUsed(r.embeddingModel)
    setChunks(r.chunks)
    setIncluded(new Set(r.chunks.map((c) => c.chunkId)))
    if (r.chunks.length === 0) setErr('No relevant evidence found — try rephrasing.')
  }

  const onSynthesize = async () => {
    if (!askId || included.size === 0) return
    setBusy('synthesis'); setErr(null)
    const r = await askSynthesize({ askId, includedChunkIds: Array.from(included) })
    setBusy(null)
    if (!r.ok) { setErr(r.message); return }
    setSynthesis(r.synthesis)
    setQuoteAudit(r.quoteAudit)
    setGenerationModel(r.generationModel)
  }

  const toggleChunk = (id: string) => {
    setIncluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="ask-panel detail-card">
      <AskIndexBanner
        projectId={projectId}
        state={indexState}
        estimatedTokens={totalTokens}
        estimatedCostUsd={estCost}
        staleSourceCount={sources.filter((s) => !s.archived && s.updatedAt && ragIndexedAt && new Date(s.updatedAt).getTime() > new Date(ragIndexedAt).getTime()).length}
        onIndexed={() => { /* parent will refresh project row → indexState recomputes */ }}
      />

      {indexState === 'uninitialized' ? null : (
        <>
          <section className="ask-question">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do participants say about access barriers?"
              rows={3}
            />
            <div className="ask-actions">
              <button className="primary-button" disabled={!question.trim() || !!busy} onClick={onFindEvidence}>
                {busy === 'evidence' ? 'Searching…' : 'Find evidence'}
              </button>
            </div>
          </section>

          {err && <div className="ask-error">{err}</div>}

          {chunks.length > 0 && (
            <section className="ask-evidence">
              <header className="ask-evidence-header">
                <span>Evidence ({chunks.length})</span>
                <button className="secondary-button" disabled={included.size === 0 || busy === 'synthesis'} onClick={onSynthesize}>
                  {busy === 'synthesis' ? 'Summarizing…' : 'Summarize'}
                </button>
              </header>
              <ol className="ask-evidence-list">
                {chunks.map((c, i) => (
                  <li key={c.chunkId} className="ask-evidence-row">
                    <input type="checkbox" checked={included.has(c.chunkId)} onChange={() => toggleChunk(c.chunkId)} />
                    <span className="ask-evidence-num">[{i + 1}]</span>
                    <span className="ask-evidence-citation">
                      {c.sourceTitle}{c.pageNumber != null ? `, p. ${c.pageNumber}` : ''}
                    </span>
                    <span className="ask-evidence-score">score {c.score.toFixed(2)}</span>
                    <p className="ask-evidence-text">{c.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {synthesis && (
            <section className="ask-synthesis">
              <header className="ask-synthesis-header">Synthesis ({generationModel})</header>
              <SynthesisText text={synthesis} audit={quoteAudit} />
              {quoteAudit.some((q) => !q.verified) && (
                <div className="ask-synthesis-warning">
                  ⚠ Some quoted phrases could not be verified against the cited sources. Inspect those quotes before relying on them.
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function SynthesisText({ text, audit }: { text: string; audit: QuoteAuditEntry[] }) {
  if (audit.length === 0) return <p className="ask-synthesis-body">{text}</p>
  const sorted = [...audit].sort((a, b) => a.spanStart - b.spanStart)
  const parts: Array<React.ReactNode> = []
  let cursor = 0
  sorted.forEach((q, i) => {
    if (q.spanStart > cursor) parts.push(text.slice(cursor, q.spanStart))
    const cls = q.verified ? 'quote-verified' : 'quote-unverified'
    const title = q.verified ? 'Verified against the cited source' : 'This quoted phrase could not be verified'
    parts.push(<span key={i} className={cls} title={title}>{text.slice(q.spanStart, q.spanEnd)}</span>)
    cursor = q.spanEnd
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <p className="ask-synthesis-body">{parts}</p>
}
```

- [ ] **Step 11.3: Wire AskPanel into App.tsx Analyze routing**

In `src/App.tsx`, find the existing Analyze panel switch (likely a `switch (analyzeQueryType)` or inline ternary). Add the `'ask'` case:

```tsx
{analyzeQueryType === 'ask' && (
  <AskPanel
    projectId={activeProjectId}
    ragEmbeddingModel={activeProject.ragEmbeddingModel ?? null}
    ragIndexedAt={activeProject.ragIndexedAt ?? null}
    sources={activeProject.sources}
    onPinSnapshot={handlePinAskSnapshot}
    onSendToReport={handleSendAskToReport}
  />
)}
```

Add `ragEmbeddingModel` and `ragIndexedAt` to the project row's normalize/compose path in `src/persistence/shape.ts` so they round-trip through autosave.

- [ ] **Step 11.4: Add minimal CSS**

In `App.css` (or wherever Analyze panel styles live):

```css
.ask-panel { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
.ask-index-banner { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border: 1px solid var(--rule-soft); border-radius: 8px; }
.ask-index-banner[data-state="uninitialized"] { background: var(--surface-2); }
.ask-index-banner[data-state="stale"] { background: var(--surface-warn-soft, var(--surface-2)); }
.ask-question textarea { width: 100%; min-height: 72px; font: var(--t-t5); padding: 12px; }
.ask-evidence-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.ask-evidence-row { display: grid; grid-template-columns: auto auto 1fr auto; gap: 8px; padding: 12px; border: 1px solid var(--rule-soft); border-radius: 6px; }
.ask-evidence-num { font: var(--t-t8); color: var(--ink-3); }
.ask-evidence-citation { font: var(--t-t6); }
.ask-evidence-score { font: var(--t-t8); color: var(--ink-4); }
.ask-evidence-text { grid-column: 1 / -1; margin: 8px 0 0; font: var(--t-t6); color: var(--ink-2); }
.ask-synthesis { padding: 16px; border: 1px solid var(--rule-soft); border-radius: 6px; background: var(--surface-2); }
.ask-synthesis-header { font: var(--t-t7); color: var(--ink-3); margin-bottom: 8px; }
.ask-synthesis-body { font: var(--t-t5); line-height: 1.55; }
.quote-verified { background: rgba(0, 160, 80, 0.08); padding: 0 2px; border-radius: 2px; }
.quote-unverified { color: var(--danger, #c0392b); border-bottom: 1px dotted currentColor; }
.ask-synthesis-warning { margin-top: 12px; font: var(--t-t6); color: var(--danger, #c0392b); }
.ask-error { color: var(--danger, #c0392b); font: var(--t-t6); }
```

- [ ] **Step 11.5: Verify in dev**

Run: `npm run dev`. Open the app, switch to Analyze → Ask. With no index, banner shows. Click Index now — wait, then ask a question. Verify evidence list renders with citations and click-to-toggle checkboxes. Click Summarize — verify synthesis renders with verified/unverified styling.

- [ ] **Step 11.6: Commit**

```bash
git add src/analyze/panels/AskPanel.tsx src/analyze/panels/AskIndexBanner.tsx src/App.tsx src/persistence/shape.ts src/App.css
git commit -m "feat(analyze): AskPanel UI with evidence list + verified-quote synthesis"
```

---

## Task 12: AnalyzeInspector ask mode (Pin + Send to Report)

**Files:**
- Modify: `src/analyze/AnalyzeInspector.tsx`
- Create: `src/analyze/useAskState.ts` (small Context for ask state lifted out of AskPanel)
- Modify: `src/App.tsx` (handlers)

Spec §"UI surface" — right rail.

- [ ] **Step 12.1: Lift ask state into a Context**

```ts
// src/analyze/useAskState.ts
import { createContext, useContext } from 'react'
import type { AskSnapshotPayload } from './panels/AskPanel'

export type AskState = {
  payload: AskSnapshotPayload | null
}

export const AskStateContext = createContext<AskState>({ payload: null })

export function useAskState(): AskState {
  return useContext(AskStateContext)
}
```

Wrap the Analyze region in `App.tsx` with `<AskStateContext.Provider value={{ payload }}>...</AskStateContext.Provider>` where `payload` is lifted out of `AskPanel` (move the `useState` for `question`, `chunks`, `included`, `synthesis`, `quoteAudit`, `generationModel` up one level, or maintain a parallel cached `payload` state on `AskPanel`'s parent). Keep `AskPanel`'s internal state but expose a `useImperativeHandle`-style `ref.current.getPayload()` if needed; whichever is less invasive.

A simpler alternative: have `AskPanel` accept a `setPayload(payload | null)` prop and call it whenever evidence/synthesis updates; the parent then both renders the panel and provides the inspector context.

- [ ] **Step 12.2: Add the ask branch to AnalyzeInspector**

In the inspector's mode switch, add `'ask'`:

```tsx
{analyzeQueryType === 'ask' && (() => {
  const ask = useAskState()
  return (
    <div className="inspector-ask">
      <div className="inspector-current-question">
        {ask.payload?.question
          ? <span>Asking: <em>{ask.payload.question}</em></span>
          : <span>Type a question to begin.</span>}
      </div>
      <div className="inspector-actions">
        <button className="secondary-button" disabled={!ask.payload} onClick={() => onPinAsk(ask.payload!)}>
          Pin snapshot
        </button>
        <button className="secondary-button" disabled={!ask.payload} onClick={() => onSendAskToReport(ask.payload!)}>
          Send to Report
        </button>
      </div>
    </div>
  )
})()}
```

- [ ] **Step 12.3: Wire `onPinAsk` and `onSendAskToReport` to the existing snapshot path**

In `src/App.tsx`, define handlers that mirror the existing pin/send pattern used by other Analyze panels:

```ts
async function handlePinAskSnapshot(payload: AskSnapshotPayload) {
  await pinSnapshot({
    projectId,
    queryId: null,
    label: payload.question.slice(0, 80),
    note: '',
    includeInReport: false,
    activeFilters: [],
    resultKind: 'ask',
    definition: {} as QueryDefinition,
    results: { kind: 'ask', ...payload },
  })
}

async function handleSendAskToReport(payload: AskSnapshotPayload) {
  await pinSnapshot({
    projectId,
    queryId: null,
    label: payload.question.slice(0, 80),
    note: '',
    includeInReport: true,
    activeFilters: [],
    resultKind: 'ask',
    definition: {} as QueryDefinition,
    results: { kind: 'ask', ...payload },
  })
  setActiveMode('report')
}
```

Both handlers reuse the existing `pinSnapshot` helper from the snapshot pipeline.

- [ ] **Step 12.4: Type-check + run dev sanity**

Run: `npx tsc --noEmit` then `npm run dev`. Verify Pin/Send buttons appear in the right rail when Ask is active and become enabled after running an evidence search.

- [ ] **Step 12.5: Commit**

```bash
git add src/analyze/AnalyzeInspector.tsx src/analyze/useAskState.ts src/App.tsx
git commit -m "feat(analyze): AskInspector with pin + send-to-report"
```

---

## Task 13: Settings panel — embedding provider picker + index cost

**Files:**
- Modify: `src/components/AiSettingsPanel.tsx`
- Modify: `src/lib/aiSettings.ts`
- Modify: `src/ai/types.ts`
- Modify: `supabase/functions/save-key/index.ts` (add Voyage to provider whitelist)
- Create: `supabase/migrations/20260504190300_add_embedding_provider_setting.sql`

Spec §"BYOK + cost model".

- [ ] **Step 13.1: Migration — add column + extend the safe RPC**

```sql
-- supabase/migrations/20260504190300_add_embedding_provider_setting.sql
alter table public.fieldnote_user_settings
  add column rag_embedding_provider text;

create or replace function public.update_ai_settings_safe(
  p_provider text,
  p_hosted_consent_at timestamptz,
  p_rag_embedding_provider text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_provider not in ('gemini-free', 'gemini-byok', 'openai-byok', 'anthropic-byok') then
    raise exception 'invalid provider';
  end if;
  if p_rag_embedding_provider is not null and p_rag_embedding_provider not in ('gemini', 'openai', 'voyage') then
    raise exception 'invalid embedding provider';
  end if;
  insert into public.fieldnote_user_settings (user_id, ai_provider, hosted_ai_consent_at, rag_embedding_provider, updated_at)
  values (auth.uid(), p_provider, p_hosted_consent_at, p_rag_embedding_provider, now())
  on conflict (user_id) do update
    set ai_provider = excluded.ai_provider,
        hosted_ai_consent_at = excluded.hosted_ai_consent_at,
        rag_embedding_provider = excluded.rag_embedding_provider,
        updated_at = now();
end;
$$;

revoke all on function public.update_ai_settings_safe(text, timestamptz, text) from public;
grant execute on function public.update_ai_settings_safe(text, timestamptz, text) to authenticated;

create or replace view public.fieldnote_user_settings_safe with (security_invoker = true) as
  select user_id, ai_provider, hosted_ai_consent_at, rag_embedding_provider,
         (encrypted_keys ? 'gemini') as has_gemini_key,
         (encrypted_keys ? 'openai') as has_openai_key,
         (encrypted_keys ? 'anthropic') as has_anthropic_key,
         (encrypted_keys ? 'voyage') as has_voyage_key
    from public.fieldnote_user_settings
   where user_id = auth.uid();
```

Apply: `supabase db push`.

- [ ] **Step 13.2: Extend `aiSettings.ts` and `UserAiSettings` type**

In `src/lib/aiSettings.ts`, add `ragEmbeddingProvider: 'gemini' | 'openai' | 'voyage' | null` to the load + save shape and the corresponding RPC argument. In `src/ai/types.ts`, add to `UserAiSettings`:

```ts
export type UserAiSettings = {
  aiProvider: AiProvider
  hostedAiConsentAt: string | null
  hasGeminiKey: boolean
  hasOpenaiKey: boolean
  hasAnthropicKey: boolean
  hasVoyageKey: boolean
  ragEmbeddingProvider: 'gemini' | 'openai' | 'voyage' | null
}
```

In `supabase/functions/save-key/index.ts`, extend the provider whitelist to include `'voyage'`:

```ts
// Inside the validation block:
if (!['gemini', 'openai', 'anthropic', 'voyage'].includes(provider)) {
  return jsonResponse(400, { ok: false, message: 'Unknown provider.' })
}
```

Redeploy: `supabase functions deploy save-key`.

- [ ] **Step 13.3: UI changes in AiSettingsPanel**

Add a new section under the existing provider/key UI:

```tsx
<section className="settings-section">
  <h3>RAG embedding provider</h3>
  <p className="settings-help">
    Used when indexing your project for "Ask". If left on Auto, we pick whichever
    of your saved keys offers embeddings (Gemini → OpenAI → Voyage).
  </p>
  <select
    value={settings.ragEmbeddingProvider ?? ''}
    onChange={(e) => onChangeRagProvider(e.target.value as any)}
  >
    <option value="">Auto</option>
    <option value="gemini" disabled={!settings.hasGeminiKey}>Gemini (text-embedding-004)</option>
    <option value="openai" disabled={!settings.hasOpenaiKey}>OpenAI (text-embedding-3-small)</option>
    <option value="voyage" disabled={!settings.hasVoyageKey}>Voyage (voyage-3)</option>
  </select>
  {settings.aiProvider === 'anthropic-byok' && !settings.hasGeminiKey && !settings.hasOpenaiKey && !settings.hasVoyageKey && (
    <div className="settings-warning">
      Anthropic doesn't offer embeddings. Add a Gemini, OpenAI, or Voyage key above to enable Ask.
    </div>
  )}
</section>
```

Add a Voyage key entry following the same pattern as the other three keys.

- [ ] **Step 13.4: Type-check + dev verify**

Run: `npx tsc --noEmit` then `npm run dev`. Verify the settings panel shows the new section, options grey out if no key is saved, and the Anthropic-only warning appears in the right scenario.

- [ ] **Step 13.5: Commit**

```bash
git add supabase/migrations/20260504190300_add_embedding_provider_setting.sql src/lib/aiSettings.ts src/ai/types.ts src/components/AiSettingsPanel.tsx supabase/functions/save-key/index.ts
git commit -m "feat(settings): RAG embedding provider picker + Voyage key support"
```

---

## Task 14: Snapshot rendering in Report (HTML preview, PDF, DOCX, CSV/XLSX)

**Files:**
- Modify: `src/report/ReportPreview.tsx` (or equivalent)
- Modify: `src/report/exporters/pdf.ts`
- Modify: `src/report/exporters/docx.ts`
- Modify: `src/report/exporters/csv.ts`
- Modify: `src/report/exporters/xlsx.ts`
- Create: `src/components/SynthesisText.tsx` (extracted from AskPanel for sharing)

Spec §"Snapshot + Report integration".

- [ ] **Step 14.1: Extract `SynthesisText` to its own file**

Move `function SynthesisText` from `AskPanel.tsx` into `src/components/SynthesisText.tsx` and add a `mode` prop:

```tsx
// src/components/SynthesisText.tsx
import type { ReactNode } from 'react'
import type { QuoteAuditEntry } from '../ai/types'

type Props = {
  text: string
  audit: QuoteAuditEntry[]
  mode?: 'panel' | 'report'   // 'report' adds * footnote markers after each unverified span
}

export function SynthesisText({ text, audit, mode = 'panel' }: Props) {
  if (audit.length === 0) return <p className="ask-synthesis-body">{text}</p>
  const sorted = [...audit].sort((a, b) => a.spanStart - b.spanStart)
  const parts: Array<ReactNode> = []
  let cursor = 0
  sorted.forEach((q, i) => {
    if (q.spanStart > cursor) parts.push(text.slice(cursor, q.spanStart))
    const cls = q.verified ? 'quote-verified' : 'quote-unverified'
    const title = q.verified ? 'Verified against the cited source' : 'This quoted phrase could not be verified'
    parts.push(<span key={i} className={cls} title={title}>{text.slice(q.spanStart, q.spanEnd)}</span>)
    if (mode === 'report' && !q.verified) parts.push('*')
    cursor = q.spanEnd
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <p className="ask-synthesis-body">{parts}</p>
}
```

Update `AskPanel.tsx` to import this shared component instead of declaring its own.

- [ ] **Step 14.2: HTML preview**

In the snapshot renderer's switch on `result_kind` (likely `src/report/ReportPreview.tsx`), add the `'ask'` case:

```tsx
case 'ask': {
  const r = snapshot.results
  return (
    <section className="report-snapshot report-ask">
      <h3>Ask: {r.question}</h3>
      {r.synthesis && (
        <>
          <SynthesisText text={r.synthesis} audit={r.quoteAudit} mode="report" />
          {r.quoteAudit.some((q) => !q.verified) && (
            <p className="report-footnote">* This quoted phrase was not verified against the cited source.</p>
          )}
        </>
      )}
      <ol className="report-evidence-list">
        {r.evidence.map((e, i) => (
          <li key={i}>
            <strong>[{i + 1}] {e.sourceTitle}{e.pageNumber != null ? `, p. ${e.pageNumber}` : ''}</strong>
            <p>{e.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
```

- [ ] **Step 14.3: PDF exporter (`jspdf`)**

Add an `if (snap.result_kind === 'ask')` branch to the per-snapshot loop in `pdf.ts`:

```ts
if (snap.result_kind === 'ask') {
  const r = snap.results
  pdf.setFont('helvetica', 'bold').setFontSize(14)
  pdf.text(`Ask: ${r.question}`, marginX, cursorY); cursorY += 20
  pdf.setFont('helvetica', 'normal').setFontSize(11)

  if (r.synthesis) {
    const annotated = applyAuditMarkers(r.synthesis, r.quoteAudit)
    const wrapped = pdf.splitTextToSize(annotated, contentWidth)
    pdf.text(wrapped, marginX, cursorY)
    cursorY += wrapped.length * 14
    if (r.quoteAudit.some((q) => !q.verified)) {
      pdf.setFontSize(9).setTextColor(120, 0, 0)
      const note = pdf.splitTextToSize('* This quoted phrase was not verified against the cited source.', contentWidth)
      pdf.text(note, marginX, cursorY); cursorY += note.length * 11
      pdf.setTextColor(0, 0, 0).setFontSize(11)
    }
  }

  r.evidence.forEach((e, i) => {
    const cit = `[${i + 1}] ${e.sourceTitle}${e.pageNumber != null ? `, p. ${e.pageNumber}` : ''}`
    pdf.setFont('helvetica', 'bold').text(cit, marginX, cursorY); cursorY += 14
    pdf.setFont('helvetica', 'normal')
    const wrapped = pdf.splitTextToSize(e.text, contentWidth)
    pdf.text(wrapped, marginX + 12, cursorY); cursorY += wrapped.length * 12 + 4
  })
}

function applyAuditMarkers(text: string, audit: QuoteAuditEntry[]): string {
  if (audit.length === 0) return text
  const sorted = [...audit].sort((a, b) => b.spanStart - a.spanStart)
  let out = text
  for (const q of sorted) {
    if (q.verified) continue
    out = out.slice(0, q.spanEnd) + '*' + out.slice(q.spanEnd)
  }
  return out
}
```

- [ ] **Step 14.4: DOCX exporter (`docx`)**

In `src/report/exporters/docx.ts`:

```ts
if (snap.result_kind === 'ask') {
  const r = snap.results
  paragraphs.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`Ask: ${r.question}`)] }))
  if (r.synthesis) {
    const runs = buildAuditedRuns(r.synthesis, r.quoteAudit)
    paragraphs.push(new Paragraph({ children: runs }))
    if (r.quoteAudit.some((q) => !q.verified)) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: '* This quoted phrase was not verified against the cited source.', italics: true, color: 'C0392B', size: 18 })] }))
    }
  }
  r.evidence.forEach((e, i) => {
    const cit = `[${i + 1}] ${e.sourceTitle}${e.pageNumber != null ? `, p. ${e.pageNumber}` : ''}`
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: cit, bold: true })] }))
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: e.text })] }))
  })
}

// Helper:
function buildAuditedRuns(text: string, audit: QuoteAuditEntry[]): TextRun[] {
  if (audit.length === 0) return [new TextRun(text)]
  const sorted = [...audit].sort((a, b) => a.spanStart - b.spanStart)
  const runs: TextRun[] = []
  let cursor = 0
  for (const q of sorted) {
    if (q.spanStart > cursor) runs.push(new TextRun(text.slice(cursor, q.spanStart)))
    const span = text.slice(q.spanStart, q.spanEnd)
    runs.push(q.verified
      ? new TextRun({ text: span })
      : new TextRun({ text: span, color: 'C0392B', underline: { type: 'dotted' } }))
    cursor = q.spanEnd
  }
  if (cursor < text.length) runs.push(new TextRun(text.slice(cursor)))
  return runs
}
```

- [ ] **Step 14.5: CSV / XLSX exporters**

In `src/report/exporters/csv.ts` and `xlsx.ts`, add a per-ask-snapshot section:

```ts
if (snap.result_kind === 'ask') {
  const r = snap.results
  rows.push(['Question', r.question])
  rows.push(['Citation', 'Page', 'Score', 'Quote text'])
  r.evidence.forEach((e) => {
    rows.push([
      e.sourceTitle,
      e.pageNumber != null ? String(e.pageNumber) : '',
      e.score.toFixed(3),
      e.text,
    ])
  })
  rows.push([])
}
```

XLSX uses the same row arrays, lifted into a worksheet by SheetJS via the existing pattern.

- [ ] **Step 14.6: Verify in dev**

Pin an ask snapshot, switch to Report mode, verify:
- HTML preview shows the synthesis with quote highlights and the evidence list
- PDF export includes the section
- Word export includes the section with the unverified-quote color
- CSV export includes the per-chunk rows

- [ ] **Step 14.7: Commit**

```bash
git add src/report/ src/components/SynthesisText.tsx src/analyze/panels/AskPanel.tsx
git commit -m "feat(report): render Ask snapshots in preview, PDF, DOCX, CSV/XLSX"
```

---

## Task 15: Autosave-driven ingest trigger

**Files:**
- Modify: `src/App.tsx`

Spec §"Triggers (client-side, in `App.tsx` autosave path)".

- [ ] **Step 15.1: Hook into the autosave success path**

After a successful autosave that touched a source's `content`, schedule a debounced ingest call. Use a `Map<sourceId, ReturnType<typeof setTimeout>>` keyed by source id so per-source debounce is independent.

```ts
import { embedSourceIfStale } from './ai/rag'

const ingestTimers = useRef(new Map<string, number>())

function scheduleIngest(projectId: string, sourceId: string) {
  const existing = ingestTimers.current.get(sourceId)
  if (existing) clearTimeout(existing)
  const timer = window.setTimeout(() => {
    void embedSourceIfStale({ projectId, sourceId })
      .catch((e) => console.warn('rag ingest failed', e))
    ingestTimers.current.delete(sourceId)
  }, 5000)
  ingestTimers.current.set(sourceId, timer)
}
```

Call `scheduleIngest(projectId, sourceId)` from the source-edit / source-create paths after the persistence write succeeds. **Do not** call from source-delete (the cascade FK handles that).

- [ ] **Step 15.2: Cleanup on unmount**

```ts
useEffect(() => {
  return () => {
    for (const t of ingestTimers.current.values()) clearTimeout(t)
    ingestTimers.current.clear()
  }
}, [])
```

- [ ] **Step 15.3: Verify**

Run: `npm run dev`. Edit a source's content; wait 5s; check `fieldnote_source_chunks` for an updated `created_at` or new chunk count via the Supabase dashboard.

- [ ] **Step 15.4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(rag): debounced ingest on source edit"
```

---

## Task 16: Privacy policy addendum

**Files:**
- Modify: `docs/privacy-policy.md` (mirrored to `public/privacy-policy.md` via existing symlink)

Spec §"Privacy policy addendum".

- [ ] **Step 16.1: Append to the "What we send to AI providers" section**

```markdown
### Ask / RAG

If you enable Ask, your question and the relevant excerpts from your project's
sources are sent to your selected embedding and generation providers.
Embedding happens once per source (at import or edit) and ships only the
source text. Each Ask query ships your question to the embedding provider;
each Summarize action ships the question plus the chunks you've checked
to the generation provider. Nothing else from your project — memos, codes,
cases, attributes, other sources — is included.

Bring-your-own-key is required for Ask. The free hosted Gemini tier is
not available for RAG synthesis because the cost of a hallucinated quote
in a researcher's manuscript is unacceptable; routing every query through
a stronger BYOK model raises the bar.
```

- [ ] **Step 16.2: Verify the symlink still resolves**

Run: `ls -la public/privacy-policy.md`. Expected: symlink pointing at `../docs/privacy-policy.md`. Browser-load `/privacy-policy.md` from the dev server to confirm the new text renders.

- [ ] **Step 16.3: Commit**

```bash
git add docs/privacy-policy.md
git commit -m "docs(privacy): addendum for RAG / Ask data flow"
```

---

## Task 17: Manual end-to-end verification + handoff update

**Files:**
- Modify: `handoff.md` — wave entry under Mode Shell Status

- [ ] **Step 17.1: Run the spec's manual test plan**

Spec §"Testing strategy" → "Manual test plan". Execute steps 1–7 in order against a sample project. Note any surprise behavior in a scratch file.

- [ ] **Step 17.2: Update handoff.md Mode Shell Status with a wave entry**

Add at the end of the Mode Shell Status bullet list:

```markdown
- RAG / Ask v1 (2026-05-04): new "Ask" question type in Analyze. Evidence-finder default with opt-in synthesis; BYOK-only (Gemini / OpenAI / Anthropic generation, Gemini / OpenAI / Voyage embeddings). Structure-aware chunker (page-per-chunk for PDFs, paragraph-pack for transcripts) writes to `fieldnote_source_chunks` (pgvector with three partial HNSW indexes per supported dim). Three Edge Functions (`ai-rag-ingest`, `ai-rag-query`, `ai-rag-synthesize`) sibling to `ai-call`. Synthesis post-processed for verified-quote highlighting (substring match against cited chunks after smart-quote/dash/whitespace normalization); unverified quotes rendered with red dotted underline + footnote in Report. Snapshots use a new `result_kind: 'ask'` and round-trip through Report HTML/PDF/DOCX/CSV/XLSX with full evidence preserved. Settings: per-provider matched embeddings with manual override; Voyage key entry added for Anthropic-only users. Privacy policy addendum covers the new data flow. Spec at `docs/superpowers/specs/2026-05-04-rag-ask-your-data-design.md`. Out-of-scope follow-ups (cross-project Ask, reranking, multi-turn, native PDF canvas, hosted-tier RAG, "why this evidence" explainer) preserved in spec §"Out of scope for v1".
```

- [ ] **Step 17.3: Update handoff.md "Required Next Step" — drop item 2 (RAG)**

Renumber the list so cross-project search becomes #2, native PDF canvas becomes #3, etc. Add a brief note under cross-project search reflecting that the RAG retrieval pipeline is now the foundation it builds on.

- [ ] **Step 17.4: Final commit**

```bash
git add handoff.md
git commit -m "docs(handoff): record RAG / Ask v1 wave"
```

---

## Self-review

After completing the plan, walk back through it with a critical eye:

**Spec coverage:**
- §Data model → Tasks 0, 13 (settings column)
- §Architecture → Tasks 5, 7, 8, 9 (client + three Edge Functions)
- §Chunking pipeline → Tasks 1, 2 (offsets + chunker)
- §Retrieval → Task 8
- §Synthesis + quote verification → Tasks 4, 9
- §UI surface → Tasks 10, 11, 12
- §Snapshot + Report integration → Task 14
- §BYOK + cost model → Tasks 3, 13
- §Privacy policy addendum → Task 16
- §Edge cases → Distributed across the Edge Function tasks (advisory lock = Task 7, dim mismatch = Tasks 7/8/13, archived sources = Task 8 retrieval join, relevance floor = Task 8, key revoked = Tasks 7/8/9 surface 4xx verbatim)
- §Testing strategy → Tasks 1 (sourcePages), 2 (chunker), 4 (quoteVerify), 17 (manual)
- §Out of scope → Not implemented; preserved in spec

**Type / name consistency:**
- `matchedChunkId` used everywhere (audit) ✓
- `embedding_768` / `embedding_1024` / `embedding_1536` consistent ✓
- `EMBEDDING_MODELS` / `GENERATION_MODELS` constants referenced from both client and Deno (Deno has a duplicated literal — flagged in Task 7 Step 7.1 comment for future cleanup)
- `RagChunkCitation` field names match across `src/ai/types.ts`, the Edge Function response, and the snapshot payload ✓
- `result_kind: 'ask'` consistent in DB, type union, and renderers ✓

**Placeholder scan:** no `TBD`, `TODO`, "implement later", or vague "add error handling" steps. Every code change has the actual code; every test has the actual assertions; every command shows expected output.

**Open implementation choices to flag during execution:**
- Step 1.5: existing `sourcePages` test may need updating depending on whether it asserted body trimming on the synthetic page. The plan tells the executing agent to update that test or restore trimming and adjust contracts — pick one and document.
- Task 12: state-lifting choice (Context vs zustand vs prop drilling) — the plan recommends a small Context but doesn't insist; pick whatever matches the surrounding pattern in `AnalyzeInspector`.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-04-rag-ask-your-data.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
