# AI Assist v1 — Design Spec

**Status:** Approved 2026-05-01

## Goal

Ship a thin, principled AI-assist layer in Fieldnote that augments coding without replacing the researcher's judgment. Default to a free hosted Gemini Flash path so a researcher with no API key can try it; fall back to BYOK (Bring Your Own Key) for any paid provider when the user adds one.

## Principles (load-bearing — every later decision derives from these)

1. **AI proposes, never writes.** Every AI output passes through an approval gate. The codebook, memos, and excerpts are user-authored; the AI is a clipboard. AI drafts live in a separate preview surface and only enter project state when the user clicks Insert / Apply.
2. **Visibility before send.** Every AI call shows a preview of exactly what text and how many tokens will leave the device. No hidden context.
3. **Local-first features stay deterministic.** Word frequency, crosstabs, search, etc. are clearly *not* AI. Outputs that mix the two are labeled.
4. **Provider keys never reach the browser.** Both Fieldnote's shared Gemini key and any user-supplied BYOK key live exclusively in Edge Function secrets. All provider calls — hosted and BYOK — go through the Edge Function. This closes the entire XSS / browser-extension / devtools key-leak class.
5. **Hard caps before kill switches.** Per-user daily limits, per-request token caps, and per-minute rate limits are enforced server-side on every hosted call. Spend monitoring and the kill switch are backstops for emergencies, not the primary brake.
6. **Cache deterministic ops, never cache brainstorming.** Same source content → same summary for the same user. Same selected text → fresh code suggestions every time. Cache is user-scoped: two users with identical inputs never share a cache entry.

## Non-goals (v1)

- "Ask your data" RAG / project-wide Q&A
- Embeddings-based "find similar passages"
- Streaming responses (just await full response)
- AI-drafted source memos or code memos beyond the project memo
- Auto-applying any AI output without an explicit approval click
- Org-wide / admin-facing usage dashboards (we have per-user usage rows + a daily cost log; richer analytics are post-v1)

## Architecture

**Single path:** every AI call — hosted OR BYOK — routes through a Supabase Edge Function. Provider API keys (ours or the user's) never touch the browser.

```
Browser → Supabase Edge Function (/ai-call) → provider → Edge Function → Browser
```

The Function holds:
- The shared Gemini API key (Supabase secret) for `gemini-free` users
- The encryption secret for decrypting user-supplied BYOK keys server-side at call time

Routing inside the Function:
- `aiProvider === 'gemini-free'` → use the shared Gemini key
- `aiProvider === '<provider>-byok'` → load the user's `encrypted_keys[provider]`, decrypt with the server-side encryption secret, call the provider, discard the plaintext key in memory

The browser **never** receives a provider key. This closes the XSS / extension / devtools leak class entirely and avoids browser-CORS-restricted provider APIs (Anthropic and OpenAI block direct browser calls anyway in practice).

Settings flow:
- `/save-key` Edge Function — browser POSTs `{ provider, plaintextKey }` over HTTPS once. Function encrypts with the server secret and stores in `fieldnote_user_settings.encrypted_keys`. Returns OK.
- No `/get-my-keys` function. The browser has no reason to read keys back.
- Test-connection in Settings: a dedicated `/ai-call?kind=test_connection` flow that runs a tiny ping prompt with the user's key (decrypted server-side, used, discarded).

The Function writes one row to `fieldnote_ai_calls` per call (audit + spend ledger).

### Router

`src/ai/router.ts` is the single entry point. Takes `{ kind, inputText, projectId, cacheable }`, returns `{ ok, response, cacheHit }` or `{ ok: false, reason }`. Branches on `userSettings.aiProvider`. Same return shape regardless of path so callers don't care.

### Prompt templates

`supabase/functions/ai-call/prompts.ts` is the **server-only** source of truth. Each template has a versioned id (e.g. `SUGGEST_CODES_V1`). Bumping the version invalidates the cache for that kind.

The browser sends only `{ kind, inputText, projectId }`. The Edge Function validates `kind` against a fixed allow-list and constructs the prompt server-side. A malicious client cannot inject arbitrary prompts because the browser never sees or sends a prompt — only structured inputs the Function knows how to consume.

This single-source-of-truth design also closes the prompt-drift problem the earlier draft of this spec tried to solve with a sync script: there's only one place prompts live, full stop.

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

-- RLS / column access on fieldnote_user_settings: clients NEVER read
-- encrypted_keys. The table is exposed to clients via a view:
--
--   create view fieldnote_user_settings_safe as
--     select user_id, ai_provider, hosted_ai_consent_at, created_at, updated_at
--     from fieldnote_user_settings;
--
-- Client RLS allows SELECT / UPDATE on the safe view's columns only.
-- Inserting/updating encrypted_keys happens exclusively through the
-- /save-key Edge Function, which uses the service-role key to write the
-- column the client never sees. Defence in depth: even if the encryption
-- secret leaks, the ciphertext was never available to the client to
-- begin with.

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
  -- sha256(user_id || '\n' || model || '\n' || prompt_template_id || '\n' || input_text)
  -- user_id is part of the hash so cache lookups are user-scoped by construction;
  -- two users with identical input never share cache entries.
  prompt_tokens int,
  completion_tokens int,
  estimated_cost_usd numeric(10, 6),
  -- only set on hosted (gemini-free) calls; BYOK calls bill the user
  response jsonb not null,
  cache_hit boolean not null default false,
  created_at timestamptz default now()
);

create index on fieldnote_ai_calls (user_id, content_hash, kind);
create index on fieldnote_ai_calls (user_id, created_at desc);
create index on fieldnote_ai_calls (created_at) where provider = 'gemini-free';

-- Per-user daily usage roll-up. Hard cap enforced before each call.
create table fieldnote_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  call_count int not null default 0,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  primary key (user_id, date)
);

-- Daily aggregate spend log written by a cron job.
create table fieldnote_ai_cost_log (
  date date primary key,
  total_usd numeric(10, 4) not null default 0,
  call_count int not null default 0,
  computed_at timestamptz not null default now()
);
```

**RLS:** user-scoped on `fieldnote_user_settings`, `fieldnote_ai_calls`, and `fieldnote_ai_usage` — a user can only SELECT their own rows. `fieldnote_ai_cost_log` is admin-read-only.

**Encryption:** `pgp_sym_encrypt(value, $AI_KEY_ENCRYPTION_SECRET)` on `encrypted_keys` values. The secret lives **only** in Supabase Edge Function secrets. The browser never has access. All decrypt operations happen server-side inside the Function on each call, in memory only — the plaintext key is never logged, never returned to the client, never persisted anywhere unencrypted.

**Cache scoping:** The content hash includes `user_id` so cache lookups are user-scoped by construction. Two users coding the same passage will never share a cache entry. (The cost is marginal — Flash is ~$0.0001/call.)

**Retention / deletion:**
- `fieldnote_ai_calls.project_id` is nullable but cascades on project delete — when a user deletes a project, all its AI cache rows go with it.
- `user_id` cascades on user delete — full data scrub when a user closes their account.
- A "Clear AI cache" button in Settings deletes the user's `fieldnote_ai_calls` rows on demand.
- Drafts that the user discards are not stored; only applied/inserted text persists in the project tables.

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
2. On Send, "Thinking..." spinner.
3. Result lands in a **separate AI draft preview panel** below the description input — not in the description field itself. The panel shows the drafted text with two actions: [Insert into description] and [Discard].
4. Clicking Insert replaces the description input value; the user can edit before the existing autosave path persists it.
5. Clicking Discard removes the draft preview without touching the description.

Critically: the AI draft never reaches the `code.description` autosave path until the user clicks Insert. If they navigate away mid-preview, the draft is lost (intentional — drafts aren't research data).

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
3. Result lands in a **separate AI draft preview panel** below the project memo textarea — not in the textarea itself. Panel shows the drafted memo text with two actions: [Insert into memo] and [Discard].
4. Insert replaces the project memo content (with a confirm dialog if the existing memo is non-empty: "This will replace your existing project memo. Continue?"). After Insert, the user can edit before the standard autosave fires.
5. Discard removes the preview.

Same principle as `draft_description`: AI text never reaches the project's autosave path until the user explicitly clicks Insert.

## Caching, quotas, cost monitoring, kill switch

### Cache (deterministic kinds only)

`cacheable: true` for `draft_description`, `summarize_source`, `draft_memo`. `cacheable: false` for `suggest_codes` (brainstorming, fresh ideas every time).

Hash: `sha256(user_id + '\n' + model + '\n' + prompt_template_id + '\n' + inputText)`. The user_id is in the hash so cache scoping is enforced by hash construction, not just by RLS — even if RLS were misconfigured, two users would never share a cache entry.

Lookup happens server-side in the Edge Function before any provider call. Cache hits return immediately with `cacheHit: true`.

### Quotas (hard caps, enforced server-side)

The Edge Function enforces these limits per request, on the **hosted** path only:

| Limit | Free tier (`gemini-free`) | BYOK |
|---|---|---|
| Calls per user per day | 50 | unlimited |
| Tokens per request (input) | 20,000 | 50,000 |
| Tokens per request (output) | 2,000 | 4,000 |
| Calls per minute per user | 10 | 30 |

Why these numbers:
- 50 calls/day on free tier covers a serious researcher's workload (typical session: 10–30 suggest-code calls + 1–2 summaries) while preventing scripted abuse from burning the shared Gemini key.
- 20k input tokens caps a single source summary to roughly the size of an 80-page interview — anything bigger needs explicit chunking, not silent truncation.
- 10 RPM rate limit per user blocks accidental loops without visibly impeding manual use.
- BYOK gets higher caps because the user is paying — but still bounded as a sanity check (a runaway loop on the user's side shouldn't burn $1000 silently).

Quota enforcement is **atomic** — the naive read-check-increment pattern races under concurrent calls (multiple in-flight requests all read the pre-limit count and pass before any of them increment). Implement as a Postgres RPC inside a transaction:

```sql
create function reserve_ai_call(p_user_id uuid, p_estimated_input int)
returns table(ok boolean, reason text, today_count int)
language plpgsql as $$
declare
  v_count int;
begin
  insert into fieldnote_ai_usage (user_id, date, call_count, prompt_tokens, completion_tokens)
  values (p_user_id, current_date, 0, 0, 0)
  on conflict (user_id, date) do nothing;

  -- Lock the row for the rest of this transaction.
  select call_count into v_count
    from fieldnote_ai_usage
   where user_id = p_user_id and date = current_date
   for update;

  if v_count >= 50 then
    return query select false, 'daily-cap', v_count;
    return;
  end if;

  update fieldnote_ai_usage
     set call_count = call_count + 1,
         prompt_tokens = prompt_tokens + p_estimated_input
   where user_id = p_user_id and date = current_date;

  return query select true, ''::text, v_count + 1;
end $$;
```

Flow at each `/ai-call`:
1. Edge Function calls `reserve_ai_call(user_id, estimated_input_tokens)`. The RPC's `for update` lock serializes concurrent reservations; only the one that brings the row past 50 gets refused.
2. If `ok=false` → return quota error to client without touching the provider.
3. If `ok=true` → call the provider.
4. After the response, call `record_ai_call_actuals(user_id, actual_input, actual_output)` to replace the estimated input tokens with actuals and add output tokens. This update is naturally idempotent.

Failure handling: if the provider call fails after a successful reservation, the call still counts against the daily cap. Mild over-counting on errors is preferable to under-counting on races.

Rate limit (RPM) uses a small in-memory token bucket inside the Function (best-effort under horizontal scaling); the daily cap RPC is the real safety belt.

When a quota is hit, the Function returns `{ ok: false, reason: 'quota', message: 'Daily free-tier limit reached. Add your own key in Settings to continue.' }` without calling the provider. UI surfaces this as the same banner pattern as the kill switch.

### Cost monitoring

Daily Supabase pg_cron job aggregates `fieldnote_ai_calls` where `provider = 'gemini-free'` for the prior 24 hours and writes to `fieldnote_ai_cost_log`. A Supabase webhook (configurable threshold, default $5/day) emails the project owner if exceeded. This is a backstop, **not** the primary brake — the per-user quotas above are the primary brake.

Per-call: the Edge Function returns the cost estimate alongside the response so the client can show "This call: ~$0.0001" in the UI footer of the suggestion panel.

### Kill switches (two of them, scoped)

Two env vars on the Edge Function for two different emergencies:

- `HOSTED_AI_KILL_SWITCH=1` — disables only the `gemini-free` path. The Function returns `{ ok: false, reason: 'kill-switch-hosted', message: 'Hosted AI temporarily disabled. Add your own API key in Settings to continue.' }` for free-tier users. BYOK users are unaffected. **Use case:** runaway cost, Gemini outage, or any time we want to shed the shared-cost surface without disrupting paying users.
- `ALL_AI_KILL_SWITCH=1` — disables every path including BYOK. Returns `{ ok: false, reason: 'kill-switch-all', message: 'AI features temporarily disabled.' }`. **Use case:** a security incident — for example, a known prompt-injection vector against the Function — where we need to halt provider calls regardless of who's paying. Strictly the bigger hammer.

Either switch flips at next request without a redeploy (env vars are runtime-readable in Supabase Edge Functions). Quotas handle routine over-use; kill switches are reserved for emergencies.

## Implementation order

1. **AI-0 — Foundation.** Schema migration, Settings panel, AI router skeleton, Edge Function skeleton with kill-switch, cost-monitoring cron. No features wired yet — just plumbing. ~1 day.
2. **AI-1 — Suggest codes.** Quick-code menu integration, end-to-end smoke through both hosted and BYOK paths. ~half-day.
3. **AI-2 — Draft description.** Refine integration. ~half-day.
4. **AI-3 — Summarize source.** Organize integration. ~half-day.
5. **AI-4 — Draft project memo.** Overview integration, reuses the snapshot infrastructure already shipped. ~half-day.

## Files

**Created:**
- `src/ai/client.ts` — browser-side entry point that POSTs to `/ai-call` and returns the typed result
- `src/ai/types.ts` — shared types (`AiCallInput`, `AiCallResult`, `AiResponse`)
- `src/components/AiSettingsPanel.tsx` — modal, provider picker, key entry, IRB checkbox
- `src/components/AiPreviewPanel.tsx` — generic preview/loading/results panel reused by all four tools (separate draft preview surface so AI text never auto-flows into autosaving fields)
- `supabase/functions/ai-call/index.ts` — Edge Function entry: routing, decryption, quotas, cache, provider call
- `supabase/functions/ai-call/prompts.ts` — prompt templates with versioned ids (single source of truth, server-side only)
- `supabase/functions/save-key/index.ts` — Edge Function for encrypted key storage
- `supabase/migrations/20260501190000_add_ai_assist_tables.sql` — schema migration

There is **no** browser-side prompts module and **no** `get-my-keys` function. Prompts are server-only because all provider calls happen server-side; the browser only sends `{ kind, inputText, projectId }`.

**Modified:**
- `src/App.tsx` — Settings gear icon in header; wire AI router into Code/Refine/Organize/Overview surfaces
- `src/modes/code/CodeDetail.tsx` — add Suggest codes button to quick-code menu
- `src/modes/refine/RefineDetail.tsx` — add Draft description button
- `src/modes/organize/OrganizeInspector.tsx` — add Summarize source button
- `src/modes/overview/OverviewMode.tsx` — add Draft project memo button

## Verification

1. **Suggest codes (free tier).** With no key set, click Suggest codes → IRB modal appears once → check + Send → 5 suggestions appear → ✓/✗ subset → Apply → those codes appear in the codebook and on the excerpt.
2. **BYOK still routes through Edge Function.** With a Gemini BYOK key saved, run the same flow → DevTools network tab shows the call to `/ai-call` (Supabase Edge Function), NOT to `generativelanguage.googleapis.com` directly. The browser never sees the user's key.
3. **Cache scoping.** User A summarizes source X, gets a result. User B (different account) on the same project content runs summarize on the same source → fresh provider call, separate cache row. Confirms `user_id` is in the hash.
4. **Quota enforcement.** Free-tier user makes 50 calls in a day → 51st call returns `{ ok: false, reason: 'quota' }` from the Edge Function (not a 429 from Gemini). Banner shown.
5. **Rate limit.** Free-tier user fires 11 calls in 60 seconds → 11th returns `quota` reason with rate-limit message.
6. **Token cap.** Hosted user attempts to summarize a 30,000-token source → request rejected at the Edge Function before any provider call.
7. **Kill switches (scoped).** Set `HOSTED_AI_KILL_SWITCH=1` → free-tier user sees the banner; BYOK user is unaffected. Then set `ALL_AI_KILL_SWITCH=1` → BYOK user is also blocked. Each switch is independently toggleable.
8. **No client-side keys.** Search the deployed JS bundle for any string matching `sk-` or `AIza` → none. Network tab inspection shows no plaintext keys in any response from `/save-key`, `/ai-call`, or `/get-my-keys` (the last function is removed).
9. **Draft autosave isolation.** Click `✨ Draft from references`, get a draft, navigate away to another code without clicking Insert → original code's `description` is unchanged in the database.
10. **Cache delete on project delete.** Pin some snapshots, run summaries, delete the project → `fieldnote_ai_calls` rows for that project are gone.
11. **Prompt-version isolation.** Bump `SUGGEST_CODES_V1` → `SUGGEST_CODES_V2` in `supabase/functions/ai-call/prompts.ts`, redeploy. Cached results from V1 do NOT serve V2 calls (the version id is in the content hash); a fresh provider call lands. The browser-side bundle is untouched because there is no browser-side prompts module.

## Out of scope (named for clarity)

- Streaming responses
- Embeddings / "find similar passages"
- Project-wide RAG ("ask your data")
- Org-wide / admin-facing usage dashboards (the per-user `fieldnote_ai_usage` table + the daily `fieldnote_ai_cost_log` are the v1 surfaces; richer analytics are post-v1)
- AI-drafted code memos beyond drafting code descriptions (different feature; descriptions are short labels, memos are long-form synthesis)
- Auto-classify sources into cases via AI
- Multi-turn AI conversations / chat surfaces
