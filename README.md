# Fieldnote

Fieldnote is a modern qualitative coding workspace built with React, Vite, Vercel serverless functions, and Supabase.

## What Is Wired Up

- React/Vite frontend for coding transcripts.
- Vercel API route at `api/project.ts`.
- Supabase table schema in `supabase/schema.sql`.
- Simple private access key gate before the app can load or save Supabase data.
- Debounced autosave after project edits.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run the SQL in `supabase/schema.sql`.
4. Copy your Supabase project URL.
5. Copy your Supabase `service_role` key.

The table has row level security enabled and no public policies. The browser cannot talk to the table directly; only the Vercel API can.

## Environment Variables

Copy `.env.example` to `.env.local` for local Vercel dev:

```bash
cp .env.example .env.local
```

Fill in:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIELDNOTE_ACCESS_KEY=make-a-long-private-password
FIELDNOTE_PROJECT_ID=student-access-study
```

Add the same variables in Vercel Project Settings under Environment Variables.

## Development

For frontend-only work:

```bash
npm run dev
```

For Supabase/API work:

```bash
npm run dev:vercel
```

Then open the local URL Vercel prints and enter your `FIELDNOTE_ACCESS_KEY` in the app.

## Checks

```bash
npm run lint
npm run build
```
