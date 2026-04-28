# Fieldnote Data Model Plan

## Why This Exists

Fieldnote currently proves the core research loop with a simple project row and JSON fields. That is useful for MVP speed, but it should not become the permanent architecture.

The full Fieldnote roadmap includes PDFs, documents, images, audio/video, transcription, AI suggestions, collaboration, inter-coder reliability, queries, visualizations, and rich exports. Those features need real database objects.

This plan maps the future model so new MVP work does not paint the product into a corner.

## Current Prototype Model

Current tables:

```text
fieldnote_projects
fieldnote_project_members
```

Current JSON fields on `fieldnote_projects`:

```text
sources
codes
memos
excerpts
active_source_id
```

This is acceptable for:

- proving the workflow
- small single-user projects
- text-only source coding
- simple CSV exports

It is not acceptable long-term for:

- collaboration
- conflict handling
- inter-coder reliability
- large source collections
- media/image/PDF region coding
- formal query systems
- AI audit trails
- source/file storage
- robust reporting

## Core Modeling Principle

Fieldnote should model **research objects**, not UI panels.

The important objects are:

```text
Project
Source
Source File
Source Segment
Code
Coded Reference
Memo
Case
Attribute
Relationship
Query
Export
Project Member
Review / Coding Assignment
AI Suggestion
```

The UI modes should sit on top of those objects:

```text
Organize -> Sources, files, folders, cases
Code -> Sources, segments, codes, coded references
Refine -> Codes, code hierarchy, coded references, code memos
Classify -> Cases, attributes, attribute values
Analyze -> Queries, matrices, search results, visualizations
Report -> Exports, report definitions, generated files
```

## Proposed Tables

### Projects

`fieldnote_projects`

Purpose: top-level research workspace.

Key fields:

```text
id
owner_id
title
description
status
created_at
updated_at
archived_at
```

Keep this table. Remove JSON payloads later after migration.

### Project Members

`fieldnote_project_members`

Purpose: sharing, collaboration, and roles.

Key fields:

```text
project_id
user_id
role
created_at
```

Future roles:

```text
owner
editor
coder
reviewer
viewer
```

### Folders

`fieldnote_folders`

Purpose: organize sources and possibly memos/reports later.

Key fields:

```text
id
project_id
parent_folder_id
name
kind
sort_order
created_at
updated_at
```

Possible `kind` values:

```text
source
memo
case
report
```

### Sources

`fieldnote_sources`

Purpose: logical research material, such as an interview, article, PDF, recording, survey, or web capture.

Key fields:

```text
id
project_id
folder_id
title
source_type
status
plain_text
metadata
imported_at
created_at
updated_at
archived_at
```

Possible `source_type` values:

```text
transcript
document
pdf
image
audio
video
spreadsheet
survey
web_capture
reference
note
```

`plain_text` can support text search and first-pass coding. Rich source rendering should use source files and extracted structure.

### Source Files

`fieldnote_source_files`

Purpose: track uploaded files and derived artifacts.

Key fields:

```text
id
project_id
source_id
storage_path
file_name
mime_type
file_size
file_role
metadata
created_at
```

Possible `file_role` values:

```text
original
thumbnail
transcript
ocr_text
preview
export
```

This table likely pairs with Supabase Storage or another file store.

### Source Segments

`fieldnote_source_segments`

Purpose: represent addressable parts of a source. This is what makes non-text coding possible.

Key fields:

```text
id
project_id
source_id
segment_type
text_start
text_end
page_number
time_start_ms
time_end_ms
region
content
metadata
created_at
```

Possible `segment_type` values:

```text
text_range
pdf_range
image_region
media_time_range
spreadsheet_range
survey_response
web_region
```

`region` should be JSON for coordinates:

```text
{ "x": 0.12, "y": 0.2, "width": 0.4, "height": 0.18 }
```

The current `excerpts.text` field is a prototype version of this concept.

### Codes

`fieldnote_codes`

Purpose: codebook items.

Key fields:

```text
id
project_id
parent_code_id
name
description
color
code_type
sentiment
sort_order
created_at
updated_at
archived_at
```

Possible `code_type` values:

```text
theme
sentiment
relationship
process
attribute_marker
```

Parent/child hierarchy belongs here through `parent_code_id`.

### Coded References

`fieldnote_coded_references`

Purpose: links codes to source segments.

Key fields:

```text
id
project_id
source_id
segment_id
code_id
coded_by
note
created_at
updated_at
```

Important: one highlighted passage with multiple codes should become multiple rows that share the same `segment_id`.

This supports:

- multi-code excerpts
- inter-coder comparison
- removing one code from a segment
- code frequency
- co-occurrence
- matrix coding

### Memos

`fieldnote_memos`

Purpose: analytic writing objects.

Key fields:

```text
id
project_id
memo_type
title
body
linked_object_type
linked_object_id
created_by
created_at
updated_at
```

Possible `memo_type` values:

```text
project
source
code
case
analysis
report
free
```

### Cases

`fieldnote_cases`

Purpose: participants, organizations, events, sites, or other units of analysis.

Key fields:

```text
id
project_id
name
case_type
description
created_at
updated_at
archived_at
```

### Case Source Links

`fieldnote_case_sources`

Purpose: connect cases to sources.

Key fields:

```text
case_id
source_id
relationship_type
created_at
```

Example: one interview source belongs to one participant case, but a case may have many sources.

### Attributes

`fieldnote_attributes`

Purpose: define demographic or analytic metadata fields.

Key fields:

```text
id
project_id
name
attribute_type
options
created_at
updated_at
```

Possible `attribute_type` values:

```text
text
number
date
boolean
single_select
multi_select
```

### Attribute Values

`fieldnote_attribute_values`

Purpose: store values for cases or sources.

Key fields:

```text
id
project_id
attribute_id
object_type
object_id
value_text
value_number
value_date
value_boolean
value_json
updated_at
```

This supports comparisons by participant attributes.

### Relationships

`fieldnote_relationships`

Purpose: analytic links between research objects.

Key fields:

```text
id
project_id
relationship_type
from_object_type
from_object_id
to_object_type
to_object_id
label
note
created_by
created_at
updated_at
```

Examples:

- code relates to code
- case relates to case
- source supports claim
- memo synthesizes code

### Annotations

`fieldnote_annotations`

Purpose: comments/notes attached to exact source segments or objects.

Key fields:

```text
id
project_id
source_id
segment_id
body
created_by
created_at
updated_at
```

### Queries

`fieldnote_queries`

Purpose: saved analysis operations.

Key fields:

```text
id
project_id
query_type
name
definition
created_by
created_at
updated_at
```

Possible `query_type` values:

```text
text_search
word_frequency
coding_query
matrix_coding
code_cooccurrence
attribute_comparison
```

`definition` should be JSON containing filters, selected codes, selected cases, source scopes, and options.

### Query Results

`fieldnote_query_results`

Purpose: cache or preserve query outputs when useful.

Key fields:

```text
id
project_id
query_id
result
created_at
```

### Visualizations

`fieldnote_visualizations`

Purpose: saved visual outputs or configurations.

Key fields:

```text
id
project_id
visualization_type
name
definition
created_at
updated_at
```

Possible `visualization_type` values:

```text
word_cloud
chart
hierarchy_chart
cluster_map
mind_map
concept_map
relationship_map
```

### AI Suggestions

`fieldnote_ai_suggestions`

Purpose: keep AI outputs reviewable and auditable.

Key fields:

```text
id
project_id
suggestion_type
source_object_type
source_object_id
suggested_object_type
payload
status
created_by
created_at
reviewed_by
reviewed_at
```

Possible `status` values:

```text
pending
accepted
rejected
applied
```

AI suggestions should not silently mutate research data.

### Exports

`fieldnote_exports`

Purpose: export jobs and generated files.

Key fields:

```text
id
project_id
export_type
format
definition
storage_path
status
created_by
created_at
completed_at
```

Formats:

```text
csv
xlsx
docx
pdf
json_archive
zip_archive
```

### Coding Assignments

`fieldnote_coding_assignments`

Purpose: team coding and reviewer workflows.

Key fields:

```text
id
project_id
source_id
assigned_to
assigned_by
status
due_at
created_at
updated_at
```

### Coding Reviews

`fieldnote_coding_reviews`

Purpose: reviewer roles, conflict handling, and inter-coder reliability.

Key fields:

```text
id
project_id
source_id
reviewer_id
coder_a_id
coder_b_id
status
metrics
created_at
updated_at
```

`metrics` can store agreement data such as percent agreement or Cohen's kappa once implemented.

## Migration Phases

### Phase 0: Current Prototype

Keep using JSON on `fieldnote_projects` while validating the MVP workflow.

Allowed work:

- UI mode refinement
- text import
- text coding
- codebook cleanup
- basic memos
- basic CSV exports

Avoid:

- complex collaboration
- media coding
- transcription pipelines
- formal query engine
- AI mutation of data

### Phase 1: Normalize Core Text-Coding Objects

Create:

```text
fieldnote_sources
fieldnote_codes
fieldnote_source_segments
fieldnote_coded_references
fieldnote_memos
fieldnote_folders
```

Migration:

- Convert JSON `sources` into `fieldnote_sources`.
- Convert JSON `codes` into `fieldnote_codes`.
- Convert JSON `excerpts` into `fieldnote_source_segments` plus `fieldnote_coded_references`.
- Convert JSON `memos` into `fieldnote_memos`.

Keep JSON fields temporarily as backup during migration.

### Phase 2: Cases And Attributes

Status: implemented as the first MVP pass in `20260428020000_add_cases_and_attributes.sql`.

Create:

```text
fieldnote_cases
fieldnote_case_sources
fieldnote_attributes
fieldnote_attribute_values
```

This unlocks:

- real Classify mode
- participant sheets
- comparisons by case attributes
- matrix coding foundations

Current MVP depth:

- cases can be created from sources
- sources can be assigned to cases
- text attributes can be created in the UI
- attribute values can be edited in the Classify case sheet

Still later:

- attribute import
- case groups/sets
- typed attribute controls beyond free text
- matrix queries that consume these fields

### Phase 3: Source Files And Rich Source Types

Create:

```text
fieldnote_source_files
```

Add source processing for:

- PDF text extraction
- DOCX extraction
- image preview/OCR
- audio/video metadata
- spreadsheet parsing
- survey import

This phase should introduce Supabase Storage or another durable file store.

### Phase 4: Queries And Analysis

Create:

```text
fieldnote_queries
fieldnote_query_results
fieldnote_visualizations
```

This unlocks:

- saved searches
- word frequency
- coding queries
- co-occurrence
- matrix coding
- charts and visualizations

### Phase 5: Collaboration And Review

Expand:

```text
fieldnote_project_members
```

Create:

```text
fieldnote_coding_assignments
fieldnote_coding_reviews
```

This unlocks:

- project sharing
- roles
- team coding
- reviewer workflows
- conflict handling
- inter-coder reliability

### Phase 6: AI And Automation

Create:

```text
fieldnote_ai_suggestions
```

AI must be auditable:

- store suggestions
- require human approval
- record who accepted/rejected
- preserve prompt/context metadata where appropriate

### Phase 7: Rich Exports And Archives

Create:

```text
fieldnote_exports
```

This unlocks:

- report builder
- DOCX/PDF export
- Excel export
- chart export
- project archive export

## RLS Direction

Every normalized table should include `project_id`.

General rule:

```text
owners can do everything
editors can create/update most project objects
coders can create coded references, memos, and annotations where assigned
reviewers can read assigned material and create review records
viewers can read only
```

Avoid recursive RLS policies. Continue using security-definer helper functions like:

```text
fieldnote_project_member_role(project_id, user_id)
fieldnote_project_owner_id(project_id)
```

## Implementation Rules

- Do not normalize everything in one pass.
- Do not build advanced collaboration on JSON blobs.
- Do not build media/image/PDF coding without `source_segments`.
- Do not build AI auto-apply behavior; AI outputs should become suggestions first.
- Do not build query/visualization features that require expensive client-side scanning of huge JSON projects.
- Prefer additive migrations and dual-read/dual-write during transitions.

## Near-Term Recommendation

Continue MVP UI work only if it stays portable to the future model.

Before adding project sharing, media imports, serious Analyze mode, or AI, implement Phase 1 normalization.
