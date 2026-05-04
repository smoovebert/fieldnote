# RAG / "Ask your data" — design

**Status:** drafted 2026-05-04. Awaiting approval before implementation plan.

## Why

Fieldnote's AI assist v1 ships four one-shot tools — suggest codes, draft description, summarize source, draft project memo. The remaining piece of the AI thread, and the biggest single AI differentiator, is retrieval-augmented question-answering over the project's corpus: a researcher asks *"what do participants say about access barriers?"* and gets a ranked list of relevant excerpts (with page-level citations) plus an optional synthesized answer that quotes them.

The "Defend it" promise on the marketing page raises the stakes. A hallucinated quote in a researcher's manuscript is the worst possible failure mode. Two design forces fall out of that:

- **BYOK-only on launch.** Decided 2026-05-03. The free Gemini Flash tier is fine when the cost of a bad output is "user fixes the suggestion"; it is not fine when the cost is a fabricated participant quote in a manuscript. RAG ships behind a stronger-model BYOK gate (Anthropic Sonnet, GPT-4 class, Gemini Pro) from day one.
- **The interface puts evidence first, synthesis second.** The default is a ranked evidence list with citations the researcher can inspect; synthesis is an opt-in second step on top of an evidence set the researcher has already eyeballed.

This wedge also lays the foundation for the next AI roadmap item, cross-project repository search, which reuses the same retrieval pipeline scoped to the user's projects rather than a single project.

## Design decisions

The brainstorm narrowed scope through six questions. Decisions made:

1. **User job (Q1).** Evidence-finder is the default surface; synthesis is an opt-in per-query "Summarize these" step. Picked over evidence-only (gives up the differentiator) and synthesis-first (puts the riskiest output in front of the user before they've inspected its sources).

2. **Corpus scope (Q2).** Sources only, per-project. Memos and coded excerpts are *not* indexed in v1 — mixing analyst-authored memos with participant-authored sources gives the model no signal to distinguish "participant said X" from "researcher hypothesized X", and the latter showing up as a citation in a manuscript is just as bad as a fabricated quote. Cross-project search is a separate roadmap item that will reuse this pipeline.

3. **Chunk granularity (Q3).** Structure-aware. PDF pages become one chunk each (split on paragraph boundaries if a single page exceeds the size cap); transcripts and DOCX are paragraph-packed up to a target size without crossing hard line breaks. Each chunk records `(sourceId, pageNumber|null, charStart, charEnd)` so RAG citations format identically to the existing `formatExcerptCitation()` output ("Source" or "Source, p. N"). Picked over sliding-window (wastes the page-anchored citation primitive) and excerpt-only (uselessly narrow on day one of a study).

4. **Embedding provider (Q4).** Per-provider matched embeddings. A user's saved generation key picks the embedding model by default — Gemini key → `text-embedding-004`, OpenAI key → `text-embedding-3-small`, Anthropic key alone → block RAG and prompt the user to add a Gemini, OpenAI, or Voyage key (Anthropic doesn't offer native embeddings). Honest about data flow; one extra setup step for Anthropic-only users. Generation provider is *independent* from embedding provider — power users can mix.

5. **Surface + conversation model (Q5).** Lives in Analyze mode as a new "Ask" question type alongside Find excerpts, Codes by group, and the rest. One-shot per question (no multi-turn chat) so each Ask is atomic — when a researcher quotes a synthesized answer in a manuscript, they can point to a single snapshot row whose evidence list is preserved in full. Multi-turn would introduce evidence-attribution ambiguity that defeats "Defend it." Follow-up questions are still supported — they're just new questions.

6. **Citation rigor (Q6).** Verified-quote highlighting. Synthesis is post-processed: every double-quoted span is substring-matched (with smart-quote / dash / whitespace normalization) against the chunks the model cited. Verified quotes get a green check; unverified quotes get a red dotted underline + "this quoted phrase may not appear in the cited source" tooltip. Picked over soft (link-only — hides the failure surface) and strict (constrains the model away from quoting at all, silently degrading the quality of the verbatim-voice output researchers actually need).

## Data model

### New tables

```sql
-- One-time
create extension if not exists vector;

create table public.fieldnote_source_chunks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.fieldnote_projects(id) on delete cascade,
  source_id       uuid not null,
  -- Composite FK matches the (project_id, id) shape used elsewhere in
  -- normalized core objects so deletes cascade correctly.
  foreign key (project_id, source_id)
    references public.fieldnote_sources(project_id, id) on delete cascade,

  chunk_index     int  not null,    -- 0-based, ordered within source
  page_number     int,              -- nullable, mirrors Excerpt.pageNumber
  char_start      int  not null,    -- 0-based offset into source.content
  char_end        int  not null,    -- exclusive
  content         text not null,    -- exact substring; never re-derived

  embedding_model text not null,    -- e.g. 'text-embedding-3-small'
  embedding_dim   int  not null,    -- 768 / 1024 / 1536
  embedding_768   vector(768),      -- only one of the three is non-null,
  embedding_1024  vector(1024),     -- determined by the project's
  embedding_1536  vector(1536),     -- locked rag_embedding_model

  token_count     int  not null,
  content_hash    text not null,    -- sha256(content); ingest skip key
  created_at      timestamptz not null default now(),
  unique (project_id, source_id, chunk_index)
);

create index fieldnote_source_chunks_project_idx
  on public.fieldnote_source_chunks (project_id);
create index fieldnote_source_chunks_source_idx
  on public.fieldnote_source_chunks (project_id, source_id);

-- Three partial HNSW indexes, one per dimension.
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
```

The three-column pattern is the standard pgvector multi-model approach. NULLs are free in Postgres so storage cost is trivial; query path picks the column by the project's locked embedding model.

```sql
create table public.fieldnote_rag_asks (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.fieldnote_projects(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  question           text not null,

  -- Models recorded per-ask so a later provider switch doesn't make
  -- the audit row lie about what produced this answer.
  embedding_model    text not null,
  generation_model   text,                  -- null when only the evidence step ran

  -- Retrieved chunks: jsonb array of { chunk_id, score } ordered by relevance.
  -- Stored as jsonb (not a join table) so the score is frozen at ask time
  -- and chunk deletes don't cascade-nuke the ask row.
  retrieval          jsonb not null,

  synthesis          text,
  -- Per-quote audit: jsonb array aligned to character offsets in synthesis.
  -- Items: { spanStart, spanEnd, verified, matchedChunkId | null }
  quote_audit        jsonb,

  prompt_tokens      int,
  completion_tokens  int,
  estimated_cost_usd numeric(10, 6),
  status             text not null default 'ok',  -- 'ok' | 'failed'
  failure_reason     text,

  created_at         timestamptz not null default now()
);

alter table public.fieldnote_rag_asks enable row level security;
```

### Project-level state

```sql
alter table public.fieldnote_projects
  add column rag_embedding_model text,    -- pinned on first ingest
  add column rag_indexed_at timestamptz;  -- last full re-index timestamp
```

The first successful ingest pins `rag_embedding_model` for the project's lifetime. Switching providers later requires an explicit "Re-index project" action that deletes all chunks and re-embeds.

### Excerpt type — no changes

The page-anchored coding wedge already gave us `(sourceId, pageNumber, charOffset)` on `Excerpt`. RAG citations are produced on the fly from the chunk row's `(source_id, page_number)` via the existing `formatExcerptCitation()` helper.

### RLS pattern

`fieldnote_source_chunks` and `fieldnote_rag_asks` follow the AI-v1 lockdown pattern (migrations 190400–190800): RLS enabled, **all client SELECT/INSERT/UPDATE/DELETE revoked**. Edge Functions only, via service role, after JWT verification + project-ownership check.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (React/Vite)                         │
│                                                                      │
│  Analyze mode → Ask panel ─┬─► askEvidence()    ──► /functions/v1/   │
│                            │                       ai-rag-query      │
│                            └─► askSynthesize()  ──► /functions/v1/   │
│                                                    ai-rag-synthesize │
│                                                                      │
│  Source autosave ──────────► embedSourceIfStale ─► /functions/v1/   │
│                              (debounced 5s)        ai-rag-ingest    │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Supabase Edge Functions (Deno)                  │
│                                                                      │
│  ai-rag-ingest      embeds new/changed source chunks                 │
│  ai-rag-query       embeds question, retrieves top-K chunks          │
│  ai-rag-synthesize  generates grounded answer + verifies quotes      │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Postgres (Supabase)                         │
│                                                                      │
│  fieldnote_source_chunks    — text + embedding vector + metadata     │
│  fieldnote_rag_asks         — question + retrieval + synthesis audit │
│  fieldnote_query_results    — existing; gains result_kind = 'ask'    │
│  pgvector extension                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

Three Edge Functions, sibling to `ai-call`, each reusing its service-role + JWT-verify split, kill-switch checks, and per-instance RPM bucket. Two new client modules: `src/ai/rag.ts` (request shapes + the three calls) and `src/lib/chunker.ts` (pure-function chunker, also used server-side via a copy or shared `_shared/` deno module).

## Chunking pipeline

New module `src/lib/chunker.ts` (pure, unit-testable). The same module runs server-side inside `ai-rag-ingest`. The repo doesn't yet have a `supabase/functions/_shared/` directory — this work introduces one and places the chunker there; `ai-rag-ingest/index.ts` imports it via relative path (`../_shared/chunker.ts`), and the client `src/lib/chunker.ts` re-exports from the same source via a Vite alias (`@shared/chunker` → `supabase/functions/_shared/chunker.ts`). One source of truth, no transpile step between client and Deno because the chunker is dependency-free TypeScript.

```ts
export type Chunk = {
  chunkIndex: number
  pageNumber: number | null
  charStart: number
  charEnd: number
  content: string
  tokenCount: number
  contentHash: string
}

export function chunkSource(source: { content: string }, opts?: {
  targetTokens?: number   // default 600
  maxTokens?: number      // default 1200; split a page if exceeded
}): Chunk[]
```

**Algorithm:**

1. Detect PDF via `isPdfSource(content)` (existing helper in `src/lib/sourcePages.ts`).
2. **PDF path:** parse pages via an extended `parseSourcePages()` that also returns each page's `(charStart, charEnd)` byte offsets in the original `content` string (small extension to the existing helper — current return type is `{ pageNumber, body }`; v2 adds `charStart`, `charEnd`). For each page:
   - If `tokenCount(body) ≤ maxTokens`: one chunk, `pageNumber = N`, charStart/charEnd from the page record.
   - If `tokenCount(body) > maxTokens`: split on paragraph boundaries (`\n\n+`) and pack into sub-chunks of `targetTokens`; all share the same `pageNumber`. Sub-chunk char offsets are computed relative to `content` (page charStart + offset within page).
3. **Non-PDF path:** split on paragraph boundaries (`\n\n+`), pack greedily into chunks of `targetTokens`, never crossing a hard line break or paragraph boundary mid-chunk. `pageNumber = null` for every chunk.
4. Drop chunks where `content.trim().length < 20` (binary garbage, page numbers extracted as bare digits, etc.).
5. `contentHash = sha256(content)` per chunk; `tokenCount = approxTokenCount(content)` (existing 4-chars-per-token rule of thumb).

**Round-trip property:** for any chunk, `source.content.substring(chunk.charStart, chunk.charEnd) === chunk.content`. This is a unit-test invariant so the offsets stay trustworthy for click-to-source navigation.

### Ingestion entrypoint (`ai-rag-ingest`)

Inputs: `{ projectId, sourceId }`.

1. Verify caller owns the project (RLS-aware query through the auth client; ownership of the source through composite-key lookup against `fieldnote_sources`).
2. Acquire `pg_try_advisory_xact_lock(hashtextextended(project_id::text || source_id::text, 0))`. If unavailable, no-op (single-flight per source).
3. Load `source.content`, the project's `rag_embedding_model` (or compute the default from the user's saved keys if null).
4. Run `chunkSource`. Compute new `(chunk_index, content_hash)` set.
5. Diff against existing chunks for this source:
   - Same `(chunk_index, content_hash)` → skip.
   - Existing `chunk_index` with different hash → re-embed; update row.
   - New `chunk_index` → insert + embed.
   - Existing `chunk_index` no longer in the new set → delete.
6. Batch the embed calls to the provider (Gemini / OpenAI / Voyage) using the user's BYOK key for the embedding provider. Batch size = 100 chunks per call (provider-specific cap; OpenAI accepts up to 2048, Gemini 100, Voyage 128 — pick the lowest so one code path covers all).
7. Insert/update rows. Stamp `embedding_model`, `embedding_dim`, populate the matching `embedding_<dim>` column.
8. On completion: if this was the project's first ingest, set `rag_embedding_model`. Always update `rag_indexed_at`.

Triggers (client-side, in `App.tsx` autosave path):

- After a source is created or its `content` changes → debounced `embedSourceIfStale(sourceId)` 5 seconds after the last edit.
- After a source is deleted → cascade handles chunk removal; no explicit call needed.
- Manual "Re-index project" button (Settings or Ask panel banner) → server-side bulk path that deletes all chunks and re-embeds every non-archived source.

## Retrieval (`ai-rag-query`)

Inputs: `{ projectId, question }`.

1. Verify ownership.
2. Embed `question` using the project's `rag_embedding_model` + user's BYOK key.
3. Cosine-distance kNN against `fieldnote_source_chunks` for that project, top **K = 12**:
   ```sql
   select id, source_id, page_number, char_start, char_end, content,
          1 - (embedding_<dim> <=> $1) as score
     from fieldnote_source_chunks
    where project_id = $2
    order by embedding_<dim> <=> $1
    limit 12;
   ```
   The `<dim>` is one of three literal SQL fragments (`embedding_768` / `embedding_1024` / `embedding_1536`) selected by mapping the project's `rag_embedding_model` text to its dimension via the `EMBEDDING_MODELS` constant in `src/ai/ragModels.ts`, then `switch`ing on the result. No user input touches the SQL string — the only runtime parameters bound through Postgres are `$1` (the question vector) and `$2` (the project ID).
4. **No reranking in v1.** Cross-encoder rerank would help precision but adds another model dependency and another quota line; the human is in the loop visually inspecting the list anyway. Defer to v1.5.
5. Return chunk rows + `formatExcerptCitation()`-compatible metadata to the client. Insert `fieldnote_rag_asks` row with `retrieval` populated, `synthesis = null`. Return the new `askId` + chunks to the client.

**K = 12** because researchers can scan ~12 evidence rows in one screen, the synthesis step needs enough material to be substantive without blowing the context budget on small models, and empirically larger Ks add long-tail noise in qualitative corpora where many chunks are weakly-related.

**Relevance floor:** if the top score is below 0.3 (cosine similarity), return `{ chunks: [] }`. Client shows "No relevant evidence found — try rephrasing." No ask row created.

## Synthesis + quote verification (`ai-rag-synthesize`)

Inputs: `{ askId, includedChunkIds: string[] }` (the user can deselect chunks before synthesizing).

1. Verify ownership; load ask row + the included chunks.
2. Build prompt:
   ```
   System: You are helping a qualitative researcher analyze interview/document
   data. Answer the question using ONLY the evidence provided. Cite each
   claim with [N] referring to the numbered evidence below. When quoting
   a participant verbatim, use double quotes and ensure the quote appears
   in the cited evidence exactly as written. If the evidence does not
   support an answer, say so plainly.

   Question: {question}

   Evidence:
   [1] (Source A, p. 4) "...chunk content..."
   [2] (Source B) "...chunk content..."
   ...
   ```
3. Call generation provider via the existing `providers/{gemini,openai,anthropic}.ts` modules with the user's BYOK generation key. Generation provider is **independent** from embedding provider — user can have OpenAI embeddings + Anthropic generation (or any other combination).
4. **Quote verification post-process** — new `src/ai/quoteVerify.ts`:
   - Tokenize synthesis into spans wrapped in `"..."`, `"..."`, or `"..."` (curly + straight).
   - For each quoted span, identify its expected citation set: `[N]` markers within ~30 chars after the close quote, OR within the same sentence boundary, whichever is broader.
   - For each candidate chunk, run `normalizedSubstringMatch(quote, chunk.content)`. Normalization: collapse whitespace, normalize curly quotes to straight, normalize en/em dashes to ASCII hyphens, lowercase. Otherwise verbatim.
   - Result per quote: `{ spanStart, spanEnd, verified: boolean, matchedChunkId: id | null }`.
5. Update `fieldnote_rag_asks` row: `synthesis`, `quote_audit`, `generation_model`, token usage, cost.
6. Return synthesis + audit to client. Client renders verified quotes with a hover-checkmark, unverified with a red dotted underline + tooltip.

**No retry / regeneration** when verification fails. Per Q6: surface risk visually rather than hiding it. The "Defend it" promise is *the researcher can defend any quote* — not *the researcher never sees an unverified quote*.

## UI surface (Analyze mode)

`'ask'` joins the question-type union in `src/analyze/queryDefinition.ts`.

**Sidebar** (`AnalyzeSidebar`): new entry under the **Evidence** group: "Ask".

**Center pane** — new `src/analyze/panels/AskPanel.tsx`:

```
┌─ Ask ──────────────────────────────────────────────────────┐
│                                                            │
│  ┌─ Question ──────────────────────────────────────────┐   │
│  │ What do participants say about access barriers?     │   │
│  │                                                     │   │
│  │                            [ Find evidence ]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ─── Evidence (12) ────────────────── [ Summarize ▾ ] ──┐  │
│  ☑ [1] Maria interview, p. 4              score 0.89   │  │
│       "I waited three weeks for a callback..."         │  │
│       › Open in source                                 │  │
│  ☑ [2] Focus group 2 transcript           score 0.83   │  │
│       "Nobody told us the form had moved..."           │  │
│       › Open in source                                 │  │
│  ☐ [3] Policy memo PDF, p. 12             score 0.71   │  │
│       ...                                              │  │
│  ...                                                   │  │
│                                                            │
│  ─── Synthesis (Anthropic claude-sonnet-4-6) ──────────┐  │
│  Participants describe access barriers along three     │  │
│  axes: callback delays ("I waited three weeks for a    │  │
│  callback" [1]✓), unclear paperwork pathways ("Nobody  │  │
│  told us the form had moved" [2]✓), and intermittent   │  │
│  staff availability [4][7].                            │  │
│  ⚠ One quoted phrase could not be verified — see [5].  │  │
└────────────────────────────────────────────────────────────┘
```

- Question textarea + "Find evidence" button.
- Evidence list: numbered, with `formatExcerptCitation()` headers, score, chunk text, and a "Open in source" link that uses the existing per-source reader navigation (Code mode reader for PDFs scrolls to the right page; non-PDF reader uses `charStart`).
- Each evidence row has a checkbox so the researcher can drop irrelevant chunks before synthesizing. Default: all checked.
- "Summarize" button — disabled until at least one chunk is checked. On click: calls `ai-rag-synthesize` with the included chunk IDs; renders synthesis below with verified-quote highlights and an end-of-section unverified-quote summary if any.

**Right rail** (`AnalyzeInspector`, ask mode): current-question sentence + Pin (snapshot) + Send to Report buttons. Matches every other Analyze panel.

**Index status banner** at the top of the Ask panel:
- If `rag_embedding_model` is null → "This project hasn't been indexed yet. Index now (~M tokens, est ~$0.0X)." with a button.
- If any source's `updated_at` > `rag_indexed_at` → "N source(s) updated since last index. Re-index now." Soft warning, not blocking.

**Empty/error states:**
- Empty index: hide the Question box, show only the index banner.
- Question with zero retrieved chunks above floor: "No relevant evidence found — try rephrasing." No ask row created.
- Provider 4xx/5xx: surface the message verbatim (existing pattern from `ai-call`); ask row stamped `status='failed'` + `failure_reason`.

## Snapshot + Report integration

`SnapshotResults` (`src/lib/types.ts`) gains:

```ts
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

The `result_kind` in `fieldnote_query_results` migration `20260501200200_snapshots_multi_panel.sql` already accepts an open string — no constraint change needed; migration only adds `'ask'` to a comment listing the legal values.

**Report renderer** (HTML preview / PDF / DOCX):
- Section header: `Ask: {question}`
- Synthesis paragraph rendered with verified quotes inline; unverified quotes get a footnote marker `*` and a footnote at the section end: `* This quoted phrase was not verified against the cited source.`
- Evidence table: numbered rows with `formatExcerptCitation()` headers + chunk text.
- CSV / XLSX export: one row per evidence chunk with columns `[Question, Citation, Page, Score, Quote text]`.

Snapshots match the existing capture-at-pin-time pattern — chunk text and synthesis are frozen at snapshot creation, so deletion or edit of an underlying source after snapshot doesn't break the report.

## BYOK + cost model

`AiSettingsPanel` gains:

- **Embedding provider** select. Default: auto-pick by precedence Gemini > OpenAI > Voyage of the keys the user has saved. Manual override available. If user picks Anthropic generation but has no embedding-capable key, the Ask panel shows a setup prompt: *"Anthropic doesn't offer embeddings. Add a Gemini, OpenAI, or Voyage key in Settings to enable Ask."*
- **Estimated index cost** display per project: `"This project has N sources, ~M tokens. Indexing will cost ~$0.0X with your selected embedding provider."` Computed from `approxTokenCount` × provider pricing constants in a new `src/ai/pricing.ts` module.

**Generation model per provider (RAG-specific defaults):**

The existing `ai-call` function pins smaller, cheaper models (`gpt-4o-mini`, `claude-3-5-haiku-latest`) because the four v1 tools (suggest codes, draft description, summarize source, draft project memo) are low-stakes and benefit from low latency. RAG synthesis is the opposite: the cost of a bad output is a fabricated quote, and the user is paying directly. Defaults raise to a stronger tier:

- Gemini BYOK → `gemini-2.5-pro`
- OpenAI BYOK → `gpt-4o`
- Anthropic BYOK → `claude-sonnet-4-6` (or whatever the user's saved key has access to, falling back to `claude-3-5-sonnet-latest` on a model-unavailable error)

Models are constants in a new `src/ai/ragModels.ts` module so they're easy to bump as new releases ship. No user-facing model picker in v1.

**Embedding model per provider:**

- Gemini → `text-embedding-004` (768 dim)
- OpenAI → `text-embedding-3-small` (1536 dim)
- Voyage → `voyage-3` (1024 dim)

These are also constants in `src/ai/ragModels.ts`. Dimension is hard-bound to the model name; switching either one requires a project re-index.

**Quotas / kill-switches:**

- BYOK-only — no hosted-tier free-call counter for RAG. The existing `HOSTED_DAILY_CAP` doesn't apply to ask/ingest/query.
- Per-Function-instance RPM buckets reused from `ai-call`'s pattern: 30 req/min for `ai-rag-query`, 10 req/min for `ai-rag-synthesize`, 60 req/min for `ai-rag-ingest`.
- Hard input cap: question ≤ 2000 tokens; synthesis prompt (chunks + system) ≤ 50k tokens.
- Both kill switches honored. `HOSTED_AI_KILL_SWITCH` is a no-op for RAG (BYOK-only); `ALL_AI_KILL_SWITCH` blocks all three RAG functions.

**Audit:** `fieldnote_rag_asks` is the audit row. No separate `_calls` table — RAG queries are inherently uncacheable (context-dependent on the project's chunk set) so the `ai-call` cache mechanic doesn't apply.

## Privacy policy addendum

`docs/privacy-policy.md` (mirrored to `public/privacy-policy.md` via symlink) gains a paragraph under the "What we send to AI providers" section:

> If you enable Ask, your question and the relevant excerpts from your project's sources are sent to your selected embedding and generation providers. Embedding happens once per source (at import or edit) and ships only the source text. Each Ask query ships your question to the embedding provider; each Summarize action ships the question + the chunks you've checked to the generation provider. Nothing else from your project (memos, codes, cases, attributes, other sources) is included.

## Edge cases

- **Empty index:** Ask panel collapses to the index banner. Cmd+K-style search remains as the fallback for finding text without RAG.
- **Concurrent ingest** (two browser tabs editing the same source): single-flight via `pg_try_advisory_xact_lock(hashtextextended(...))`. Second caller no-ops cleanly.
- **Embedding-dim mismatch** (project's locked dim doesn't match the user's currently-selected provider): hard-block ingest with `"Embedding model changed since this project was indexed. Re-index this project to switch."` Same banner offers the re-index button.
- **Source content with binary garbage / non-UTF8** (some PDFs): chunker drops chunks where trimmed content is < 20 chars. Won't produce zero-chunk ingests on legitimate sources.
- **Source archived after ingest:** chunks remain in the index but are filtered out at retrieval time by joining `fieldnote_sources` and excluding `archived = true`. Researchers can un-archive without re-ingesting.
- **Provider key revoked / invalid:** ingest and query both surface the provider's 401 verbatim. No silent fallback to a different provider — the user must fix the key explicitly.
- **Race: source deleted while ingest in flight:** advisory lock + cascade FK + the post-embed UPSERT against the now-orphaned `(project_id, source_id)` returns zero rows; ingest exits cleanly.

## Out of scope for v1

These are explicitly deferred to v1.5+:

- Cross-project Ask (paired roadmap item; reuses this pipeline scoped across the user's projects)
- Reranking pass (cross-encoder)
- Multi-turn / chat
- Memos and coded excerpts in the index
- Streaming synthesis (one-shot only — render result when complete)
- Native PDF canvas highlight on quote-click (the click-to-source-reader path uses the existing extracted-text reader; native canvas is its own roadmap item)
- Hosted Gemini-free RAG tier
- "Why this evidence" explainer (LLM rationale per chunk match)
- Index freshness daemon (auto re-ingest stale sources without user action)
- Bulk re-index across all projects in account-settings

## Testing strategy

Following the project's pattern (Vitest unit tests; integration deferred per the handoff note on Phase 4 persistence-layer tests).

**Pure-function unit tests:**

- `src/lib/chunker.test.ts`
  - PDF page boundaries respected; oversized pages split on paragraphs.
  - Non-PDF paragraph packing; chunk sizes within target/max bounds.
  - Empty input → empty array.
  - Binary garbage → all chunks below the 20-char floor → empty array.
  - **Round-trip invariant:** for every chunk, `source.content.slice(chunk.charStart, chunk.charEnd) === chunk.content`. Property-tested across 50+ random source shapes.
  - PDF page-number assignment matches `parseSourcePages()` output.
- `src/ai/quoteVerify.test.ts`
  - Straight quotes, curly quotes, mixed.
  - Quote spanning multiple sentences.
  - Quote with no nearby citation → `verified: false`, `matchedChunkId: null`.
  - Quote with multiple candidate citations → verified against any matching one.
  - Smart-quote / em-dash / whitespace normalization (verbatim semantically, lossy lexically).
  - Unicode-normalized "smart" quotes match ASCII source.

**Edge Function smoke tests:** deferred per the existing handoff convention.

**Manual test plan** (to be executed before merging the implementation plan to main):

1. Sample-project import → run "Index now" → verify `fieldnote_source_chunks` populated with correct `page_number` and char-offset bounds for both PDF and transcript sources.
2. Ask a question against the sample project → verify retrieval returns relevant chunks with sensible scores; verify scores > 0.3 floor on at least the top 3.
3. Click Summarize → verify synthesis renders with `[N]` citations, verified quotes badged, intentional prompt-injection-style fabricated quote (manually inserted via temporary prompt edit) badged unverified.
4. Pin snapshot → Send to Report → verify Report HTML preview, PDF, and DOCX all render the synthesis + evidence table with correct citations.
5. Switch embedding provider in Settings → confirm Ask is blocked with re-index prompt; confirm re-index drops chunks and re-embeds.
6. Edit a source → wait 5s → verify ingest re-runs, re-embeds only changed chunks (check by row count + `content_hash` diff), preserves the rest.
7. Archive a source → confirm its chunks are excluded from retrieval but rows remain in the table; un-archive → confirm chunks reappear without re-ingest.

## Summary of decisions made without explicit approval

These calls were made during the design pass; flag any to revisit before implementation:

1. **K = 12** retrieved chunks
2. **No reranking in v1** (cosine top-K only)
3. **No streaming synthesis** — single response when complete
4. **Generation provider independent from embedding provider** — user can mix
5. **Index ingest auto-triggered on source edit** (debounced 5s), no opt-in flag
6. **Re-index is manual** when embedding provider changes (not automatic)
7. **No `rag_call` cache table** — every Ask hits the provider
8. **Relevance floor 0.3** for "no results" empty state
9. **Three pgvector columns** (768 / 1024 / 1536) instead of separate per-provider tables
10. **Privacy policy addendum** scoped to question + checked chunks per query
11. **Evidence-row checkbox default = all checked** so the common path is one click
12. **Index status banner is soft-warning** when stale; hard-block only when uninitialized or dim-mismatched
