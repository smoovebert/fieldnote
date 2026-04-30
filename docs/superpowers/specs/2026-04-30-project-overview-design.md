# Project Overview Design Spec

**Status:** Design approved 2026-04-30
**Goal:** Replace the multi-project landing page with a single per-project Overview view that gives the project memo an obvious authoring location and serves as the default landing when a project is opened.

## Background

Today the project memo (`memos[].linkedType === 'project'`) is written by `updateRailMemo` (`src/App.tsx:1418`) when the active mode is *not* organize/code/refine. But the rail memo panel only renders in organize/code/refine (`src/App.tsx:2428`) — so the project-memo branch is dead code. A user has no UI surface where they can write a project memo, despite the data structure pretending they can. The seed prose that materialized on the Report came from `initialMemos` in `src/lib/defaults.ts` and was just blanked (commit 2492dd6).

The fix is to give the project memo a real home, and the natural place is on a per-project Overview view. Today there is no per-project landing — opening a project drops the user straight into the Code mode. The current "Project Home" is the multi-project picker.

## Design overview

Replace the dedicated multi-project landing shell (`project-home-shell`) with a single workspace shell that always renders. The workspace contains a project switcher in the header, a top-nav with a new **Overview** mode, and the existing modes (Organize / Code / Refine / Classify / Analyze / Report). Opening a project lands on Overview. Switching projects happens via a header dropdown.

## Pages and shells

**One shell, always.** The workspace chrome (header + top nav + content area) renders on every visit. When the user has zero projects, the Overview content shows an empty-state Create form inside the same shell. Modes other than Overview are disabled until a project exists.

The current `project-home-shell` (`src/App.tsx:1685`) and its multi-project list page are removed.

## Header

| Position | Element | Behavior |
|---|---|---|
| Left | Brand mark (Fieldnote "F" tile) | Unchanged |
| Left-center | **Project switcher dropdown** | Trigger: active project title + chevron. When no project, shows "No project selected". Dropdown contains the project list (title + last-updated date), a divider, and an inline "+ Create new project" row. Switching calls the existing `applyProject(...)` flow. |
| Center-right | **Top nav** | `Overview · Organize · Code · Refine · Classify · Analyze · Report`. Overview is new and is the default active view when opening any project. Modes other than Overview are visually grayed and unclickable when no project is loaded (i.e., the zero-projects empty state). |
| Right | Sync status, user/sign-out | Unchanged |

## Overview page content

Top to bottom:

1. **Title row.** Project title as inline-editable `h1` (click to rename, writes to `title`). Optional description subtitle (one-line, also inline-editable, writes to a new `description` field). `+ New source` button top-right triggers the existing source upload flow.
2. **Stats row** — two cards, evenly spaced:
   - **Progress** — "X of Y sources coded" with a thin progress bar. *Coded* = the source has at least one excerpt with at least one code. Y = total non-archived sources.
   - **Ontology** — count of codes + count of top-level themes (codes with no `parentCodeId`).
3. **Project memo section** — full-width card below the stats. Label: "Project memo". Multi-line textarea writing into the singleton memo where `linkedType === 'project'`. Saves through the existing autosave debounce. Placeholder when empty: "Add notes about this project's research questions, design choices, or evolving thinking."

The right inspector rail is hidden on Overview (the memo already lives on the page; nothing else useful to show in v1).

Recent Activity from the original sketch is **deferred** — without multi-author attribution it would be "you, you, you" and isn't valuable enough to ship now.

## Empty states

- **Zero projects.** Same shell, Overview content area shows a centered welcome and a Create form: project title input + Create button. After creation, navigates straight to the new project's Overview.
- **One project, zero sources.** Overview renders normally; Progress card shows "0 of 0", `+ New source` is the obvious next CTA, Ontology card shows the seed code count, Project memo textarea is empty with the placeholder.

## Data and state changes

- **New column on `fieldnote_projects`:** `description text not null default ''`. Migration: standard ALTER TABLE.
- **Type changes:**
  - `ProjectRow` (in `src/lib/types.ts`) gains `description: string`.
  - `ProjectData` gains `description: string`.
  - `SavePayload` (in `src/persistence/io.ts`) gains `description: string`.
- **Default `activeView`** when opening a project = `'overview'`.
- **`WorkspaceView` type** gains `'overview'`.
- **`updateRailMemo`'s project branch** is no longer dead code — Overview's memo textarea wires into the same logic (creates the project memo if missing, updates if present). The rail memo panel itself stays gated to organize/code/refine (no rail on Overview).
- **`projectRows` query** stays as-is for the switcher dropdown.
- **`normalizeProject` and `composeProjectFromNormalized`** in `src/persistence/shape.ts` need to populate `description` (from row → ProjectData) with `''` as fallback.
- **Builders in `src/persistence/shape.ts`:** no row-builder change needed — `description` lives on the project row directly, not in a normalized child table.

## Components

New files (suggested):
- `src/modes/overview/OverviewMode.tsx` — page composition: title row, stats row, memo section.
- `src/modes/overview/StatCard.tsx` — small reusable card for Progress and Ontology cards.
- `src/modes/overview/ProjectSwitcher.tsx` — header dropdown component, owns the project list + Create form.

`src/App.tsx` changes:
- Add `'overview'` to `WorkspaceView`.
- Add Overview to top nav.
- Remove the `project-home-shell` branch.
- Always render the workspace shell. Render the empty-state Overview when no projects exist.
- Wire `ProjectSwitcher` into the header.
- Default `activeView = 'overview'`.

## Out of scope

- Recent Activity feed (deferred — revisit when multi-user or richer per-project history exists).
- Renaming projects from the switcher dropdown (only inline-edit on the title h1 in v1).
- Project deletion from the switcher (defer to a settings surface).
- Visual treatments / theming beyond what already exists in App.css for project-home — those styles can be repurposed but the design doesn't prescribe them.

## Verification (manual)

1. Sign in with zero projects → Overview empty state with Create form. Create a project → lands on its Overview.
2. Sign in with 1+ projects → Overview for the most-recent project. Switcher in header lists projects.
3. Switch projects via dropdown → Overview re-renders for the new project; memo, stats, description update.
4. Edit Project memo on Overview → autosave fires, refresh page, memo persists.
5. Edit description inline → autosave fires, refresh, persists.
6. Click `+ New source` on Overview → existing upload flow runs; on completion, source appears in Organize and Progress card updates.
7. Modes other than Overview are disabled when no project loaded.
8. Report mode renders the project memo when one exists, no project-memo section when blank.
