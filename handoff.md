# Fieldnote Handoff

## Current Status

Fieldnote is a qualitative research coding app inspired by NVivo. It has a working prototype foundation, but the product direction has been corrected.

Important: the UI has started moving from pane-based to project-first, mode-based workflow, but it should still be treated as **provisional**.

Current visual direction: dark persistent app/navigation shell with a light work area. Avoid adding more card-heavy surfaces; prefer flatter tables, rows, dividers, and direct work surfaces.

The app should not keep evolving as an always-visible dashboard. The next major pass should follow the mode-based workflow in:

```bash
product-workflow-plan.md
```

That plan is now the source of truth for the next design and implementation phase.

## Core Product Correction

Fieldnote should use the full workflow map with MVP depth:

```text
Project Home -> Organize -> Code -> Refine -> Classify -> Analyze -> Report
```

The whole map should stay visible because it makes the product direction legible. Only the critical MVP path needs to be fully usable right now:

```text
import sources -> code selections with multiple codes -> review/refine references -> memo -> export coded excerpts
```

Anything outside that path should appear as an honest placeholder or partial mode, not as a hidden future feature and not as a rushed full implementation.

## Original Full Product Ambition

Do not confuse the current MVP with the full Fieldnote vision. The original target was NVivo-level qualitative research breadth, with a more modern interface and workflow.

Full feature ambition:

- **Projects:** Import and organize interviews, PDFs, documents, images, audio, video, spreadsheets, surveys, web captures, references, and other research materials.
- **Coding:** Highlight text, media, and image regions; attach codes, nested codes, sentiment codes, relationships, notes, and annotations.
- **Research Workspace:** Source viewer, codebook, folders, tabs, side-by-side views, memos, attributes/demographics, cases, and participants.
- **Search and Queries:** Text search, word frequency, coding queries, matrix coding, crosstabs, and comparisons by participant attributes.
- **Visualizations:** Word clouds, charts, hierarchy charts, cluster analysis, mind maps, concept maps, and relationship maps.
- **Transcription:** Audio/video transcription with speaker labels and transcript-linked media playback.
- **AI Assistant:** Summaries, suggested codes/sub-codes, thematic suggestions, and "ask your data" querying, always with human approval.
- **Collaboration:** Shared projects, team coding, reviewer roles, conflict handling, inter-coder reliability, and cloud sync.
- **Exports:** Codebook exports, coded excerpts, reports, charts, Word/Excel/PDF/CSV exports, and archive formats.

Current MVP slice:

```text
projects -> text import -> text coding -> codebook refinement -> memos -> basic cases -> CSV exports
```

Major parity gaps:

- non-text source types
- media/image region coding
- nested code hierarchy
- annotations and relationships
- full source search and formal query system
- visualizations
- transcription
- AI assistant
- collaboration and inter-coder reliability
- rich report/export formats

Important architecture note: full parity will require normalized database tables for sources, codes, references, memos, cases, attributes, relationships, files/media, queries, exports, and collaboration. The current JSON-on-project model is only acceptable for the prototype/MVP spine.

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
Project Home
Organize
Code
Refine
Classify
Analyze
Report
```

Each mode should have its own focused interface. Do not keep adding controls to the current right rail.

Project Home sits above the modes. A user can have multiple projects, and each project contains its own sources, codebook, memos, excerpts, and eventually cases/reports.

Workspace layout is now three columns:

- stacked left sidebar for mode actions plus object lists
- center detail/work surface
- right context rail for properties, memos, and mode-specific panels

## Live Links

- Production app: https://fieldnote-seven.vercel.app
- GitHub repo: https://github.com/smoovebert/fieldnote
- Vercel project: `behemoth-agency/fieldnote`
- Supabase project: `Fieldnote`

## Deployment / Testing Rule

Use the production URL for normal testing:

```text
https://fieldnote-seven.vercel.app
```

Vercel has the required `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables in Production and Development. Preview deployments from the production branch do not automatically receive those variables, so ad hoc preview links may show the missing-env message unless deployed with explicit build env values or created from a non-production preview branch.

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
- Each user can have multiple projects.
- Row level security is enabled.

### Projects

- Signed-in users now land on Project Home instead of being dropped directly into the workspace.
- Project Home lists existing projects.
- Users can create a new project.
- Opening a project takes the user into the mode-based workspace.
- The project switcher in the app header returns to Project Home.

### Sources

- Multiple text sources are supported.
- Importing `.txt`, `.md`, or `.csv` creates a new source.
- Clicking a source opens it.
- Organize mode has folder filters for all sources, Internals, and Externals.
- Organize mode has a source register with title, type, folder, references, and memo status.
- The right rail in Organize mode now focuses on source properties and prep metadata.
- Organize mode supports multi-file import.
- Folders are now source-driven, so moving a source into a new folder creates that folder.
- Sources can be archived/restored, or deleted after an in-app confirmation.
- A source can be assigned a case name or turned into a case from the source properties rail.
- Classify mode now has a basic source classification sheet for assigning/editing source-level case names.

### Coding

- Users can select source text and code it.
- One excerpt can have multiple codes.
- Coding the same exact source passage again now merges new codes into the existing reference instead of creating a duplicate.
- Codes can be created from the right rail.
- Clicking Codes shows references for a selected code.
- Refine mode lets users edit code name, color, and description.
- Codes can be deleted with an in-app confirmation; linked references are cleaned up or removed if no codes remain.
- Coded references can be deleted with confirmation.
- Individual codes can be removed from a multi-coded reference with confirmation.
- Refine mode can add new codes directly to the codebook and select them for definition editing.
- Refine mode can merge the active code into another code, moving coded references and removing the merged code.
- Refine mode can split selected text out of an existing coded reference into a new reference with the same codes.

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

### Report/Export

- Coded excerpts CSV export includes project, source, folder, case, codes, code descriptions, excerpt text, and notes.
- Codebook CSV export includes code names, descriptions, reference counts, and an example excerpt.
- Memos CSV export includes project, memo title, linked type, linked source/code/project, and memo body.

## Current Known Issues

- Current UI is still provisional and needs a later creative direction pass, but it has begun moving away from card-heavy dashboard styling.
- Right rail still contains too many unrelated concepts.
- Relationships view is only a placeholder.
- AI draft panel is only a placeholder.
- Query/Analyze tools are not implemented.
- Report mode has basic CSV exports, but not report preview or formatted Word/PDF outputs.
- Classify mode has a basic source-level case sheet, but no real attribute columns or case groups yet.
- Code hierarchy and parent-child nodes are not implemented.
- Project sharing has database groundwork but no invite UI.
- Supabase email signup hit a temporary rate limit during automated testing.

## Mode Shell Status

Milestone 1 has been started.

Implemented:

- Project Home above all work modes.
- Multiple projects per signed-in user.
- Left-rail mode switcher:
  - Organize
  - Code
  - Refine
  - Classify
  - Analyze
  - Report
- Mode switcher now labels depth:
  - Now: usable MVP surfaces
  - MVP: partial but useful surfaces
  - Soon: visible placeholder surfaces
- Mode navigation moved out of the top header and into the left workspace sidebar so navigation, mode actions, and object lists live in one consolidated rail.
- Left navigation and object list were collapsed into one stacked sidebar.
- Mode sidebar actions were audited: only Organize keeps a dedicated action/folder section. Code, Refine, Classify, Analyze, and Report now rely on their object list plus the center/right work surfaces to avoid redundant navigation furniture.
- Right rail was audited: universal item properties and the premature AI draft panel were removed. Memos show only in Organize/Code/Refine. Report shows an export summary. Analyze keeps coded excerpts only.
- Report sidebar no longer duplicates export buttons; export actions live in the center Report panel.
- Removed the old ribbon from the main app flow.
- Moved source import/source list into Organize mode.
- Added Organize folder filtering and a fuller source register.
- Added source title/type/folder editing in the Organize right rail.
- Added multi-source import, custom source folders, archive/restore/delete controls, and first-pass source-to-case setup.
- Added a basic Classify case sheet for reviewing and editing source-level case assignments.
- Moved close reading/coding into Code mode.
- Moved code reference review into Refine mode.
- Tightened the Code -> Refine -> Report MVP loop with duplicate-reference merging, better code editing, and stronger CSV exports.
- Added memo export to complete the basic source/code/memo reporting loop.
- Added initial Classify, Analyze, and Report work surfaces.
- Moved CSV export into Report mode.

Still needed:

- Project rename/delete/share controls.
- Mode-specific right rails outside Organize need another design pass.
- Organize mode still needs folder rename/delete, archive filters beyond the basic archive bucket, richer source previews, and real case/classification sheets.
- Refine mode still needs hierarchy tools.
- Classify, Analyze, and Report are only first-pass shells.
- Classify and advanced Analyze/Report features are intentionally placeholders for MVP.

## Required Next Step

Do **not** add more one-off UI panels.

Next implementation should continue Milestone 1 cleanup and then move into Milestone 2:

```text
Milestone 1 cleanup: finish Project Home polish and tighten mode-specific right rails
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
