// Default data and helpers needed by both App.tsx and persistence/shape.ts.
// Extracted here to avoid circular imports when shape.ts is wired into App.tsx.

import type { Attribute, AttributeValue, Case, Code, Excerpt, Memo, ProjectData, SavedQuery, Source } from './types'

export const sampleTranscript = `Interviewer: Can you tell me what made the application process difficult?

Participant: It was not just one thing. The form asked for documents I did not have anymore, and every office told me to call someone else. After a while it felt like the system was testing whether I would give up.

Interviewer: What helped you keep going?

Participant: The campus advisor. She explained the steps in plain language and wrote down what to bring next time. That made me feel like I was not doing something wrong.

Interviewer: Did the process affect how you thought about the university?

Participant: Yes. I wanted to trust it, but the process made the university feel far away from people like me. Once I met someone who listened, it changed. But it should not depend on finding one helpful person.`

export const initialAttributes: Attribute[] = [
  { id: 'role', name: 'Role', valueType: 'text' },
  { id: 'cohort', name: 'Cohort', valueType: 'text' },
]

export const initialAttributeValues: AttributeValue[] = []

export const initialSavedQueries: SavedQuery[] = []

const initialCodes: Code[] = [
  {
    id: 'access',
    name: 'Access barriers',
    color: '#ea6f5a',
    description: 'Moments where people describe friction, cost, or gatekeeping.',
  },
  {
    id: 'trust',
    name: 'Trust and safety',
    color: '#3f8f7b',
    description: 'Signals of comfort, credibility, fear, or institutional trust.',
  },
  {
    id: 'identity',
    name: 'Identity work',
    color: '#7c6ee6',
    description: 'How participants explain who they are or how others see them.',
  },
]

const followUpTranscript = `Interviewer: What would have made the process feel more welcoming?

Participant: A checklist would have helped, but not a generic one. I needed to know what applied to my situation. The hard part was not knowing which rule mattered.

Interviewer: Did anyone explain the rules clearly?

Participant: Eventually, yes. Another student told me which office had the real answer. That made me trust students more than the official instructions.`

const initialSources: Source[] = [
  {
    id: 'interview-03',
    title: 'Interview 03',
    kind: 'Transcript',
    folder: 'Internals',
    content: sampleTranscript,
  },
  {
    id: 'interview-07',
    title: 'Interview 07',
    kind: 'Transcript',
    folder: 'Internals',
    content: followUpTranscript,
  },
]

const initialCases: Case[] = []

const initialMemos: Memo[] = [
  {
    id: 'project-memo',
    title: 'Project memo',
    linkedType: 'project',
    body: 'The clearest early pattern is not simple dissatisfaction. Participants describe systems that feel illegible until a specific person translates them.',
  },
]

const initialExcerpts: Excerpt[] = [
  {
    id: 'excerpt-1',
    codeIds: ['access', 'trust'],
    sourceId: 'interview-03',
    sourceTitle: 'Interview 03',
    text: 'every office told me to call someone else. After a while it felt like the system was testing whether I would give up.',
    note: 'Strong quote for bureaucratic exhaustion.',
  },
  {
    id: 'excerpt-2',
    codeIds: ['trust', 'identity'],
    sourceId: 'interview-03',
    sourceTitle: 'Interview 03',
    text: 'Once I met someone who listened, it changed. But it should not depend on finding one helpful person.',
    note: 'Useful for the contrast between institution and individual care.',
  },
]

export const defaultProject: ProjectData = {
  activeSourceId: initialSources[0].id,
  sources: initialSources,
  cases: initialCases,
  attributes: initialAttributes,
  attributeValues: initialAttributeValues,
  savedQueries: initialSavedQueries,
  codes: initialCodes,
  memos: initialMemos,
  excerpts: initialExcerpts,
}

function slugId(value: string, fallback = 'item') {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback
}

export function casesFromSources(sources: Source[]): Case[] {
  const casesByName = new Map<string, Case>()
  sources.forEach((source) => {
    const name = source.caseName?.trim()
    if (!name) return

    const existingCase = casesByName.get(name) ?? {
      id: `case-${slugId(name)}`,
      name,
      description: '',
      sourceIds: [],
    }
    casesByName.set(name, { ...existingCase, sourceIds: Array.from(new Set([...existingCase.sourceIds, source.id])) })
  })

  return Array.from(casesByName.values())
}
