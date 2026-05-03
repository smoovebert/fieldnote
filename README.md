# Fieldnote

Fieldnote is a modern qualitative coding workspace built with React, Vite, Vercel, Supabase Auth, and Supabase Postgres.

## What Is Wired Up

- React/Vite frontend for coding transcripts.
- Supabase email/password sign up and sign in.
- Supabase table schema in `supabase/schema.sql`.
- Row level security so users only see projects they own or have been invited to.
- Debounced autosave after project edits.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. In Supabase, go to Authentication and make sure Email signups are enabled.
5. Copy your Supabase project URL.
6. Copy your Supabase anon public key.

The table has row level security enabled. The browser can use the anon key, but Supabase only allows each signed-in user to access their own rows.

## Environment Variables

Copy `.env.example` to `.env.local` for local Vercel dev:

```bash
cp .env.example .env.local
```

Fill in:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Add the same variables in Vercel Project Settings under Environment Variables.

## Development

```bash
npm run dev
```

Then open the local URL Vite prints and sign up or sign in.

## User Manual

For a researcher-facing guide to the Fieldnote workflow, see [`docs/user-manual.md`](docs/user-manual.md).
For a shorter onboarding handout with generated PDF and DOCX exports, see [`docs/onboarding-guide.md`](docs/onboarding-guide.md) and `scripts/build-onboarding-guide.mjs`.
For alpha tester terms, see [`docs/terms-of-service.md`](docs/terms-of-service.md).

## Checks

```bash
npm run lint
npm run build
```
