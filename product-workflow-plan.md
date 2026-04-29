# Fieldnote Product Workflow Plan

## Why This Plan Exists

Fieldnote started as a fast prototype of an NVivo-like qualitative research tool. The current app has useful pieces: authentication, Supabase saving, sources, codes, excerpts, memos, and a pane layout.

The problem is that the UI has been too literal about NVivo's visible layout. It copied the furniture before fully modeling the research process.

The correction is this:

```text
Fieldnote should be organized around research passes, not permanent all-purpose panes.
```

The next work should not add more panels or buttons. It should restructure the app around modes that match how qualitative researchers actually move through a project.

## Product Principle

The MVP strategy is **full map, MVP depth**.

Fieldnote should show the full qualitative workflow now:

```text
Project Home -> Organize -> Code -> Refine -> Classify -> Analyze -> Report
```

But only the critical loop must be deep for MVP:

```text
Import sources -> code excerpts with multiple codes -> review/refine references -> memo -> export
```

Classify, advanced Analyze, and fuller Report features should remain visible as clear placeholders until the core loop is reliable.

## Full Product Ambition

Fieldnote is not intended to stop at the current text-coding MVP. The long-term ambition is broad qualitative research software comparable in scope to NVivo, but with a clearer, calmer, more modern workflow.

### Feature Domains

#### Projects

Import and organize:

- interviews and transcripts
- PDFs
- documents
- images
- audio
- video
- spreadsheets
- surveys
- web captures
- references and bibliographic materials

#### Coding

Support coding across research media:

- highlighted text
- media time ranges
- image regions
- nested/parent-child codes
- sentiment codes
- relationship codes
- notes
- annotations

#### Research Workspace

Support the working environment researchers expect:

- source viewer
- codebook
- folders
- tabs
- side-by-side views
- memos
- attributes/demographics
- cases/participants

#### Search And Queries

Support structured analysis:

- text search
- word frequency
- coding queries
- matrix coding
- crosstabs
- comparisons by participant attributes

#### Visualizations

Support visual sensemaking:

- word clouds
- charts
- hierarchy charts
- cluster analysis
- mind maps
- concept maps
- relationship maps

#### Transcription

Support audio/video research materials:

- audio/video transcription
- speaker labels
- transcript-linked media playback

#### AI Assistant

AI should be contextual and approval-based, not an ambient autopilot:

- summaries
- suggested codes and sub-codes
- thematic suggestions
- "ask your data" querying
- human approval before applying AI suggestions

#### Collaboration

Support shared research work:

- shared projects
- team coding
- reviewer roles
- conflict handling
- inter-coder reliability
- cloud sync

#### Exports

Support getting research out of the system:

- codebook exports
- coded excerpts
- reports
- charts
- Word exports
- Excel exports
- PDF exports
- CSV exports
- archive formats

### Current MVP Slice

The current build only covers a narrow but important spine:

```text
projects -> text import -> text coding -> codebook refinement -> memos -> basic cases -> CSV exports
```

That is intentional for MVP, but it is not the full product definition.

### Major Parity Gaps

- non-text source types
- PDF/DOCX parsing and preview
- image/media region coding
- audio/video transcription and playback
- nested code hierarchy
- annotations and relationships
- full source search and formal queries
- advanced matrix coding and crosstabs
- visualizations
- AI-assisted analysis
- project sharing and team workflows
- inter-coder reliability
- rich Word/Excel/PDF exports

### Architecture Implication

The current JSON-on-`fieldnote_projects` model should not be stretched into the full feature set. Full parity needs real normalized data structures for:

- sources and source files
- source segments / media ranges / image regions
- codes and code hierarchy
- coded references
- annotations
- memos
- cases
- attributes and attribute values
- relationships
- queries and query results
- exports
- project members, roles, and review state

Keep the prototype simple while validating the core loop, but plan to normalize before building collaboration, media, transcription, AI, or serious querying.

The detailed table and migration plan is in:

```text
data-model-plan.md
```

Current MVP loop target:

- Code mode should avoid duplicate references when the same passage is coded again.
- Refine mode should let users edit code names, colors, descriptions, and reference notes.
- Report mode should produce useful coded-excerpt and codebook CSV files before richer Word/PDF reporting exists.

Each mode should answer one question:

```text
What kind of research work is the user doing right now?
```

If something does not help that mode, hide it or move it to another mode.

Fieldnote should feel like a set of focused workspaces:

- Choose the project.
- Organize the material.
- Code the material.
- Refine the codebook.
- Classify cases and attributes.
- Analyze patterns.
- Report/export findings.

## Corrected Reading Of NVivo

The NVivo UI document is not just describing columns and a ribbon. It is describing a system of research objects and work phases.

### Sources

Sources are the raw research materials:

- transcripts
- PDFs
- articles
- notes
- images
- audio/video transcripts
- datasets

In Fieldnote, Sources should be the place where the researcher prepares and opens raw material.

### Nodes / Codes

Nodes are an analytic overlay on top of sources. They are not just labels. They become containers of evidence.

In Fieldnote, Codes should support:

- quick creation during reading
- multiple codes on one excerpt
- definitions
- code memos
- references
- nesting / hierarchy
- merging / splitting
- review and refinement

### Memos

Memos are analytic writing objects. They are not merely comments.

Fieldnote should support:

- project memos
- source memos
- code memos
- case memos
- analysis memos
- linked memos

Memos should be central in sensemaking, not crammed into a small side box.

### Classifications

Classifications are metadata structures. They make comparison possible.

Examples:

- source type
- participant/case type
- age group
- gender
- role
- organization
- cohort
- site
- custom attributes

In Fieldnote, this should become a dedicated Classify mode.

### Queries

Queries are the structured analysis layer.

Examples:

- text search
- word frequency
- coding query
- code co-occurrence
- matrix coding
- compare by case attributes

In Fieldnote, queries belong in Analyze mode, not in the source coding workspace.

### Outputs

Outputs are how research leaves the system:

- codebook export
- coded excerpt export
- memo export
- evidence tables
- reports
- CSV / Word / PDF outputs

In Fieldnote, this belongs in Report mode.

## Proposed Modes

Before the six work modes, Fieldnote needs a Project Home.

Project Home is where a signed-in researcher chooses or creates a project. A professor may have separate projects for a grant, a dissertation committee, a class study, a paper, or a service assessment. Those projects should not be mixed inside Organize mode.

The app should have six primary modes:

```text
Organize
Code
Refine
Classify
Analyze
Report
```

The mode switcher should be the main app navigation. The current ribbon can either become secondary or be removed.

## Global App Shell

Recommended shell:

```text
Project Home: project list, create project, account controls

Inside a project:
Top: Project name, save status, mode switcher, account controls
Left: Mode-specific object list / navigation
Center: Main work surface
Right: Context panel, only when useful
```

The right rail should not be a permanent junk drawer. It should change by mode.

## Project Home

### Purpose

Choose which research project is active before entering the analysis workspace.

### User Jobs

- Create a project.
- Open an existing project.
- Later: rename, duplicate, archive, delete, and share projects.
- Later: see project metadata such as owner, collaborators, last updated, source count, and reference count.

### Visible UI

Center:

- project list/cards
- create project form
- project summaries

Header:

- Fieldnote brand
- sync/status text
- signed-in account

### Hidden Here

- source coding controls
- codebook refinement tools
- query tools
- reports

### Current App Gap

Project Home now exists, but it is still basic. It needs rename/delete/share, better summaries, and eventually project templates.

## Mode 1: Organize

### Purpose

Get the project material into shape before analysis.

### User Jobs

- Import sources.
- Rename sources.
- Put sources in folders.
- See source types.
- Prepare cases/participants.
- Add or inspect source metadata.

### Visible UI

Left:

- Source folders
- Internals
- Externals
- Memos
- Cases, eventually

Center:

- Source table/list
- Columns: title, type, folder, references, memo status, imported date

Right:

- Selected source properties
- Source memo shortcut
- Import details

### Main Actions

- Import source
- New folder
- Rename
- Move to folder
- Create case from source

### Hidden In This Mode

- Active coding controls
- AI theme draft
- Query tools
- Report tools

### Current App Gap

Source handling is now less shallow: Organize mode has folder filters, source-driven custom folders, a source register, source properties, multi-file import, archive/restore/delete controls, and first-pass source-to-case setup. It still needs folder rename/delete, richer source previews, file metadata, and proper case/classification sheets.

## Mode 2: Code

### Purpose

Close reading and first-pass coding.

### User Jobs

- Open one source.
- Read carefully.
- Highlight text.
- Apply one or more codes.
- Create quick codes.
- Write a source memo.
- See recent coding activity.

### Visible UI

Left:

- Sources list
- Maybe folder filter

Center:

- Source reader
- Highlighted coded passages
- Coding toolbar
- Toggleable contextual quick coding menu after text selection

Right:

- Active codes
- Quick code input
- Source memo
- Recent excerpts from this source

### Main Actions

- Code selection
- Quick code selected text from contextual menu
- Create quick code
- Add note to coded selection
- Open source memo

### Hidden In This Mode

- Code merge/split tools
- Matrix queries
- Export reports
- Full project properties

### Current App Gap

The current app has this partially. It still exposes too much unrelated material while coding.

## Mode 3: Refine

### Purpose

Turn messy first-pass coding into a coherent codebook.

### User Jobs

- Review codes.
- Rename codes.
- Write definitions.
- Add examples.
- See all references under one code.
- Merge similar codes.
- Split broad codes.
- Nest child codes under parent codes.
- Find weak or overused codes.

### Visible UI

Left:

- Codebook tree
- Parent/child code hierarchy

Center:

- Selected code references
- Definition
- Example quotes

Right:

- Code properties
- Code memo
- Merge/split/nest tools
- Counts and diagnostics

### Main Actions

- Rename code
- Edit definition
- Create child code
- Merge codes
- Move references
- Write code memo

### Hidden In This Mode

- Source import
- General project memo
- Report builder

### Current App Gap

Refine now supports first-pass hierarchy, merging, splitting selected text out of references, code definitions, and code memos. It still needs stronger tree manipulation, code splitting workflows, and codebook review states.

## Mode 4: Classify

### Purpose

Create cases/participants and attach attributes so analysis can compare groups.

### User Jobs

- Create cases from participants/interviews.
- Assign sources to cases.
- Add attributes.
- Fill in case metadata.
- Build classification sheets.

### Visible UI

Left:

- Cases
- Source classifications
- Code classifications

Center:

- Spreadsheet-like classification table

Right:

- Selected case details
- Attribute editor
- Linked sources

### Main Actions

- New case
- Add attribute
- Assign source to case
- Import classification sheet

### Hidden In This Mode

- Source coding controls
- Memo drafting tools, except case memo
- Report exports

### Current App Gap

Not implemented.

## Mode 5: Analyze

### Purpose

Ask structured questions of the project.

### User Jobs

- Search text.
- Search coded excerpts.
- Run word frequency.
- Find code overlaps.
- Compare codes by case attributes.
- Build matrices.
- Save query results.

### Visible UI

Left:

- Query types
- Saved queries

Center:

- Query result table/matrix/chart

Right:

- Query settings
- Filters
- Attribute selectors
- Export result button

### Main Actions

- Text search
- Word frequency
- Coding query
- Matrix coding query
- Code co-occurrence

### Hidden In This Mode

- Import flow
- Code refinement controls, unless filtering by code
- Source memo editor

### Current App Gap

First MVP pass implemented:

- text search over coded excerpts
- filter by code
- filter by case/participant
- filter by attribute and filled attribute value
- structured result table
- query summary rail
- query result CSV export
- saved named queries

Still missing:

- word frequency
- code co-occurrence
- matrix coding

## Mode 6: Report

### Purpose

Export research artifacts.

### User Jobs

- Export coded excerpts.
- Export codebook.
- Export memos.
- Create evidence tables.
- Create reports.
- Download project backup.

### Visible UI

Left:

- Export types
- Saved reports

Center:

- Report preview / export builder

Right:

- Export settings
- Format choices
- Included fields

### Main Actions

- Export CSV
- Export DOCX
- Export PDF
- Export codebook
- Export project archive

### Current App Gap

First MVP pass implemented:

- coded excerpts CSV
- codebook CSV
- memo CSV
- case sheet CSV
- coded excerpts by case CSV
- current Analyze query CSV

Still missing:

- report preview / builder
- DOCX export
- PDF export
- full project archive

## Proposed Data Model

The current app stores too much as JSON on `fieldnote_projects`. That is acceptable for the prototype, but not for serious NVivo-like behavior.

Recommended future tables:

```text
projects
project_members
folders
sources
codes
code_references
memos
cases
attributes
case_attribute_values
relationships
queries
exports
```

### Current Tables

Currently implemented:

```text
fieldnote_projects
fieldnote_project_members
```

Current JSON fields:

```text
sources
codes
memos
excerpts
active_source_id
```

### Migration Strategy

Do not normalize everything at once.

Recommended order:

1. Keep current JSON model while redesigning modes.
2. Once mode flows stabilize, normalize `sources`, `codes`, `memos`, and `excerpts`.
3. Add cases/classifications as real tables from the start.
4. Add project sharing around real `project_members`.

## What To Preserve From Current App

Keep:

- Supabase Auth
- Per-user projects
- Autosave
- Multiple sources
- Multiple codes per excerpt
- Basic code reference view
- Context-aware memos
- Vercel deployment
- Existing visual restraint

## What To Remove Or De-emphasize

Remove/de-emphasize:

- Permanent all-purpose right rail
- AI draft panel as always-visible chrome
- Properties panel as always-visible chrome
- Relationship map placeholder in the main flow
- Ribbon actions that do not belong to the current mode

## New Navigation Recommendation

Replace the current ribbon-first mental model with a mode switcher:

```text
Organize | Code | Refine | Classify | Analyze | Report
```

Each mode can still have local toolbar actions.

Example:

```text
Code mode toolbar:
Import | Code Selection | Quick Code | Source Memo
```

```text
Refine mode toolbar:
New Code | Child Code | Merge | Split | Move References
```

```text
Report mode toolbar:
Export CSV | Export Codebook | Export Memos | Export Project
```

## Implementation Plan

### Milestone 1: Mode Shell

Goal: stop the UI from showing everything at once.

Tasks:

- Add `mode` state: `organize`, `code`, `refine`, `classify`, `analyze`, `report`.
- Replace current Navigation View labels with mode switcher.
- Create mode-specific layout components.
- Move current source coding screen into Code mode.
- Move current code reference screen into Refine mode.
- Move export button into Report mode.
- Hide AI and relationship placeholders unless in relevant mode.

Acceptance criteria:

- User can switch modes.
- Each mode has a clear purpose.
- Code mode shows source reader and coding tools only.
- Refine mode shows codebook and references only.
- Report mode shows export options only.

### Milestone 2: Organize Mode

Goal: make sources feel like project material, not a sidebar.

Tasks:

- Add source table/list as central surface.
- Add folders concept in UI.
- Allow source rename.
- Allow source open.
- Add source type display.
- Keep import here as primary action.

Acceptance criteria:

- Researcher can import multiple sources and see them in a manageable list.
- Opening a source moves to Code mode or opens it inside Organize with a clear action.

### Milestone 3: Code Mode

Goal: make close reading excellent.

Tasks:

- Left: source list.
- Center: source reader.
- Right: active codes + source memo + recent references.
- Add quick code creation.
- Keep multi-code selection.
- Improve selection feedback. First pass done with toggleable contextual quick coding menu.

Acceptance criteria:

- User can read one source without unrelated panels.
- User can code a selection with one or more codes.
- Source memo is available but not cramped.

### Milestone 4: Refine Mode

Goal: make codebook work real.

Tasks:

- Left: codebook list/tree. First pass done.
- Center: references for selected code. First pass done.
- Right: code definition + code memo. First pass done.
- Add parent/child UI shape. First pass done.
- Add rename and description editing. Done.
- Later: richer merge/split and review states.

Acceptance criteria:

- User can review a code as an evidence container.
- User can edit code name/definition.
- User can write code memo.

### Milestone 5: Classify Mode

Goal: add cases and attributes.

Tasks:

- Add cases data model.
- Add case table.
- Add attributes.
- Link sources to cases.
- Add basic case memo.

Acceptance criteria:

- User can create participant/case records.
- User can add attributes and values.

### Milestone 6: Analyze Mode

Goal: structured analysis.

Tasks:

- Text search. First pass done.
- Word frequency. First pass done for filtered coded excerpts.
- Code co-occurrence. First pass done for code pairs on filtered coded excerpts.
- Basic matrix coding. First pass done for codes by case and codes by attribute value.
- Filters by source/code/case attribute. First pass done for code, case, and attribute value.

Acceptance criteria:

- User can ask structured questions and see results.

### Milestone 7: Report Mode

Goal: useful outputs.

Tasks:

- Export coded excerpts.
- Export codebook.
- Export memos.
- Build evidence table.
- Export project backup.

Acceptance criteria:

- User can get work out of Fieldnote in useful formats.

## UX Rules Going Forward

- Do not show every tool all the time.
- Every mode needs one primary user job.
- Memos should be large enough to write in.
- AI should be opt-in and contextual, not ambient decoration.
- Right rail is optional and mode-specific.
- Avoid dashboard clutter.
- Prefer research verbs over software nouns where possible.
- Do not add feature placeholders unless they clarify the intended flow.

## Immediate Next Code Pass

The mode shell is now in place. The next code pass should deepen one of the partial MVP surfaces instead of adding a new mode.

Best candidates:

- Analyze: crosstabs, visualization scaffolding, or stored query result snapshots.
- Report: report preview and formatted Word/PDF exports.
- Refine: hierarchy drag-and-drop and richer codebook cleanup.
