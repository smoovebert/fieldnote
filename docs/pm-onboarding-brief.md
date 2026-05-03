# Fieldnote — PM Onboarding Brief

**Last updated:** 2026-05-03

## What Fieldnote is

A qualitative research workspace for the loop most QDA work actually follows: organize sources → close-read and code passages → refine the codebook → classify cases → analyze across participants → export evidence. Six modes, one calm shell, no menu archaeology.

The default mental model is academic / interview-driven research (what NVivo, ATLAS.ti, MAXQDA serve), but built for solo and small-team use rather than institutional procurement. The pricing pitch isn't free; the time pitch is "doesn't fight you."

## Where it is

**Alpha.** Real users can do real work end-to-end. The product is not yet hardened, not SOC2'd, not collaborative-realtime, and not self-host-ready for non-developers.

What ships today (high-confidence, used in real workflows):
- All six modes operational. Coding, codebook, cases, attributes, saved queries, snapshots, report generation.
- Text source types: TXT / MD / DOCX / PDF (extracted text, page-anchored coding via `pageNumber` + `charOffset`).
- AI assist: BYOK + free Gemini Flash with daily quota; four tools live (suggest codes, draft description, summarize source, draft project memo).
- Editorial PDF + Word reports; CSV/XLSX exports for every data shape.
- Auto-saves to Supabase + IndexedDB local recovery + downloadable `.fieldnote.json` backups.
- Account self-deletion shipped 2026-05-03.

What doesn't ship yet:
- Native PDF render (we render extracted text + page anchors, not the PDF itself).
- DOCX rich preview (formatting flattened at import).
- Audio / video / image regions.
- Real-time multi-user editing.
- Project sharing UI (DB groundwork exists; no invite flow).
- Tablet / mobile layout (gated at 1024px).
- RAG / "ask your data" AI flow.
- Self-host docs for non-developers.

## Who it's for

The target is the qualitative researcher who:
- Codes interview transcripts (this is the most common use case)
- Works solo or on a small team (not a 12-person enterprise study)
- Doesn't have a $1k/seat/year institutional budget
- Reads NVivo's UI as more friction than help
- Needs to defend their analysis (cite by source/page, show the audit trail, export what they wrote)

The framing on the landing page ("Read it. Code it. Defend it.") names the academic publication endgame deliberately.

## Architecture in one paragraph

React + TypeScript + Vite frontend (deployed on Vercel). Supabase backend in AWS us-west-2: Postgres for everything, Supabase Auth for sign-in, Edge Functions (Deno) for AI calls + key encryption + account deletion. Per-row RLS for project ownership. AI uses a single edge function (`ai-call`) that routes to Gemini / OpenAI / Anthropic; BYOK keys are pgcrypto-encrypted at rest and only decrypted in Edge Function memory. Free-tier Gemini calls are quota-limited per-user-per-day at 50 calls.

## Key product decisions worth knowing

These shape what's in scope and what isn't.

1. **No menu archaeology.** Every feature lives in the mode where it belongs. Adding a one-off panel anywhere triggers a "do we really need this here?" conversation.
2. **Page-anchored citations as the bar.** Every coded excerpt should be re-locatable. PDF page numbers, source title, and (where relevant) character offset.
3. **AI proposes; the user accepts.** No AI output ever silently lands in a project. Every AI feature uses a preview panel with explicit Send → review → Insert/Discard.
4. **No tracking.** Zero third-party analytics scripts. The privacy doc says so explicitly. Adding any analytics requires an explicit policy update.
5. **Snapshots are the unit of analytic memory.** A pinned saved-query snapshot can carry an interpretation memo and be promoted to the report. This is the closest thing to a "killer feature" we've shipped.
6. **Page citations everywhere.** When PDF page-anchored coding shipped, citations updated everywhere — inspector, search, Refine, all three Report renderers, CSV. Half-implementations are not acceptable for foundational data shape changes.
7. **Marketing copy matches reality.** The landing page deliberately doesn't say "free / open source / self-host" because the alpha doesn't ship those experiences for non-developers. Honesty is the policy.

## Recent direction

In the last two weeks the work has clustered into:

- **AI assist v1 + hardening** — four AI tools shipped, then nine schema migrations to lock down the security model (service-role / JWT split in Edge Functions, definer-mode safe view, atomic quota RPCs, BYOK key save flow that can't leave the account in a broken state).
- **Analyze workbench refresh** — sidebar reframed around question types (Evidence / Compare / Language / Relationships), drill-down consistency ("every number opens evidence"), snapshot memos with interpretation notes, Send-to-Report on every panel, multi-kind snapshots, embedded chart visuals (heatmaps, bars) in PDF + Word.
- **PDF page-anchored coding** — the first wedge in the non-text-source-types thread. Page-card reader, `pageNumber` + `charOffset` on excerpts, "Source, p. N" citations across every surface.
- **Type hierarchy** — eight-tier scale (T1–T8) applied across the app and a rebuilt marketing landing page from a design handoff.
- **Compliance scaffolding** — Terms of Service alpha gate at sign-up, privacy policy, in-app account self-deletion, contact email surfaced in the footer.

## Open product threads

These are the ones that will need PM judgment in the coming weeks. Recommended reading: `handoff.md` "Required Next Step" section.

1. **RAG / "ask your data."** Vector search over excerpts + chat with the corpus. Real differentiator. Big design space (chunking, citation UX, cost gating). Needs its own brainstorm before scoping.
2. **Native PDF canvas render.** Page-anchored extracted text reads well; pixel-perfect coding on the rendered PDF is the next wedge. Big UX rework — coding becomes bounding rects.
3. **Audio with transcript-linked playback.** Hours of audio outgrows free-tier Supabase storage; transcription is paid (Whisper or Gemini audio). The cost line is real.
4. **Image regions.** Cheaper than audio, fits free tier comfortably. Lower demand among interview researchers.
5. **Project sharing UI.** Multi-tenant DB groundwork exists. Most QDA work is solo, so this has been deliberately parked. Will need to weigh demand signal before building.
6. **Self-host docs.** Today people technically *can* self-host (Vite + Supabase project + their own Gemini key) but no doc exists. Writing a real doc unlocks the "free / open source" marketing claim that's currently disabled on the landing page.
7. **Mobile / tablet.** Currently 1024px gated. Researchers do read transcripts on iPads sometimes; not a blocker yet but worth tracking.
8. **Persistent case sets, fuzzy duplicate detection, bulk recode multi-select.** Polish items that researchers will request once they're in deep enough.

## How to evaluate a feature request

Three filters in order:

1. **Does it serve the loop?** Organize → Code → Refine → Classify → Analyze → Report. If a request is orthogonal (e.g. project management, scheduling), default to no.
2. **Does it survive the alpha-honest test?** Will the marketing copy still match the experience after we ship it? If not, either fix the copy first or drop the request.
3. **Does it cascade through every citation surface?** Anything that adds metadata to an excerpt has to thread through Report (preview / PDF / Word), CSV, Refine, search, and the right rail. Half-applied features are confusing.

## Reading order for the new PM

- This doc.
- `handoff.md` — comprehensive narrative of what's shipped and why. The "Mode Shell Status" section is the canonical changelog.
- `docs/design-system.md` — the eight-tier type system + design tokens.
- `docs/terms-of-service.md` + `docs/privacy-policy.md` — what we promise users.
- `docs/superpowers/specs/` — design specs for major features (PDF page-anchored coding, AI assist v1).
- `design_handoff_type_hierarchy/README.md` — the visual hierarchy spec the recent landing + app polish was built against.

## Team & contacts

- Build/dev: Albert Ocampo (GitHub: smoovebert).
- Studio email: studio.ops@behemothagency.com.
- Live URLs: production at https://fieldnote-seven.vercel.app.

## Known constraints worth remembering

- **Supabase free tier**: ~500MB DB, 1GB storage, 5GB egress/month. Audio/video pushes through this fast.
- **Gemini free tier**: 50 calls/user/day, server-enforced. UI shows the badge.
- **Browsers**: Chromium-based browsers (Arc, Chrome) suppress `window.confirm` after a few rapid dialogs — every destructive flow uses one confirm only.
- **No real-time collaboration**: every save is autosave + IDB recovery + remote write; not OT/CRDT-based.
- **Monorepo single-app**: one Vite app, no shared package layer. Fast to navigate; means decisions touch one place.
