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

Architecture planning now lives in:

```bash
data-model-plan.md
```

Use that before implementing collaboration, media imports, transcription, serious Analyze mode, AI, or rich exports.

Visual / design direction lives in:

```bash
docs/design-system.md
```

That spec ("Modern QDA System") is the source of truth for the creative direction pass: color tokens, typography (Manrope / Newsreader / Inter), spacing, components, and the three-pane layout. Rollout is phased — read the Rollout Plan section before touching styling code.

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
projects -> text import -> text coding -> codebook refinement -> memos -> basic cases -> CSV/XLSX/Word/PDF exports
```

Major parity gaps:

- non-text source types
- media/image region coding
- annotations, sentiment codes, and relationships
- deeper formal query system beyond the shipped header search
- advanced visualizations beyond current first-pass charts
- transcription
- AI assistant
- collaboration and inter-coder reliability
- archive and reference/bibliography export formats

Remaining functionality grouped by LOE:

**Small**

- ~~Folder rename/delete~~ ✓ shipped (Internals protected; archive filters beyond the bucket still TBD).
- ~~Attribute import from CSV~~ ✓ shipped.
- ~~Basic case grouping view~~ ✓ shipped (group cases by an attribute in Classify; persistent case sets still TBD).
- ~~Saved query result snapshots for point-in-time evidence captures~~ ✓ shipped (coded_excerpt only; other panel kinds TBD).
- ~~Report settings for included sections/fields~~ ✓ shipped.
- Code hierarchy polish beyond drag-and-drop: clearer tree controls, bulk cleanup, and hierarchy reporting (split, exact dedupe banner, and orphan review shipped; bulk-multi-select recode still TBD).
- ~~Excel/XLSX versions of current CSV exports~~ ✓ shipped.
- First-run UX with sample-vs-blank choice ✓ shipped.

**Medium**

- ~~Full-project search~~ ✓ shipped in the header (sources, memos, codes, cases, and excerpts; deeper formal query tools still TBD).
- Richer PDF/DOCX preview while still coding extracted text (PDF and DOCX text extraction shipped; native page/rich preview still TBD).
- ~~Codebook cleanup: split code + duplicate detection~~ ✓ shipped (orphan-reference review also shipped; bulk recode multi-select still TBD).
- First-class analysis objects: saved matrices/crosstabs/charts with stored results — extend the existing `fieldnote_query_results` table to other panel kinds.
- More visualization surfaces: hierarchy chart, relationship map, concept map v1.
- ~~Report builder customization (sections/fields)~~ ✓ shipped (embedded chart outputs in the Report still TBD).

**Large**

- Project sharing UI, roles, reviewer workflow, coding assignments, and conflict handling. **Parked** — qual research is mostly solo; not on the immediate path. Schema groundwork (`fieldnote_project_members`, `fieldnote_project_invites`, RLS rewrites for ~10 tables) is documented but unbuilt.
- Inter-coder reliability workflow. **Parked** with sharing.
- Audio/video upload, transcription, speaker labels, and transcript-linked playback.
- Image/PDF/media region coding with durable file storage.
- AI summaries, suggested codes/sub-codes, thematic suggestions, and ask-your-data with human approval.
- Full project archive/restore format.

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
- `fieldnote_sources`
- `fieldnote_folders`
- `fieldnote_codes`
- `fieldnote_source_segments`
- `fieldnote_coded_references`
- `fieldnote_memos`
- `fieldnote_cases`
- `fieldnote_case_sources`
- `fieldnote_attributes`
- `fieldnote_attribute_values`
- `fieldnote_queries`

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
- `20260428000000_fix_fieldnote_rls_recursion.sql`
- `20260428010000_normalize_core_objects.sql`
- `20260428020000_add_cases_and_attributes.sql`
- `20260429010000_add_saved_queries.sql`

Current project data is now dual-written:

- `sources`
- `cases`
- `case_sources`
- `attributes`
- `attribute_values`
- `saved_queries`
- `codes`
- `memos`
- `excerpts`
- `active_source_id`

The JSON fields remain as a fallback/transition layer, but the app now reads normalized rows when available and writes normalized rows on save.

See `data-model-plan.md` for the full future schema, including sources, source files, source segments, codes, coded references, memos, cases, attributes, relationships, queries, AI suggestions, exports, and collaboration/review tables.

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
- Importing `.txt`, `.md`, `.csv`, or `.docx` creates a new source. DOCX import extracts plain transcript text and does not preserve Word formatting.
- Clicking a source opens it.
- Organize mode has folder filters for all sources, Internals, and Externals.
- Organize mode has a source register with title, type, folder, references, and memo status.
- The right rail in Organize mode now focuses on source properties and prep metadata.
- Organize mode supports multi-file import.
- Folders are now source-driven, so moving a source into a new folder creates that folder.
- Sources can be archived/restored, or deleted after an in-app confirmation.
- A source can be assigned to a real case/participant or turned into a case from the source properties rail.
- Classify mode now has source-to-case assignment plus a case sheet with editable participant attributes.

### Coding

- Users can select source text and code it.
- Code mode displays source text with line numbers; line numbers are not part of the source text.
- Code mode has a toggleable quick coding menu: when enabled, selecting transcript text opens a contextual menu near the selection with code chips, an instant new-code field, and apply actions.
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
- Refine mode now supports parent/child code hierarchy: code lists render as a tree, each code can be assigned a parent, new Refine-created codes become children of the active code, and codebook CSV includes parent code.
- Parent codes show aggregate references from their child codes in the Refine reference surface.

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
- Case sheet CSV export includes cases, linked sources, notes, and participant attributes.
- Coded excerpts by case CSV export includes each coded excerpt with its linked case and case attribute values.
- Memos CSV export includes project, memo title, linked type, linked source/code/project, and memo body.
- Analyze mode can export the current query result set as CSV.
- Analyze mode can export the current matrix coding table as CSV.
- Analyze mode can export current word frequency and code co-occurrence results as CSV.
- Report raw-data exports can be downloaded as CSV or XLSX.
- Report mode has a live report preview plus formatted Word (`.docx`) and PDF exports.

### Analyze

- Analyze mode now has a first-pass query builder instead of duplicating excerpt panels.
- Query filters include text search, code, case/participant, attribute, and attribute value.
- Query results show source, case, codes, excerpt text, and note in a structured table.
- Users can save the current Analyze filter setup as a named saved query, reopen it from the Analyze left rail, update it, delete it, and export its current results.
- Matrix coding is now implemented as a first MVP pass: codes as rows, cases or attribute values as columns, and matching coded excerpts inside each cell.
- Matrix coding respects the active query filters, so a saved query can narrow the matrix before comparing codes by case or attribute value.
- Word frequency is implemented as a first MVP pass over the current filtered coded excerpts, with term counts, excerpt counts, weight bars, and CSV export.
- Code co-occurrence is implemented as a first MVP pass over the current filtered coded excerpts, counting code pairs that appear on the same excerpt, with excerpt previews and CSV export.
- Crosstabs is implemented as a first MVP pass: codes × the cartesian product of two attributes, with row/column totals, a Count / Row % / Col % toggle, CSV export, and cell click-to-drill into Query results. Cases missing a value for either attribute bucket into a `(none)` value.
- The Analyze right rail now summarizes result count, matching cases, matching codes, active filters, and exports the active Analyze surface.
- Word frequency, code co-occurrence, and matrix coding each have a 3-way toggle: Table / Chart A / Chart B.
  - Word frequency → Bar chart, Word cloud, Table.
  - Co-occurrence → Heatmap, Network graph (force-directed), Table.
  - Matrix → Heatmap, Grouped bars, Table.
- Each chart supports click-to-drill — clicking a bar/cell/node adds the corresponding filter chip.
- PNG export per chart, in addition to existing CSV export.
- Top-N controls per chart (defaults: word freq 25, co-occurrence 30, matrix 30 × 30). Network view shows a soft-cap banner past 20 codes.
- Saved queries persist the active view per analysis on `fieldnote_queries.definition.analyzeView`. No migration; legacy queries deserialize to defaults.

## Current Known Issues

- Current UI is still provisional and needs a later creative direction pass, but it has begun moving away from card-heavy dashboard styling.
- Right rail still contains too many unrelated concepts.
- Relationships view is only a placeholder.
- AI draft panel is only a placeholder.
- Analyze has useful filters (now multi-attribute), saved queries, matrix coding, word frequency, code co-occurrence, crosstabs with cell drill-down, and coded-excerpt query snapshots. Remaining gap: snapshots for non-query analysis panels and first-class saved analysis objects.
- Report mode has a real preview, section toggles, formatted Word/PDF outputs, and CSV/XLSX raw-data exports. Remaining gaps are embedded chart bundles and full archive export.
- Classify mode has real cases, source assignments, editable text attributes, attribute CSV import, and attribute-based grouping. Remaining gap: persistent case sets.
- Code hierarchy supports parent assignment, tree display, drag-to-nest, drag-to-root, split code, exact duplicate-name review, and orphan reference review. Remaining gaps are bulk recode multi-select and fuzzy duplicate detection.
- Project sharing has database groundwork but no invite UI.
- Supabase email signup hit a temporary rate limit during automated testing.

## Mode Shell Status

Milestone 1 has been started.

Implemented:

- Project Home above all work modes.
- Multiple projects per signed-in user.
- Project Home uses a compact project register with create controls and project rows, instead of separate floating cards.
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
- Right rail was audited: universal item properties and the premature AI draft panel were removed. Memos show only in Organize/Code/Refine. Report shows an export summary. Analyze now shows query summary instead of duplicate coded excerpts.
- Report sidebar no longer duplicates export buttons; export actions live in the center Report panel.
- Removed the old ribbon from the main app flow.
- Moved source import/source list into Organize mode.
- Added Organize folder filtering and a fuller source register.
- Added source title/type/folder editing in the Organize right rail.
- Added multi-source import, custom source folders, archive/restore/delete controls, and first-pass source-to-case setup.
- Added normalized cases, source-case links, attributes, and attribute values in Supabase.
- Rebuilt Classify into a participant/case sheet with source assignment, editable case names, case notes, and editable attribute columns.
- Moved close reading/coding into Code mode.
- Moved code reference review into Refine mode.
- Tightened the Code -> Refine -> Report MVP loop with duplicate-reference merging, better code editing, and stronger CSV exports.
- Added first-pass parent/child code hierarchy in Refine with tree display, parent assignment, child-code creation, parent-aware merge/delete behavior, and parent code in codebook export.
- Added memo export to complete the basic source/code/memo reporting loop.
- Added initial Classify, Analyze, and Report work surfaces.
- Rebuilt Analyze into a query builder with text/code/case/attribute filters, result table, query summary, and query CSV export.
- Added first-pass matrix coding in Analyze with codes by case or codes by attribute value, excerpt previews in cells, and matrix CSV export.
- Added first-pass word frequency and code co-occurrence in Analyze, both driven by the active filters and exportable as CSV.
- Added first-pass crosstabs in Analyze: codes × the cartesian product of two attributes, row/column totals, Count / Row % / Col % toggle, and CSV export.
- Replaced the single attribute filter slot with an array of `(attributeId, value)` filters AND'd together; legacy saved queries auto-migrate on read. Crosstab cells now drill into the query view with a smart merge that preserves text/case filters and replaces conflicting code/attribute filters so the drilled query result count matches the cell count.
- Moved CSV export into Report mode.
- M6 Report: real preview, formatted Word + PDF outputs, sidebar Raw-data summary.
- Top-nav restructure: modes moved from a left mode-switcher to a top horizontal nav (Overview · Organize · Code · Refine · Classify · Analyze · Report) alongside brand block + project switcher.
- Phase 4 persistence split: extracted `src/persistence/{shape,io,useAutosave}` from App.tsx. shape.ts is pure (11 row-builders + normalize/compose + postgrestInList), io.ts is async Supabase, useAutosave is the React hook owning debounce + in-flight guard. App.tsx dropped ~415 lines.
- Pure destructive-op modules in `src/lib/{code,excerpt,case,source}Operations.ts` with 38+ unit tests covering merge/delete/split/restore semantics; prior inline App-methods replaced by these.
- Project Overview mode: per-project landing with title + description (new column on `fieldnote_projects`), Progress and Ontology stat cards, full-width Project memo textarea. Default landing when opening a project. Header has project switcher + top nav.
- Unified `SourcesView` component (folder headers + collapsible nested source rows) used by Organize sidebar and Code sidebar — same display everywhere sources appear.
- Width gate: app shows a "needs a wider screen" message below 1024px instead of rendering a broken layout.
- Auto-load most-recent project on sign-in (was: user landed on empty Create form even when projects existed).
- Crosstab col-key separator switched from `∥` (printable) to U+001F (control char) to defuse the value-collision class. Regression test added.
- Refine codebook now supports drag-to-nest and drag-to-root for parent/child hierarchy editing.
- Project delete from the project switcher (with confirm dialog; child tables already cascade).
- Folder rename and folder delete on user folders in the Organize SourcesView (Internals is protected; deleted folders move their sources to Internals).
- Excel/XLSX exports for every CSV export, gated by a single CSV/XLSX segmented toggle in the Report sidebar's Raw-data panel. Honored by inline Analyze exports too. xlsx (SheetJS) lazy-imported.
- Attribute CSV import in Classify: header row = attribute names, first column = case names, body cells = values. Auto-creates missing attributes, skips rows with no matching case, reports a one-line summary.
- First-run UX: empty state offers "Try a sample project" (titled "Sample project", seeded with 2 short interviews + a small code hierarchy with one parent/child pair + 2 cases with attributes + 2 saved analyses + a project memo) OR "Create a blank project" (truly empty). The project switcher's Create row only ever creates blank — sample is a one-time first-run option.
- Report customization: section toggles in the Report sidebar (Project memo, Codebook, Coded excerpts, Cases, Source memos) flow through to live preview + PDF + Word exports.
- Saved-query result snapshots: `fieldnote_query_results` table (RLS via project ownership) captures point-in-time excerpt lists for any saved coded-excerpt query. Pin button in Analyze, snapshot list with download/delete in the right inspector.
- Refine codebook cleanup: split code (move selected references to a new code), duplicate-name banner with click-to-jump links, and clearer "Merge / bulk recode" label on the existing merge.
- Header search: Cmd/Ctrl+K project search across source text, memos, code names/descriptions, case names/notes, and coded excerpts.
- Import extraction: PDF files now use `pdfjs-dist` for real page text extraction; DOCX imports preserve more block/list structure via Mammoth HTML -> sanitized structured text.
- Classify case grouping: the case sheet can group cases by any attribute value.
- Refine orphan review: references whose codes were deleted or missing can be reviewed, re-tagged, or deleted.

Still needed:

- Project share controls (delete works; sharing/inviting is unbuilt).
- Mode-specific right rails outside Organize need another design pass.
- Organize mode still needs richer source previews.
- Classify still needs persistent case sets and richer filtering.
- Snapshots beyond coded-excerpt queries (matrix / wordfreq / co-occurrence / crosstab snapshots) — extension of the existing `fieldnote_query_results` table via the `result_kind` discriminator.
- Codebook cleanup beyond split/dedupe/orphan review: bulk recode UX (multi-select rows in a code's references and re-tag without deleting source), fuzzy-match duplicate detection (currently exact-normalized match only).
- Non-text source types (PDF as PDF with page anchors, DOCX rich preview, audio/video, image regions) — text extraction/import works today, but native source rendering/coding is not built.
- Tablet/mobile: blocked behind a 1024px gate, no responsive design.
- Persistence-layer integration tests (mocked Supabase) — deferred during Phase 4.

## Required Next Step

Do **not** add more one-off UI panels.

The MVP path and most of Phase A/B Small + Medium items are done.
Project sharing is parked (most QDA usage is solo; building it before
the demand exists is unjustified). Top of the remaining list, in
recommended order:

1. **Non-text source types** — coding PDF as PDF (with page anchors),
   richer DOCX, eventually audio/video with transcript-linked playback.
2. **AI-assist** — suggested codes / summaries / "find more like this".
   Real differentiator; needs its own brainstorm before scoping.
3. **Saved analysis objects beyond coded-query snapshots** — matrices,
   crosstabs, word frequency, and co-occurrence snapshots.
4. Lower-priority polish: richer source previews; persistent case sets,
   multi-select bulk recode in Refine, fuzzy duplicate detection, and
   embedded chart outputs in the formatted Report.

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

## Data safety / "do not lose Stacey's work"

Real research data deserves boring, redundant, recoverable storage. Layers
of protection, weakest first:

### 1. Autosave (in-app, automatic)

- Debounced 700 ms after every state change.
- In-flight guard prevents two saves overlapping.
- `Saving...` / `Saved to Supabase.` / `Save failed: <reason>` visible in
  the header. Failures render the pill in red.
- Browser `beforeunload` handler triggers the "Leave site?" dialog when
  there are buffered or in-flight changes, so a user can't accidentally
  close mid-save.

### 2. IndexedDB local recovery (in-app, automatic)

- Every successful Supabase save also writes the latest project state to
  IndexedDB (`fieldnote-recovery` DB, `project_snapshots` store).
- On project load, if the local copy's `capturedAt` is >5 s newer than
  the remote `updated_at`, the user gets a confirm dialog to restore.
- Single snapshot per (user, project); each save overwrites. Survives
  network loss, tab crash, mid-save browser update, multi-device
  divergence — anything short of a full browser-data wipe.

### 3. Manual backup file (user-driven, on demand)

- "Backup current project" in the project switcher dropdown downloads a
  `.fieldnote.json` containing every authored object plus settings.
- "Import backup as new project" creates a fresh project from a
  `.fieldnote.json`. Never overwrites; bad/wrong-version files are
  rejected with a friendly message.
- Tell users to download a backup before any risky operation (bulk
  delete, mass merge, model migration).

### 4. Supabase platform backups (we are intentionally on free tier)

Fieldnote runs on Supabase free tier. **No automated platform backups,
no point-in-time recovery.** Mitigation is the layered local + manual
strategy above (autosave → IndexedDB versioned history → user-driven
`.fieldnote.json` exports). For one or a few researchers, this is
adequate; the user's own browser + downloaded files are effectively
the disaster-recovery system.

**Operational habits to compensate:**

- Before any schema migration, trigger a manual export from Supabase
  dashboard (Project Settings → Database → Backups → Schedule → Export
  CSV). Free tier supports CSV-per-table export; not pretty but
  recoverable.
- Tell users in the app to download a `.fieldnote.json` before risky
  operations. The Overview "Your work is safe" panel says this.
- If you ever start carrying research data that wouldn't be acceptable
  to lose, that's the moment to upgrade ($25/mo Pro plan adds daily
  auto-backups + 7-day PITR).

### 5. Pre-migration checklist (operational, you run this)

Before any migration that drops/renames columns or alters constraints:

- [ ] Run `supabase db push --dry-run` to inspect the SQL.
- [ ] Trigger a Supabase manual backup (dashboard → Database → Backups
      → Create backup).
- [ ] Have at least one user export a `.fieldnote.json` of their
      current project so end-to-end restore is testable.
- [ ] Push the migration to a Supabase preview branch first if the
      change is non-trivial. (Preview branches don't auto-receive
      production env vars; provision them explicitly.)
- [ ] If the migration could lose data on rollback, write a separate
      down-migration that round-trips on a copy of production before
      applying.

### 6. Pre-destructive-action checklist (in-app behavior)

Every destructive action in the app must:

- Confirm with `window.confirm` (already in place for delete project,
  delete code, delete folder, delete excerpt, etc.).
- Spell out the cascade (e.g. "Delete this project? Permanently removes
  all sources, codes, memos, excerpts, cases, attribute values, saved
  queries, and snapshots.").
- Never trigger from a single key press without the dialog.

When adding a new destructive action, mirror the pattern in
`deleteProject` (`src/App.tsx`) — confirm, list cascading consequences,
update local state and remote in the same handler.

### 7. Catastrophic-recovery runbook

We are intentionally on Supabase free tier. **There is no platform
auto-restore, no point-in-time recovery, no 24h RPO.** Real recovery
order, in priority of how good the data is:

1. **App is still up, user is panicking:** tell them to use "Backup
   current project" (project switcher dropdown OR the green safety panel
   on Overview) immediately. The download is a snapshot they can
   re-import as a new project. This is the highest-fidelity copy
   available — every authored object plus settings.
2. **User thinks they lost work after a crash:** on next sign-in, the
   IndexedDB recovery dialog appears automatically when the local copy
   is newer than the remote. If they declined and want it back: DevTools
   → Application → IndexedDB → `fieldnote-recovery` → `project_snapshots`
   — the row is keyed `<userId>::<projectId>`. The `project_versions`
   store has up to 10 daily versions per project.
3. **Supabase data corrupted or gone (unrecoverable on free tier):**
   - Best case: a recent `.fieldnote.json` from the user → import as a
     new project.
   - Next: the user's IndexedDB recovery (#2 above) on the same browser
     they last used.
   - Last resort: a manual Supabase CSV export you took **before** the
     incident (Project Settings → Database → Export). If you didn't
     take one, the data is gone.
4. **Bad deploy is in production:** revert in Vercel dashboard → that
   release → "Promote to production." Vercel keeps the previous build
   instantly available. This restores the app code; it does NOT touch
   user data, which lives in Supabase.

**There is no magic Supabase rollback on free tier.** The recovery
chain is `.fieldnote.json` → IndexedDB → manual Supabase CSV export.
If Stacey ever carries data she truly cannot lose, that's the moment
to pay $25/mo for Pro and unlock daily auto-backups + 7-day PITR.

## Recent Commits

For an up-to-date list run `git log --oneline -15`. The handoff bullets above
are the canonical narrative; commit history is the canonical record.
