# AI Assist v1 — Design Spec

**Status:** Approved 2026-05-01

## Goal

Ship a thin, principled AI-assist layer in Fieldnote that augments coding without replacing the researcher's judgment. Default to a free hosted Gemini Flash path so a researcher with no API key can try it; fall back to BYOK (Bring Your Own Key) for any paid provider when the user adds one.

## Principles (load-bearing — every later decision derives from these)

1. **AI proposes, never writes.** Every AI output passes through an approval gate. The codebook, memos, and excerpts are user-authored; the AI is a clipboard.
2. **Visibility before send.** Every AI call shows a preview of exactly what text and how many tokens will leave the device. No hidden context.
3. **Local-first features stay deterministic.** Word frequency, crosstabs, search, etc. are clearly *not* AI. Outputs that mix the two are labeled.
4. **Bring your own key is a first-class path.** Power users with institutional API budgets pay their own provider; nothing routes through Fieldnote's server in that case.
5. **Cache deterministic ops, never cache brainstorming.** Same source content → same summary forever. Same selected text → fresh code suggestions every time.

## Non-goals (v1)

- "Ask your data" RAG / project-wide Q&A
- Embeddings-based "find similar passages"
- Streaming responses (just await full response)
- AI-drafted source memos or code memos beyond the project memo
- Auto-applying any AI output without an explicit approval click
- Per-user usage quotas (replaced by spend monitoring + kill switch)

## Architecture

Two paths sharing a single router and prompt-template source of truth.

### Hosted path (default — `aiProvider === 'gemini-free'`)

```
Browser → Supabase Edge Function (/ai-call) → Gemini Flash → Edge Function → Browser
```

The Edge Function holds the Gemini API key in Supabase secrets. The browser never sees the key. The Function writes one row to `fieldnote_ai_calls` per call (audit + spend ledger).

### BYOK path (`aiProvider === '<provider>-byok'`)

```
Browser → user's provider API → Browser
```

User's API key lives encrypted in `fieldnote_user_settings.encrypted_keys` (pgcrypto symmetric encryption keyed off a server-side encryption secret stored in Supabase secrets). Encryption happens server-side in a `/save-key` Edge Function — the browser sends the plaintext key over HTTPS once at save time, the function encrypts and stores. To use the key, a separate `/get-my-keys` Edge Function decrypts and returns the plaintext to the authenticated user once per session; the browser caches it in memory until reload. After that one-shot retrieval, AI calls go direct from browser to provider — no per-call round-trip through Fieldnote's server. Browser writes its own audit row to `fieldnote_ai_calls` for the user's records (no cost estimation since the user is billed by their provider).

### Router

`src/ai/router.ts` is the single entry point. Takes `{ kind, inputText, projectId, cacheable }`, returns `{ ok, response, cacheHit }` or `{ ok: false, reason }`. Branches on `userSettings.aiProvider`. Same return shape regardless of path so callers don't care.

### Prompt templates

`src/ai/prompts.ts` is the single source of truth. Each template has a versioned id (e.g. `SUGGEST_CODES_V1`). Bumping the version invalidates the cache for that kind.

The Edge Function needs the same prompt logic but Supabase Edge Functions run on Deno and can't import from `src/`. A small **predeploy script** (`scripts/sync-edge-prompts.ts`) copies `src/ai/prompts.ts` to `supabase/functions/ai-call/prompts.ts`, rewriting any TypeScript imports for Deno compatibility. The script runs in the build step (`npm run build` and the Vercel deploy hook) and fails CI if the source file's exports change shape. The copy is gitignored to prevent manual drift.

Both client and server validate the incoming `kind` against a fixed allow-list before constructing the prompt — a malicious client cannot inject arbitrary prompts to burn the project-wide API key.

## Schema

```sql
-- Per-user AI settings + encrypted API keys + IRB consent timestamp.
create table fieldnote_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_provider text not null default 'gemini-free',
  -- 'gemini-free' | 'gemini-byok' | 'openai-byok' | 'anthropic-byok'
  encrypted_keys jsonb not null default '{}'::jsonb,
  -- shape: { gemini: '<base64 ciphertext>', openai: '...', anthropic: '...' }
  hosted_ai_consent_at timestamptz,
  -- IRB warning acknowledged at this time; null means not yet consented
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Audit log + spend ledger + cache. One row per AI call (cached or live).
create table fieldnote_ai_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references fieldnote_projects(id) on delete cascade,
  kind text not null,
  -- 'suggest_codes' | 'draft_description' | 'summarize_source' | 'draft_memo'
  provider text not null,
  -- 'gemini-free' | 'gemini-byok' | 'openai-byok' | 'anthropic-byok'
  content_hash text not null,
  -- sha256(model || '\n' || prompt_template_id || '\n' || input_text)
  prompt_tokens int,
  completion_tokens int,
  estimated_cost_usd numeric(10, 6),
  -- only set on hosted (gemini-free) calls; BYOK calls bill the user
  response jsonb not null,
  cache_hit boolean not null default false,
  created_at timestamptz default now()
);

create index on fieldnote_ai_calls (content_hash, kind);
create index on fieldnote_ai_calls (user_id, created_at desc);
create index on fieldnote_ai_calls (created_at) where provider = 'gemini-free';

-- Daily spend log written by a cron job (pg_cron or Vercel cron).
create table fieldnote_ai_cost_log (
  date date primary key,
  total_usd numeric(10, 4) not null default 0,
  call_count int not null default 0,
  computed_at timestamptz not null default now()
);
```

RLS: standard user-scoped policies on `fieldnote_user_settings` and `fieldnote_ai_calls`; `fieldnote_ai_cost_log` is admin-read-only.

Encryption: `pgp_sym_encrypt(value, $SUPABASE_ENCRYPTION_SECRET)` for `encrypted_keys` values. Decryption client-side via the same secret pulled from a session-bound Supabase Vault read.

## UI surfaces

### Settings panel

Reachable via gear icon in the app header (left of sign-out). Modal in v1.

```
AI Assist

○ Use Fieldnote's free Gemini quota (default)
○ Bring your own key
   Provider: [Gemini ▼]   API key: [····················]
   [Test connection]

[ ] (only shown when free tier selected) I understand free-tier
    prompts may be used to train Google's models. For IRB-protected
    research, use my own paid key in Settings.
```

When `gemini-free` is selected, the IRB checkbox must be ticked at least once before any hosted AI call (creates `hosted_ai_consent_at`).

### "Suggest codes" — Code mode quick-code menu

Adds a single button row to the existing quick-code popover, just below the selected-text preview:

```
[selected text excerpt]
[ ✨ Suggest codes ]   ← new
─── (existing menu: New code input, code chips, Apply N codes button)
```

Click flow:
1. Inline preview replaces the menu body: "This will send ~487 tokens (~$0.00009): '<truncated input>'." Buttons: [Cancel] [Send].
2. On Send, "Thinking..." spinner.
3. Result: list of 5 suggestions, each row `[ ✓ ] Code name — short description`. All checked by default.
4. Bottom: [Apply selected codes] (count updates as user toggles checkboxes).
5. Click Apply: each checked suggestion that's a new code gets created in the codebook (with the AI's description). All checked codes get applied to the active selection. Modal closes.
6. Existing names match case-insensitively against the codebook so the AI can't create dupes accidentally.

### "Draft description" — Refine

In `RefineDetail`, when the active code has ≥3 references and the description is empty or shorter than 30 chars, a small button appears next to the Description label: `✨ Draft from references`.

Click flow:
1. Inline preview: "This will send the names + first sentence of all 8 references, ~610 tokens (~$0.0001)." [Cancel] [Send]
2. On Send, "Thinking..." spinner replaces the description input.
3. Result populates the description input value (does not auto-save). User can edit before clicking the existing description-update path.

### "Summarize source" — Organize

In `OrganizeInspector` (right rail when a source is selected), a small button: `✨ Summary`.

Click flow:
1. Preview: "Will send the full source content, ~6,000 tokens (~$0.0007)." [Cancel] [Send]
2. Spinner.
3. Result renders inline below the button as 3 sentences. Cached forever (until source content changes — content hash includes source text).
4. A small `Refresh ↻` button next to a cached summary forces a new call (rare; researchers usually want consistency).

### "Draft project memo" — Overview

In `OverviewMode`, near the project memo textarea, a small button: `✨ Draft from snapshots`.

Click flow:
1. Preview: "Will send the labels + excerpts from your N pinned snapshots, ~M tokens." Only enabled when ≥1 snapshot exists. [Cancel] [Send]
2. Spinner.
3. Result populates the project memo textarea (replaces existing content with confirmation if non-empty).

## Caching, cost monitoring, kill switch

### Cache (deterministic kinds only)

`cacheable: true` for `draft_description`, `summarize_source`, `draft_memo`. `cacheable: false` for `suggest_codes` (brainstorming, fresh ideas every time).

Hash: `sha256(model + '\n' + prompt_template_id + '\n' + inputText)`.

Lookup happens in `router.ts` before any provider call. Cache hits return immediately with `cacheHit: true`.

### Cost monitoring

Daily Supabase pg_cron job aggregates `fieldnote_ai_calls` where `provider = 'gemini-free'` for the prior 24 hours and writes to `fieldnote_ai_cost_log`. A Supabase webhook (configurable threshold, default $5/day) emails the project owner if exceeded.

Per-call: the Edge Function returns the cost estimate alongside the response so the client can show "This call: ~$0.0001" in the UI footer of the suggestion panel.

### Kill switch

Single env var on the Edge Function: `AI_KILL_SWITCH=1`. When set, the Function returns `{ ok: false, reason: 'kill-switch', message: 'Hosted AI temporarily disabled. Add your own API key in Settings to continue.' }` without calling Gemini. The client surfaces this as a sticky yellow banner in the AI surfaces; users with their own key are unaffected.

## Implementation order

1. **AI-0 — Foundation.** Schema migration, Settings panel, AI router skeleton, Edge Function skeleton with kill-switch, cost-monitoring cron. No features wired yet — just plumbing. ~1 day.
2. **AI-1 — Suggest codes.** Quick-code menu integration, end-to-end smoke through both hosted and BYOK paths. ~half-day.
3. **AI-2 — Draft description.** Refine integration. ~half-day.
4. **AI-3 — Summarize source.** Organize integration. ~half-day.
5. **AI-4 — Draft project memo.** Overview integration, reuses the snapshot infrastructure already shipped. ~half-day.

## Files

**Created:**
- `src/ai/router.ts` — entry point, both paths
- `src/ai/prompts.ts` — prompt templates with versioned ids (single source of truth)
- `src/ai/types.ts` — shared types (`AiCallInput`, `AiCallResult`, `AiResponse`)
- `src/components/AiSettingsPanel.tsx` — modal, provider picker, key entry, IRB checkbox
- `src/components/AiSuggestionsPanel.tsx` — generic preview/loading/results panel reused by all four tools
- `scripts/sync-edge-prompts.ts` — predeploy script that copies `src/ai/prompts.ts` to the Edge Function
- `supabase/functions/ai-call/index.ts` — Edge Function entry
- `supabase/functions/save-key/index.ts` — Edge Function for encrypted key storage
- `supabase/functions/get-my-keys/index.ts` — Edge Function for one-shot decryption per session
- `supabase/migrations/20260501190000_add_ai_assist_tables.sql` — schema migration

`supabase/functions/ai-call/prompts.ts` is generated by the predeploy script and gitignored.

**Modified:**
- `src/App.tsx` — Settings gear icon in header; wire AI router into Code/Refine/Organize/Overview surfaces
- `src/modes/code/CodeDetail.tsx` — add Suggest codes button to quick-code menu
- `src/modes/refine/RefineDetail.tsx` — add Draft description button
- `src/modes/organize/OrganizeInspector.tsx` — add Summarize source button
- `src/modes/overview/OverviewMode.tsx` — add Draft project memo button

## Verification

1. With no key set, click Suggest codes → IRB modal appears once → check + Send → 5 suggestions appear → ✓/✗ subset → Apply → those codes appear in the codebook and on the excerpt.
2. With a Gemini BYOK key set, run the same flow → confirm no Edge Function call (DevTools network tab); call goes direct to `generativelanguage.googleapis.com`.
3. Run summarize on a source twice → first hits provider, second is instant from cache. Edit the source, run again → fresh call.
4. Set `AI_KILL_SWITCH=1` on the Edge Function → free-tier user sees the banner; BYOK user is unaffected.
5. Predeploy script test: change `src/ai/prompts.ts`, run the deploy script, verify `supabase/functions/ai-call/prompts.ts` is regenerated. The Function continues to use the same prompt logic without manual sync.

## Out of scope (named for clarity)

- Streaming responses
- Embeddings / "find similar passages"
- Project-wide RAG ("ask your data")
- Per-user quotas (replaced by spend monitoring + kill switch)
- AI-drafted code memos beyond drafting code descriptions (different feature; descriptions are short labels, memos are long-form synthesis)
- Auto-classify sources into cases via AI
- Multi-turn AI conversations / chat surfaces
