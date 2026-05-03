# Research templates — design

**Status:** approved 2026-05-03 (codebook-only scope, methodology-driven set, modal picker).

## Why

Today the Overview left rail has two stacked buttons: **Create blank project** and **Try a sample project**. The blank case asks researchers to define their codebook from a blank canvas; the sample case loads the (single) Stacey study, which is great for a tour but not a real starting point. The Dovetail-borrowed pattern is a small set of methodology-shaped starter codebooks a researcher can pick from at project creation. Reduces blank-page friction without paving over study-design choices that are genuinely the researcher's to make.

## Scope decisions made in brainstorm

- **Codebook-only.** A template is just a starter set of codes (with hierarchy, colors, descriptions, and optional code memos). No sources, no cases, no attributes, no saved queries — those are study-specific and getting them wrong is worse than not seeding them.
- **Three methodology-driven templates** + the existing two affordances = five picker options:
  1. Inductive interview study
  2. Deductive interview study
  3. Focus group
  4. Sample project (existing demo)
  5. Blank project
- **Modal picker** triggered from a single "New project…" button in the Overview sidebar. Grid of five cards inside.

## Data model

A `ResearchTemplate` is a small, pure value:

```ts
export type ResearchTemplate = {
  id: string                        // 'inductive-interview' | 'deductive-interview' | 'focus-group' | 'sample' | 'blank'
  name: string                      // user-facing card title
  tagline: string                   // one-line subtitle on the card
  description: string               // longer paragraph shown on hover or below the title
  codeCount: number                 // computed: codes.length, displayed on the card
  // The actual seed payload — run through createProjectFromSeed(title, ProjectData).
  // For 'blank' / 'sample' this points at the existing seeds (blankSeed / defaultProject)
  // so the template registry is the single source of all picker options.
  buildSeed: () => ProjectData
}
```

Templates live in their own module (`src/lib/researchTemplates.ts`) so the seeds can be authored as plain TypeScript constants, importable both at runtime (the picker) and at test time (snapshot tests assert codebook shape per template).

## Template content

Each methodology template ships ~10-15 codes under 1-2 levels of hierarchy. Codes carry colors from the existing `oklch(0.6X 0.0X HUE)` palette (the same one used by `buildNewCode`), a one-sentence `description`, and optionally a code-level memo (linked via the `Memo.linkedType: 'code'` shape).

### 1. Inductive interview study

Stance: open coding, in-vivo first, structure emerges. Top-level parents name *kinds of moments*, not predetermined themes.

- **Identity** — how the participant describes themselves
  - Self-positioning · Belonging · Distance from group
- **Tension** — friction the participant names
  - With institution · With expectations · Internal conflict
- **Turning point** — moments the participant frames as before/after
  - Decision · Realization · External event
- **Outcome** — what came after
  - Material change · Relational change · Sense-making

Code memos: short prompts like *"Look for moments where the speaker names what they're not."*

### 2. Deductive interview study

Stance: codebook organized around research questions; in-vivo emerges underneath. Top-level parents are placeholders the researcher renames to their actual RQs; child codes scaffold the typical sub-themes a deductive analysis spawns.

- **Research question 1** *(rename)* — primary RQ scaffold
  - Direct evidence · Counter-evidence · Edge case
- **Research question 2** *(rename)*
  - Direct evidence · Counter-evidence · Edge case
- **Research question 3** *(rename)*
  - Direct evidence · Counter-evidence · Edge case
- **Method-relevant** — codes about how the participant relates to the study itself
  - Methodological note · Reflexivity prompt

Code memos: a top-level memo on each RQ parent reminds the researcher to rename it before coding.

### 3. Focus group

Stance: track group dynamics in addition to content. Top-level parents capture interaction patterns researchers care about in focus-group analysis.

- **Group dynamic**
  - Disagreement · Consensus building · Shifting position · Silence
- **Voice**
  - Dominant speaker · Quiet participant · Aligned subgroup
- **Content theme** *(scaffold to populate)*
  - Theme A · Theme B · Theme C
- **Moderator effect**
  - Direct prompt · Reframe · Probe

Code memos: a memo on **Group dynamic** reminds the researcher that focus-group analysis attends to the *interaction*, not just the *content*.

The Sample project and Blank project entries reuse the existing seeds without modification.

## Picker UX

The Overview sidebar (`src/modes/overview/OverviewSidebar.tsx`) currently has an **Add a project** section with stacked input + two buttons. The new layout:

- Single primary button: **New project…** Replaces both existing buttons.
- Click opens **`<ResearchTemplatePicker />`** modal.

Modal structure:

```
┌─────────────────────────────────────────────────────────────┐
│  Start a new project                                  [×]  │
├─────────────────────────────────────────────────────────────┤
│  Project name  [_____________________________________]      │
│                                                             │
│  Pick a starting point                                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ T3 title │  │          │  │          │                   │
│  │ T6 line  │  │          │  │          │                   │
│  │          │  │          │  │          │                   │
│  │ T8 mono  │  │          │  │          │                   │
│  │ N codes  │  │          │  │          │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│  Inductive    Deductive     Focus group                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐                                 │
│  │          │  │          │                                 │
│  │ Sample   │  │ Blank    │                                 │
│  │ project  │  │ project  │                                 │
│  └──────────┘  └──────────┘                                 │
│                                                             │
│                              [Cancel]  [Create project →]   │
└─────────────────────────────────────────────────────────────┘
```

- Cards: 5-column on wide, 2- or 3-column on narrower viewports (CSS grid with `auto-fit, minmax(180px, 1fr)`).
- Each card: T3 title, T6 tagline, T8-mono code count line, T7 selected-card outline using `--action`.
- One card selected at a time (radio-style). The first card (Inductive) preselects on open.
- "Create project" disabled until the project name input is non-empty.
- Esc closes; click on backdrop closes (unless mid-create).

## Components

### Created

- `src/lib/researchTemplates.ts` — the template registry: an array of `ResearchTemplate` values, each with a `buildSeed()` returning a `ProjectData`. Pure module, no React.
- `src/lib/__tests__/researchTemplates.test.ts` — asserts code count, hierarchy depth, color uniqueness, and that every template's seed round-trips through `normalizeQueryDefinition` cleanly.
- `src/components/ResearchTemplatePicker.tsx` — the modal. Owns local state (selected template id, project name, busy flag). Calls a single `onCreate(template, name)` callback; doesn't touch persistence directly.
- `src/components/ResearchTemplatePicker.css` (or styles in `src/App.css` next to other modal styles) — picker grid + card states.

### Modified

- `src/modes/overview/OverviewSidebar.tsx` — drops the existing **Create blank** + **Try a sample** + **Import backup** subsection. Replaces with a single **New project…** button (and the import-backup affordance survives unchanged). The modal is rendered at `OverviewSidebar`'s level so it can close back into the sidebar; the picker's `onCreate` invokes existing `onCreateProject` / `onCreateSampleProject` semantics by calling a generalized prop.
- `src/App.tsx` — the existing `createSampleProject` / `createProject` functions get a sibling `createProjectFromTemplate(template: ResearchTemplate, title: string)` that calls `createProjectFromSeed(title, template.buildSeed())`. The existing two functions stay so any other call sites (drag-restore, import) keep working.
- The OverviewSidebar's `onCreateProject` / `onCreateSampleProject` props collapse into a single `onCreateFromTemplate(templateId, title) => void` callback. App.tsx threads this in.

## Data flow

1. User clicks **New project…** in Overview sidebar.
2. `<ResearchTemplatePicker />` mounts. Inductive Interview is preselected.
3. User types a project name and (optionally) picks a different template.
4. Click **Create project**. Picker calls `props.onCreate(templateId, name)`.
5. App.tsx looks up the template by id from the registry, calls `createProjectFromTemplate(template, name)`, which calls `createProjectFromSeed(name, template.buildSeed())`.
6. Picker closes; the new project becomes the active project as it does today.

## Error handling

- Empty project name: button disabled.
- Network error during create: surfaced via the same `setSaveStatus` channel `createProjectFromSeed` already uses; picker stays open with an error message; user can retry without re-typing.
- User clicks Cancel mid-create: ignored (busy flag prevents closing).

## Testing

- `researchTemplates.test.ts` — every registered template:
  - has `id`, `name`, `tagline`, `description` strings.
  - `buildSeed()` returns a `ProjectData` with `>= 5 codes` (excluding blank).
  - All code colors are unique within the template.
  - Code hierarchy depth `<= 2` (no grandchildren).
  - Every parent code's children sort alphabetically.
  - Code memos (when present) reference real codes in the same template.
- Manual smoke test:
  - Open Overview, click **New project…**, see the modal with 5 cards.
  - Type a name, pick "Focus group", click Create. New project opens with the Focus group codebook.
  - Open Refine: see the codebook tree populated.
  - Open Code: see the source list empty (no sample sources).

## Out of scope

- **B and C scope** from the brainstorm (cases/attributes scaffolding, full sample data per template). Codebook-only is the v1 commitment.
- **User-saved templates** (researcher exports their codebook as a custom template). Possible follow-up; not in v1.
- **Template editing UI.** Researchers can edit any seeded code after creation via Refine; we don't ship a template-author surface.
- **Localization.** All template content ships in English.
- **Per-template descriptions on card hover** beyond the tagline. The longer `description` field is reserved for a future expand affordance.

## Notes

- The existing **Try a sample project** entry in `OverviewSidebar` becomes the "Sample project" card inside the modal. Discovery is preserved; no functionality lost.
- The existing **Import backup** affordance stays in `OverviewSidebar` as-is — it's a different mental model (restore from file vs. start new).
- Template seeds use the same code-id format as `buildNewCode` (`name-slug-${Date.now()}`) but assigned at template-pick time, not at module load, so two new projects from the same template don't collide on code ids.
