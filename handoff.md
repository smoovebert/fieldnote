# Fieldnote Handoff

## What This Is

Fieldnote is a web app for qualitative research coding, inspired by NVivo’s workflow but with a cleaner modern interface.

It is built for researchers who need to:

- Import interview transcripts or text documents.
- Organize sources.
- Highlight passages.
- Apply one or more codes.
- View all references for a code.
- Write project/source/code memos.
- Save work per user account.

## Live Links

- Production app: https://fieldnote-seven.vercel.app
- GitHub repo: https://github.com/smoovebert/fieldnote
- Vercel project: `behemoth-agency/fieldnote`
- Supabase project: `Fieldnote`

## Current Tech Stack

- React
- TypeScript
- Vite
- Supabase Auth
- Supabase Postgres
- Vercel
- `lucide-react` icons

## Local Project Path

```bash
/Users/smoovebert/Projects/fieldnote
```

## Local Development

Start the app:

```bash
npm run dev
```

Then open:

```bash
http://127.0.0.1:5173/
```

Check the app before committing:

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

## Supabase Database

The app uses these tables:

- `fieldnote_projects`
- `fieldnote_project_members`

The schema lives in:

```bash
supabase/schema.sql
```

Migrations live in:

```bash
supabase/migrations/
```

Applied migrations:

- `20260427202944_fieldnote_auth_schema.sql`
- `20260427203844_add_sources_and_memos_to_projects.sql`

Row level security is enabled. Users should only see projects they own or have been added to as members.

## Current Product Behavior

### Authentication

Users sign up or sign in with Supabase email/password auth.

Each signed-in user gets their own project.

### Main Workspace

The app now has a more NVivo-like flow:

- Left Navigation View changes the active workspace mode.
- List View changes based on the selected workspace mode.
- Detail View shows the selected source, code, memo, or relationship map.
- Right rail shows active codes, item properties, context memo, AI draft, and coded excerpts.

### Sources

Sources are stored inside the project JSON as `sources`.

Importing a `.txt`, `.md`, or `.csv` file creates a new source rather than replacing the current one.

Clicking a source in List View opens it in Detail View.

### Coding

Users can select text in a source and code it with one or more active codes.

Codes behave more like NVivo nodes now:

- Click **Codes** in Navigation View.
- Select a code in List View.
- Detail View shows that code’s references.

### Memos

There are multiple memo types:

- Project memo
- Source memo
- Code memo

The right rail memo is context-aware:

- Source open: source memo
- Code open: code memo
- Memo view: selected memo
- Other context: project memo

If the context memo does not exist yet, typing into the memo box creates and links it automatically.

### Saving

The app autosaves to Supabase after edits.

Project data is currently stored mostly as JSON columns on `fieldnote_projects`:

- `sources`
- `codes`
- `memos`
- `excerpts`
- `active_source_id`

This is good for prototype speed, but later should be normalized into separate tables.

## Recent Commits

- `254523b` Make right rail memo context aware
- `71e7c7e` Make research workspace flow functional
- `3cf63ab` Add Supabase auth schema migration
- `61690a6` Replace access key with Supabase auth

## Current Known Issues

- Supabase email signup hit a temporary rate limit during automated testing.
- Project sharing has database support started, but no invite/share UI yet.
- Relationships view is a placeholder.
- AI draft panel is a placeholder.
- Queries are not implemented yet.
- PDF/audio/video coding are not implemented yet.
- Code hierarchy/parent-child nodes are not implemented yet.
- Sources/codes/memos are still stored as JSON inside one project row.

## Recommended Next Steps

1. Add project sharing UI.
2. Add code hierarchy and code editing controls.
3. Add real query tools:
   - text search
   - word frequency
   - coding query
   - matrix coding
4. Normalize database tables:
   - projects
   - project_members
   - sources
   - codes
   - excerpts
   - memos
5. Add source folders under Internals.
6. Add deletion/rename/merge flows.
7. Add export reports beyond CSV.
8. Add PDF support.

## Deployment

Deploy production manually:

```bash
npx vercel deploy --prod -y
```

Current production alias:

```bash
https://fieldnote-seven.vercel.app
```

## Design Direction

Keep the NVivo-inspired workflow:

- Ribbon
- Navigation View
- List View
- Detail View
- Right properties/memo rail

But avoid copying NVivo branding or exact proprietary UI. Fieldnote should feel calmer, more modern, and easier for a non-technical researcher.
