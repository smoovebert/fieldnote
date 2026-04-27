# Fieldnote Handoff

## Current Status

Fieldnote is a qualitative research coding app inspired by NVivo. It has a working prototype foundation, but the product direction has been corrected.

Important: the UI has started moving from pane-based to mode-based, but it should still be treated as **provisional**.

The app should not keep evolving as an always-visible dashboard. The next major pass should follow the mode-based workflow in:

```bash
product-workflow-plan.md
```

That plan is now the source of truth for the next design and implementation phase.

## Core Product Correction

The first prototype copied too much of NVivo's visible anatomy:

- ribbon
- Navigation View
- List View
- Detail View
- right rail

That was not enough. The better interpretation is that NVivo supports staged research passes:

- organizing sources
- coding sources
- refining codes/nodes
- classifying cases and attributes
- analyzing/querying
- reporting/exporting

Fieldnote should now move toward modes:

```text
Organize
Code
Refine
Classify
Analyze
Report
```

Each mode should have its own focused interface. Do not keep adding controls to the current right rail.

## Live Links

- Production app: https://fieldnote-seven.vercel.app
- GitHub repo: https://github.com/smoovebert/fieldnote
- Vercel project: `behemoth-agency/fieldnote`
- Supabase project: `Fieldnote`

## Local Project Path

```bash
/Users/smoovebert/Projects/fieldnote
```

## Tech Stack

- React
- TypeScript
- Vite
- Supabase Auth
- Supabase Postgres
- Vercel
- `lucide-react` icons

## Local Development

Start the app:

```bash
npm run dev
```

Then open:

```bash
http://127.0.0.1:5173/
```

Run checks:

```bash
npm run lint
npm run build
```

## Environment Variables

The app uses Vite public Supabase variables:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

These are already set in:

- Vercel Production
- Vercel Development
- Local `.env.local`

Do not commit `.env.local`.

## Database

Supabase tables currently used:

- `fieldnote_projects`
- `fieldnote_project_members`

Schema:

```bash
supabase/schema.sql
```

Migrations:

```bash
supabase/migrations/
```

Applied migrations:

- `20260427202944_fieldnote_auth_schema.sql`
- `20260427203844_add_sources_and_memos_to_projects.sql`

Current project data is still mostly JSON on `fieldnote_projects`:

- `sources`
- `codes`
- `memos`
- `excerpts`
- `active_source_id`

This is acceptable for the prototype, but the plan recommends normalizing later.

## Current Implemented Behavior

### Authentication

- Supabase email/password sign up and sign in.
- Each user gets their own project.
- Row level security is enabled.

### Sources

- Multiple text sources are supported.
- Importing `.txt`, `.md`, or `.csv` creates a new source.
- Clicking a source opens it.

### Coding

- Users can select source text and code it.
- One excerpt can have multiple codes.
- Codes can be created from the right rail.
- Clicking Codes shows references for a selected code.

### Memos

Supported memo types:

- project memo
- source memo
- code memo

The right rail memo is context-aware:

- source open: source memo
- code open: code memo
- memo view: selected memo
- fallback: project memo

Typing in a missing context memo creates it automatically.

### Saving

- Autosaves to Supabase.
- Production deployment is on Vercel.

## Current Known Issues

- Current UI is still too dashboard-like.
- Right rail still contains too many unrelated concepts.
- Relationships view is only a placeholder.
- AI draft panel is only a placeholder.
- Query/Analyze tools are not implemented.
- Report mode is not implemented.
- Classifications/cases/attributes are not implemented.
- Code hierarchy, merge, split, and parent-child nodes are not implemented.
- Project sharing has database groundwork but no invite UI.
- Supabase email signup hit a temporary rate limit during automated testing.

## Mode Shell Status

Milestone 1 has been started.

Implemented:

- Top-level mode switcher:
  - Organize
  - Code
  - Refine
  - Classify
  - Analyze
  - Report
- Removed the old ribbon from the main app flow.
- Moved source import/source list into Organize mode.
- Moved close reading/coding into Code mode.
- Moved code reference review into Refine mode.
- Added initial Classify, Analyze, and Report work surfaces.
- Moved CSV export into Report mode.

Still needed:

- Mode-specific right rails need another design pass.
- Organize mode needs real folder/source-table behavior.
- Refine mode needs hierarchy/merge/split tools.
- Classify, Analyze, and Report are only first-pass shells.

## Required Next Step

Do **not** add more one-off UI panels.

Next implementation should continue Milestone 1 cleanup and then move into Milestone 2:

```text
Milestone 1 cleanup: tighten mode-specific right rails
Milestone 2: Organize Mode
```

## Design Direction

Fieldnote should feel calmer and more intentional than NVivo.

Guiding rule:

```text
Show the tools for the research pass the user is doing now.
Hide everything else.
```

Do not treat NVivo as a visual skin. Treat it as a research workflow reference.

## Deployment

Deploy production manually:

```bash
npx vercel deploy --prod -y
```

Current production alias:

```bash
https://fieldnote-seven.vercel.app
```

## Recent Commits

- `d7ee415` Document mode-based product plan
- `5589edd` Add handoff and enlarge memo rail
- `254523b` Make right rail memo context aware
- `71e7c7e` Make research workspace flow functional
- `3cf63ab` Add Supabase auth schema migration
- `61690a6` Replace access key with Supabase auth
