// Research templates: small, methodology-shaped starter codebooks a
// researcher can pick from when creating a project. v1 scope is
// codebook-only — codes (with hierarchy, colors, descriptions, optional
// code memos), no sources / cases / attributes / saved queries. The
// picker also surfaces the existing Sample-project (full demo) and
// Blank-project entries from the same registry so the picker is the
// single source of all five options.
//
// Spec: docs/superpowers/specs/2026-05-03-research-templates-design.md

import type { Code, Memo, ProjectData } from './types'
import { defaultProject } from './defaults'

export type ResearchTemplate = {
  id: string
  name: string
  tagline: string         // one-line subtitle on the picker card
  description: string     // longer paragraph (reserved for future expand affordance)
  buildSeed: () => ProjectData
}

// Code-color palette — matches buildNewCode in App.tsx so seeded codes
// look exactly like manually-created ones. Each template uses a slice
// so adjacent codes are visually distinct.
const PALETTE = [
  'oklch(0.62 0.10 195)', // teal
  'oklch(0.66 0.08 220)', // cyan
  'oklch(0.55 0.10 265)', // indigo
  'oklch(0.55 0.10 315)', // plum
  'oklch(0.62 0.10 20)',  // rose
  'oklch(0.72 0.09 75)',  // amber
  'oklch(0.62 0.08 150)', // moss
  'oklch(0.55 0.04 240)', // slate
] as const

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Builds a fully-formed Code from a parent + child shape. Ids are
// generated at template-pick time (via Date.now() in mkSeed below) so
// two new projects from the same template don't collide.
function code(name: string, color: string, description: string, parentId?: string): Code {
  return {
    id: '', // filled by mkSeed
    name,
    color,
    description,
    parentCodeId: parentId,
  }
}

type Outline = Array<{
  parent: string
  parentDescription: string
  parentMemo?: string
  children: Array<{ name: string; description: string }>
}>

// Materializes an outline into a ProjectData seed. Parent codes get
// palette colors in order; children inherit their parent's color so
// the codebook visually groups by theme. Code memos (when present)
// link to the parent's id via Memo.linkedType: 'code'.
function mkSeed(outline: Outline): ProjectData {
  const now = Date.now()
  const codes: Code[] = []
  const memos: Memo[] = []
  outline.forEach((group, parentIndex) => {
    const color = PALETTE[parentIndex % PALETTE.length]
    const parentId = `${slug(group.parent)}-${now + parentIndex * 100}`
    codes.push({
      ...code(group.parent, color, group.parentDescription),
      id: parentId,
    })
    if (group.parentMemo) {
      memos.push({
        id: `memo-${parentId}`,
        title: `${group.parent} memo`,
        body: group.parentMemo,
        linkedType: 'code',
        linkedId: parentId,
      })
    }
    group.children.forEach((child, childIndex) => {
      codes.push({
        ...code(child.name, color, child.description, parentId),
        id: `${slug(child.name)}-${now + parentIndex * 100 + childIndex + 1}`,
      })
    })
  })
  return {
    description: '',
    activeSourceId: '',
    sources: [],
    cases: [],
    attributes: [],
    attributeValues: [],
    savedQueries: [],
    codes,
    memos,
    excerpts: [],
  }
}

// ----- The methodology templates ---------------------------------

const inductive: Outline = [
  {
    parent: 'Identity',
    parentDescription: 'How the participant describes themselves and their position.',
    parentMemo: "Look for moments where the speaker names what they're not, who they belong to, or who they're separate from.",
    children: [
      { name: 'Self-positioning', description: 'How the speaker locates themselves in the situation.' },
      { name: 'Belonging', description: 'Moments of connection to a group, place, or role.' },
      { name: 'Distance from group', description: 'Moments of separation from a group, place, or role.' },
    ],
  },
  {
    parent: 'Tension',
    parentDescription: 'Friction the participant names — internal or external.',
    children: [
      { name: 'With institution', description: 'Friction with a system, organization, or authority.' },
      { name: 'With expectations', description: 'Friction with what was expected of the participant.' },
      { name: 'Internal conflict', description: 'Friction the participant frames as inside themselves.' },
    ],
  },
  {
    parent: 'Turning point',
    parentDescription: 'A moment the participant frames as before/after.',
    children: [
      { name: 'Decision', description: 'A choice the participant made that changed direction.' },
      { name: 'Realization', description: 'A new understanding that reframed prior events.' },
      { name: 'External event', description: 'Something that happened to the participant that shifted course.' },
    ],
  },
  {
    parent: 'Outcome',
    parentDescription: 'What came after — what changed.',
    children: [
      { name: 'Material change', description: 'Tangible change in circumstances, resources, or environment.' },
      { name: 'Relational change', description: 'Change in relationships or social standing.' },
      { name: 'Sense-making', description: 'How the participant interprets what happened, in retrospect.' },
    ],
  },
]

const deductive: Outline = [
  {
    parent: 'Research question 1',
    parentDescription: 'Rename this parent to your first research question.',
    parentMemo: 'Rename this parent to the actual text of your first research question before coding. The child codes scaffold direct evidence, counter-evidence, and edge cases — typical findings in a deductive analysis.',
    children: [
      { name: 'Direct evidence', description: 'Excerpts that directly support a finding for this question.' },
      { name: 'Counter-evidence', description: "Excerpts that contradict or complicate the question's assumed answer." },
      { name: 'Edge case', description: "Excerpts at the boundary — neither clear support nor clear contradiction." },
    ],
  },
  {
    parent: 'Research question 2',
    parentDescription: 'Rename this parent to your second research question.',
    parentMemo: 'Rename this parent before coding.',
    children: [
      { name: 'Direct evidence', description: 'Excerpts that directly support a finding for this question.' },
      { name: 'Counter-evidence', description: "Excerpts that contradict or complicate the question's assumed answer." },
      { name: 'Edge case', description: "Excerpts at the boundary." },
    ],
  },
  {
    parent: 'Research question 3',
    parentDescription: 'Rename this parent to your third research question.',
    parentMemo: 'Rename this parent before coding.',
    children: [
      { name: 'Direct evidence', description: 'Excerpts that directly support a finding for this question.' },
      { name: 'Counter-evidence', description: "Excerpts that contradict or complicate the question's assumed answer." },
      { name: 'Edge case', description: "Excerpts at the boundary." },
    ],
  },
  {
    parent: 'Method-relevant',
    parentDescription: 'Codes about how the participant relates to the study itself.',
    children: [
      { name: 'Methodological note', description: 'Researcher-noted observations about the interview process.' },
      { name: 'Reflexivity prompt', description: "Moments where the researcher's position shaped what was said." },
    ],
  },
]

const focusGroup: Outline = [
  {
    parent: 'Group dynamic',
    parentDescription: 'Patterns of interaction across participants.',
    parentMemo: 'Focus-group analysis attends to the interaction, not just the content. Code dynamic moments even when no individual makes a substantive claim.',
    children: [
      { name: 'Disagreement', description: 'A participant pushes back on or contradicts another.' },
      { name: 'Consensus building', description: 'Participants converge on a shared framing or conclusion.' },
      { name: 'Shifting position', description: 'A participant changes their stance during the conversation.' },
      { name: 'Silence', description: 'A noticeable pause, refusal, or absence of response.' },
    ],
  },
  {
    parent: 'Voice',
    parentDescription: 'Who speaks, who carries weight, who stays quiet.',
    children: [
      { name: 'Dominant speaker', description: 'A participant taking up disproportionate airtime.' },
      { name: 'Quiet participant', description: 'A participant speaking less than the group average.' },
      { name: 'Aligned subgroup', description: 'A subset of participants consistently agreeing with each other.' },
    ],
  },
  {
    parent: 'Content theme',
    parentDescription: 'Substantive themes — rename and add as the analysis develops.',
    children: [
      { name: 'Theme A', description: 'Placeholder — rename to a specific content theme.' },
      { name: 'Theme B', description: 'Placeholder — rename to a specific content theme.' },
      { name: 'Theme C', description: 'Placeholder — rename to a specific content theme.' },
    ],
  },
  {
    parent: 'Moderator effect',
    parentDescription: "How the moderator's presence shapes what's said.",
    children: [
      { name: 'Direct prompt', description: 'A moderator question that visibly steered the conversation.' },
      { name: 'Reframe', description: 'A moderator restating a participant in different terms.' },
      { name: 'Probe', description: 'A moderator follow-up that produced new content.' },
    ],
  },
]

const blankSeed: ProjectData = {
  description: '',
  activeSourceId: '',
  sources: [],
  cases: [],
  attributes: [],
  attributeValues: [],
  savedQueries: [],
  codes: [],
  memos: [],
  excerpts: [],
}

// ----- Registry --------------------------------------------------

export const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  {
    id: 'inductive-interview',
    name: 'Inductive interview study',
    tagline: 'Open coding, in-vivo first, structure emerges.',
    description: 'Top-level parents name kinds of moments rather than predetermined themes. Best for first-cycle coding when you want categories to surface from the data.',
    buildSeed: () => mkSeed(inductive),
  },
  {
    id: 'deductive-interview',
    name: 'Deductive interview study',
    tagline: 'Codebook organized around your research questions.',
    description: 'One parent per RQ (rename them), with direct-evidence / counter-evidence / edge-case scaffolding underneath. Best when you start with hypotheses you want to test against the transcripts.',
    buildSeed: () => mkSeed(deductive),
  },
  {
    id: 'focus-group',
    name: 'Focus group',
    tagline: 'Track group dynamics alongside content.',
    description: 'Disagreement, consensus building, shifting positions, dominant voices, silences — plus content-theme placeholders to populate as analysis develops.',
    buildSeed: () => mkSeed(focusGroup),
  },
  {
    id: 'sample',
    name: 'Sample project',
    tagline: 'Preloaded study to explore the app.',
    description: 'Two short interviews, a small code hierarchy, two cases with attributes, and two saved analyses. Useful for the first-time tour; replace with your own work for real research.',
    buildSeed: () => defaultProject,
  },
  {
    id: 'blank',
    name: 'Blank project',
    tagline: 'Empty canvas. Bring your own codebook.',
    description: 'No codes, no sources, no scaffolding. Pick this if you already know your codebook and want to set it up from scratch.',
    buildSeed: () => blankSeed,
  },
]

export function getTemplate(id: string): ResearchTemplate | undefined {
  return RESEARCH_TEMPLATES.find((t) => t.id === id)
}
