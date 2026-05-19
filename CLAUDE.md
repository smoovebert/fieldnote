# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (http://localhost:5173)
- `npm run build` — `tsc -b` then `vite build`. A ">500 kB chunk" warning is pre-existing and benign.
- `npx tsc -p tsconfig.app.json --noEmit` — typecheck only (fast feedback without a full build)
- `npm run lint` — ESLint
- `npm run test` — Vitest (run once); `npm run test:watch` for watch mode
- Single test file: `npx vitest run src/lib/__tests__/id.test.ts`. Tests only run if under `src/**/__tests__/**/*.test.{ts,tsx}` (see `vitest.config.ts`, jsdom env, globals on).

## Architecture

React 19 + Vite SPA, TypeScript. There is **no application server** — Supabase (Auth + Postgres + Row Level Security) is the backend, and privileged operations run in Supabase **Edge Functions** under `supabase/functions/`: `ai-call`, `save-key`, `delete-account`, `early-access-signup`. These deploy with `--no-verify-jwt` and verify the JWT manually in the request body.

Two top-level surfaces:
- `src/Landing.tsx` — public marketing page (unauthenticated visitors).
- `src/App.tsx` — the authenticated workspace shell. `src/AuthModal.tsx` handles Supabase email/password auth.

The workspace is **project-first and mode-based**: six modes in `src/modes/` — overview, organize, code, refine, classify, analyze, report — sharing a persistent dark app shell with a light work area. The mode set, nav, and IA are deliberate product decisions; don't restructure them casually. `product-workflow-plan.md` is the source of truth for the mode workflow.

Data flow: a single project object is loaded/saved through `src/persistence/io.ts` with debounced autosave (`src/persistence/useAutosave.ts`); `src/lib/localRecovery.ts` writes a browser-storage snapshot *before* each network save. The serialized shape lives in `src/persistence/shape.ts` + `src/lib/types.ts`; users can also export/import a portable `.fieldnote.json` backup.

**Domain logic belongs in `src/lib/` pure modules** (`codeOperations`, `codeTree`, `caseOperations`, `excerptOperations`, `sourceImport`, `sourcePages`, `excerptCitation`, …) — these are the unit-tested core; keep behavior there, not in components. Source import: DOCX via `mammoth`, PDF via `pdfjs-dist`. PDF coding is **page-anchored** — excerpts carry optional `pageNumber`/`charOffset`; `src/lib/sourcePages.ts` parses `--- Page N ---` markers.

`src/analyze/` builds crosstabs / matrices / co-occurrence / word-frequency and snapshots that feed `src/report/`, which produces editorial output plus PDF (`jspdf` + `html-to-image`), Word (`docx`), and CSV/XLSX exports. `src/ai/` is optional and consent-gated: calls route through the `ai-call` Edge Function, BYOK keys are saved via `save-key` (encrypted server-side, never returned to the browser), and `responseGuards.ts` validates model output before use.

## Project-specific constraints

- **`handoff.md` (repo root) is the changelog and decision log of record.** Add a dated, dense single-bullet entry for each material change. Companion planning docs: `data-model-plan.md` (read before touching collaboration, media import, transcription, serious Analyze, AI, or rich exports), `docs/design-system.md` (visual direction; phased — read its Rollout Plan before styling work).
- **Typography** uses an 8-tier scale `--t-t1`..`--t-t8` in `src/styles/tokens.css`, with back-compat aliases (`--t-display`, `--t-title`, …) pointing at the nearest tier. Spec: `design_handoff_type_hierarchy/README.md`.
- **The landing page is intentionally style-decoupled from the app.** Its design-token overrides are scoped to `.landing-root` so the app's cooler palette and `prefers-color-scheme: dark` block can't leak in; its base resets use `:where(...)` for zero specificity. `AuthModal` styles live in `src/styles/auth-modal.css` (imported by the component) and must NOT depend on `src/styles/app-frame.css`, which only loads on the `App.tsx` route.
- **The early-access gate is enforced in the database** (auth triggers + `public.fieldnote_access_invites`), not just frontend copy. New testers must be inserted into that table before signup will succeed. TOS acceptance is persisted into Supabase auth metadata at signup.
- `public/terms-of-service.md` and `public/privacy-policy.md` mirror the `docs/` source of truth — edit the `docs/` copy.
- Deploy: Vercel, auto-deploys from `main`, production at https://fieldnoteqda.com. Repo history is linear — commit and push directly to `main` (no PR/branch workflow).

## Environment

Copy `.env.example` to `.env.local`. Required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FIELDNOTE_ACCESS_FORM_URL`. DB schema is `supabase/schema.sql` plus `supabase/migrations/`.
