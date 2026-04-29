import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import {
  BookOpenText,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  FolderInput,
  FolderOpen,
  Highlighter,
  ListTree,
  LogIn,
  LogOut,
  MessageSquareText,
  Plus,
  Rows3,
  Scissors,
  Search,
  Tags,
  Trash2,
  UserPlus,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type WorkspaceView = 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
type SourceFolderFilter = 'All' | 'Archived' | string

type Code = {
  id: string
  name: string
  color: string
  description: string
}

type Source = {
  id: string
  title: string
  kind: 'Transcript' | 'Document'
  folder: string
  content: string
  archived?: boolean
  importedAt?: string
  caseName?: string
}

type Case = {
  id: string
  name: string
  description: string
  sourceIds: string[]
}

type Attribute = {
  id: string
  name: string
  valueType: 'text'
}

type AttributeValue = {
  caseId: string
  attributeId: string
  value: string
}

type Memo = {
  id: string
  title: string
  body: string
  linkedType: 'project' | 'source' | 'code'
  linkedId?: string
}

type Excerpt = {
  id: string
  codeIds: string[]
  sourceId: string
  sourceTitle: string
  text: string
  note: string
}

type ProjectData = {
  activeSourceId: string
  sources: Source[]
  cases: Case[]
  attributes: Attribute[]
  attributeValues: AttributeValue[]
  codes: Code[]
  memos: Memo[]
  excerpts: Excerpt[]
}

type ProjectRow = {
  id: string
  title: string
  updated_at?: string | null
  active_source_id?: string | null
  sources?: Source[] | null
  source_title?: string | null
  transcript?: string | null
  memo?: string | null
  codes: Code[]
  memos?: Memo[] | null
  excerpts: Excerpt[]
}

type NormalizedSourceRow = {
  id: string
  project_id: string
  title: string
  kind: Source['kind']
  folder_name: string
  content: string
  archived: boolean
  imported_at?: string | null
  case_name?: string | null
}

type NormalizedCodeRow = {
  id: string
  project_id: string
  name: string
  color: string
  description: string
  parent_code_id?: string | null
}

type NormalizedMemoRow = {
  id: string
  project_id: string
  title: string
  body: string
  linked_type: Memo['linkedType']
  linked_id?: string | null
}

type NormalizedSegmentRow = {
  id: string
  project_id: string
  source_id: string
  content: string
}

type NormalizedCodedReferenceRow = {
  project_id: string
  segment_id: string
  code_id: string
  source_id: string
  note: string
}

type NormalizedCaseRow = {
  id: string
  project_id: string
  name: string
  description: string
}

type NormalizedCaseSourceRow = {
  project_id: string
  case_id: string
  source_id: string
}

type NormalizedAttributeRow = {
  id: string
  project_id: string
  name: string
  value_type: Attribute['valueType']
}

type NormalizedAttributeValueRow = {
  project_id: string
  case_id: string
  attribute_id: string
  value: string
}

const sampleTranscript = `Interviewer: Can you tell me what made the application process difficult?

Participant: It was not just one thing. The form asked for documents I did not have anymore, and every office told me to call someone else. After a while it felt like the system was testing whether I would give up.

Interviewer: What helped you keep going?

Participant: The campus advisor. She explained the steps in plain language and wrote down what to bring next time. That made me feel like I was not doing something wrong.

Interviewer: Did the process affect how you thought about the university?

Participant: Yes. I wanted to trust it, but the process made the university feel far away from people like me. Once I met someone who listened, it changed. But it should not depend on finding one helpful person.`

const followUpTranscript = `Interviewer: What would have made the process feel more welcoming?

Participant: A checklist would have helped, but not a generic one. I needed to know what applied to my situation. The hard part was not knowing which rule mattered.

Interviewer: Did anyone explain the rules clearly?

Participant: Eventually, yes. Another student told me which office had the real answer. That made me trust students more than the official instructions.`

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

const initialAttributes: Attribute[] = [
  { id: 'role', name: 'Role', valueType: 'text' },
  { id: 'cohort', name: 'Cohort', valueType: 'text' },
]

const initialAttributeValues: AttributeValue[] = []

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

const defaultProject: ProjectData = {
  activeSourceId: initialSources[0].id,
  sources: initialSources,
  cases: initialCases,
  attributes: initialAttributes,
  attributeValues: initialAttributeValues,
  codes: initialCodes,
  memos: initialMemos,
  excerpts: initialExcerpts,
}

const modeItems: Array<{ id: WorkspaceView; label: string; description: string; status: 'ready' | 'partial' | 'soon' }> = [
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.', status: 'ready' },
  { id: 'code', label: 'Code', description: 'Close-read sources and code selected passages.', status: 'ready' },
  { id: 'refine', label: 'Refine', description: 'Clean the codebook and review code references.', status: 'partial' },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'partial' },
  { id: 'analyze', label: 'Analyze', description: 'Run searches, matrices, and comparisons.', status: 'partial' },
  { id: 'report', label: 'Report', description: 'Export excerpts, memos, and codebooks.', status: 'partial' },
]

function slugId(value: string, fallback = 'item') {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback
}

function casesFromSources(sources: Source[]): Case[] {
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

function normalizeProject(project: ProjectRow): ProjectData {
  const fallbackSource: Source = {
    id: 'interview-03',
    title: project.source_title || 'Interview 03',
    kind: 'Transcript',
    folder: 'Internals',
    content: project.transcript || sampleTranscript,
  }
  const sources = project.sources?.length ? project.sources : [fallbackSource]
  const memos = project.memos?.length
    ? project.memos
    : [
        {
          id: 'project-memo',
          title: 'Project memo',
          linkedType: 'project' as const,
          body: project.memo || defaultProject.memos[0].body,
        },
      ]

  return {
    activeSourceId: project.active_source_id || sources[0].id,
    sources,
    cases: casesFromSources(sources),
    attributes: initialAttributes,
    attributeValues: initialAttributeValues,
    codes: project.codes?.length ? project.codes : defaultProject.codes,
    memos,
    excerpts: (project.excerpts ?? []).map((excerpt) => ({
      ...excerpt,
      sourceId: excerpt.sourceId || sources.find((source) => source.title === excerpt.sourceTitle)?.id || sources[0].id,
    })),
  }
}

function composeProjectFromNormalized(
  project: ProjectRow,
  sourceRows: NormalizedSourceRow[],
  codeRows: NormalizedCodeRow[],
  memoRows: NormalizedMemoRow[],
  segmentRows: NormalizedSegmentRow[],
  referenceRows: NormalizedCodedReferenceRow[],
  caseRows: NormalizedCaseRow[] = [],
  caseSourceRows: NormalizedCaseSourceRow[] = [],
  attributeRows: NormalizedAttributeRow[] = [],
  attributeValueRows: NormalizedAttributeValueRow[] = []
): ProjectData {
  const caseNameBySourceId = new Map<string, string>()
  const caseNameById = new Map(caseRows.map((caseRow) => [caseRow.id, caseRow.name]))
  caseSourceRows.forEach((caseSource) => {
    const caseName = caseNameById.get(caseSource.case_id)
    if (caseName) caseNameBySourceId.set(caseSource.source_id, caseName)
  })

  const sources = sourceRows.map<Source>((source) => ({
    id: source.id,
    title: source.title,
    kind: source.kind,
    folder: source.folder_name,
    content: source.content,
    archived: source.archived,
    importedAt: source.imported_at ?? undefined,
    caseName: caseNameBySourceId.get(source.id) ?? source.case_name ?? undefined,
  }))
  const caseSourceIdsByCaseId = caseSourceRows.reduce<Record<string, string[]>>((groups, caseSource) => {
    groups[caseSource.case_id] = [...(groups[caseSource.case_id] ?? []), caseSource.source_id]
    return groups
  }, {})
  const cases = caseRows.map<Case>((caseRow) => ({
    id: caseRow.id,
    name: caseRow.name,
    description: caseRow.description,
    sourceIds: caseSourceIdsByCaseId[caseRow.id] ?? [],
  }))
  const attributes = attributeRows.map<Attribute>((attribute) => ({
    id: attribute.id,
    name: attribute.name,
    valueType: attribute.value_type,
  }))
  const attributeValues = attributeValueRows.map<AttributeValue>((attributeValue) => ({
    caseId: attributeValue.case_id,
    attributeId: attributeValue.attribute_id,
    value: attributeValue.value,
  }))
  const codes = codeRows.map<Code>((code) => ({
    id: code.id,
    name: code.name,
    color: code.color,
    description: code.description,
  }))
  const memos = memoRows.map<Memo>((memo) => ({
    id: memo.id,
    title: memo.title,
    body: memo.body,
    linkedType: memo.linked_type,
    linkedId: memo.linked_id ?? undefined,
  }))
  const referencesBySegment = referenceRows.reduce<Record<string, NormalizedCodedReferenceRow[]>>((groups, reference) => {
    groups[reference.segment_id] = [...(groups[reference.segment_id] ?? []), reference]
    return groups
  }, {})
  const sourceTitleById = new Map(sources.map((source) => [source.id, source.title]))
  const excerpts = segmentRows.flatMap<Excerpt>((segment) => {
    const segmentReferences = referencesBySegment[segment.id] ?? []
    if (!segmentReferences.length) return []

    return [
      {
        id: segment.id,
        sourceId: segment.source_id,
        sourceTitle: sourceTitleById.get(segment.source_id) ?? 'Unknown source',
        text: segment.content,
        note: segmentReferences[0]?.note ?? '',
        codeIds: segmentReferences.map((reference) => reference.code_id),
      },
    ]
  })

  return {
    activeSourceId: project.active_source_id || sources[0]?.id || defaultProject.activeSourceId,
    sources: sources.length ? sources : normalizeProject(project).sources,
    cases: cases.length ? cases : casesFromSources(sources),
    attributes: attributes.length ? attributes : initialAttributes,
    attributeValues,
    codes: codes.length ? codes : normalizeProject(project).codes,
    memos: memos.length ? memos : normalizeProject(project).memos,
    excerpts,
  }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function postgrestInList(values: string[]) {
  return `(${values.map((value) => value.replaceAll(',', '')).join(',')})`
}

async function readSourceFile(file: File): Promise<Pick<Source, 'content' | 'kind'>> {
  if (file.name.toLowerCase().endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser')
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return { content: result.value.trim(), kind: 'Transcript' }
  }

  return {
    content: await file.text(),
    kind: file.name.toLowerCase().endsWith('.csv') ? 'Document' : 'Transcript',
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authStatus, setAuthStatus] = useState('Sign in to sync your research workspace.')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState('Student Access Study')
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([])
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [activeView, setActiveView] = useState<WorkspaceView>('organize')
  const [sourceFolderFilter, setSourceFolderFilter] = useState<SourceFolderFilter>('All')
  const [newFolderName, setNewFolderName] = useState('')
  const [activeSourceId, setActiveSourceId] = useState(defaultProject.activeSourceId)
  const [activeCodeId, setActiveCodeId] = useState(initialCodes[0].id)
  const [activeMemoId, setActiveMemoId] = useState(initialMemos[0].id)
  const [sources, setSources] = useState(defaultProject.sources)
  const [cases, setCases] = useState(defaultProject.cases)
  const [attributes, setAttributes] = useState(defaultProject.attributes)
  const [attributeValues, setAttributeValues] = useState(defaultProject.attributeValues)
  const [codes, setCodes] = useState(defaultProject.codes)
  const [memos, setMemos] = useState(defaultProject.memos)
  const [excerpts, setExcerpts] = useState(defaultProject.excerpts)
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([initialCodes[0].id])
  const [newCodeName, setNewCodeName] = useState('')
  const [newAttributeName, setNewAttributeName] = useState('')
  const [mergeTargetCodeId, setMergeTargetCodeId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [queryText, setQueryText] = useState('')
  const [queryCodeId, setQueryCodeId] = useState('')
  const [queryCaseId, setQueryCaseId] = useState('')
  const [queryAttributeId, setQueryAttributeId] = useState('')
  const [queryAttributeValue, setQueryAttributeValue] = useState('')
  const [selectionHint, setSelectionHint] = useState('Select text in the source, then click Code selection.')
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  const hasLoadedRemoteProject = useRef(false)

  const activeSource = sources.find((source) => source.id === activeSourceId) ?? sources[0] ?? defaultProject.sources[0]
  const activeCode = codes.find((code) => code.id === activeCodeId) ?? codes[0]
  const activeMemo = memos.find((memo) => memo.id === activeMemoId) ?? memos[0]
  const selectedCodes = codes.filter((code) => selectedCodeIds.includes(code.id))
  const selectedCodeNames = selectedCodes.map((code) => code.name).join(', ')
  const sourceExcerpts = excerpts.filter((excerpt) => excerpt.sourceId === activeSource.id)
  const codeExcerpts = excerpts.filter((excerpt) => excerpt.codeIds.includes(activeCode.id))
  const activeSources = sources.filter((source) => !source.archived)
  const archivedSources = sources.filter((source) => source.archived)
  const sourceFolders = Array.from(new Set(['Internals', 'Externals', ...activeSources.map((source) => source.folder).filter(Boolean)]))
  const visibleSources =
    sourceFolderFilter === 'Archived'
      ? archivedSources
      : sourceFolderFilter === 'All'
        ? activeSources
        : activeSources.filter((source) => source.folder === sourceFolderFilter)
  const activeSourceMemo = memos.find((memo) => memo.linkedType === 'source' && memo.linkedId === activeSource.id)
  const activeSourceWords = activeSource.content.trim() ? activeSource.content.trim().split(/\s+/).length : 0
  const projectMemo = memos.find((memo) => memo.linkedType === 'project') ?? activeMemo
  const contextualMemo =
    activeView === 'code' || activeView === 'organize'
      ? memos.find((memo) => memo.linkedType === 'source' && memo.linkedId === activeSource.id)
      : activeView === 'refine'
        ? memos.find((memo) => memo.linkedType === 'code' && memo.linkedId === activeCode.id)
        : projectMemo
  const railMemo = contextualMemo ?? projectMemo
  const railMemoTitle =
    activeView === 'code' || activeView === 'organize'
      ? `${activeSource.title} memo`
      : activeView === 'refine'
        ? `${activeCode.name} memo`
        : 'Project memo'
  const projectData = useMemo<ProjectData>(
    () => ({ activeSourceId, sources, cases, attributes, attributeValues, codes, memos, excerpts }),
    [activeSourceId, attributeValues, attributes, cases, codes, excerpts, memos, sources]
  )
  const caseGridTemplate = `minmax(170px, 1fr) minmax(160px, 1fr) ${attributes
    .map(() => 'minmax(120px, 0.75fr)')
    .join(' ')} minmax(160px, 1fr) 36px`
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources])
  const caseBySourceId = useMemo(() => {
    const map = new Map<string, Case>()
    cases.forEach((item) => item.sourceIds.forEach((sourceId) => map.set(sourceId, item)))
    return map
  }, [cases])
  const queryAttributeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          attributeValues
            .filter((attributeValue) => attributeValue.attributeId === queryAttributeId && attributeValue.value.trim())
            .map((attributeValue) => attributeValue.value.trim())
        )
      ),
    [attributeValues, queryAttributeId]
  )

  async function loadProjectData(project: ProjectRow) {
    try {
      const [sourceResult, codeResult, memoResult, segmentResult, referenceResult, caseResult, caseSourceResult, attributeResult, attributeValueResult] = await Promise.all([
        supabase.from('fieldnote_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_codes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_memos').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_source_segments').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_coded_references').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_cases').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_case_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_attributes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_attribute_values').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
      ])

      const normalizedError =
        sourceResult.error ??
        codeResult.error ??
        memoResult.error ??
        segmentResult.error ??
        referenceResult.error ??
        caseResult.error ??
        caseSourceResult.error ??
        attributeResult.error ??
        attributeValueResult.error
      if (normalizedError) throw normalizedError

      const normalizedSources = (sourceResult.data ?? []) as NormalizedSourceRow[]
      const normalizedCodes = (codeResult.data ?? []) as NormalizedCodeRow[]
      const normalizedMemos = (memoResult.data ?? []) as NormalizedMemoRow[]
      const normalizedSegments = (segmentResult.data ?? []) as NormalizedSegmentRow[]
      const normalizedReferences = (referenceResult.data ?? []) as NormalizedCodedReferenceRow[]
      const normalizedCases = (caseResult.data ?? []) as NormalizedCaseRow[]
      const normalizedCaseSources = (caseSourceResult.data ?? []) as NormalizedCaseSourceRow[]
      const normalizedAttributes = (attributeResult.data ?? []) as NormalizedAttributeRow[]
      const normalizedAttributeValues = (attributeValueResult.data ?? []) as NormalizedAttributeValueRow[]

      if (
        normalizedSources.length ||
        normalizedCodes.length ||
        normalizedMemos.length ||
        normalizedSegments.length ||
        normalizedReferences.length ||
        normalizedCases.length ||
        normalizedAttributes.length
      ) {
        return composeProjectFromNormalized(
          project,
          normalizedSources,
          normalizedCodes,
          normalizedMemos,
          normalizedSegments,
          normalizedReferences,
          normalizedCases,
          normalizedCaseSources,
          normalizedAttributes,
          normalizedAttributeValues
        )
      }
    } catch (error) {
      console.warn('Falling back to project JSON data.', error)
    }

    return normalizeProject(project)
  }

  async function saveNormalizedProject(nextProjectId: string, nextProjectData: ProjectData) {
    const folderNames = Array.from(new Set(nextProjectData.sources.map((source) => source.folder || 'Internals')))
    const folderRows = folderNames.map((folder) => ({
      id: folder.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      project_id: nextProjectId,
      name: folder,
      kind: 'source',
    }))
    const sourceRows = nextProjectData.sources.map((source) => ({
      id: source.id,
      project_id: nextProjectId,
      title: source.title,
      kind: source.kind,
      folder_name: source.folder || 'Internals',
      content: source.content,
      archived: Boolean(source.archived),
      imported_at: source.importedAt ?? null,
      case_name: source.caseName ?? null,
    }))
    const caseRows = nextProjectData.cases.map((item) => ({
      id: item.id,
      project_id: nextProjectId,
      name: item.name,
      description: item.description,
    }))
    const caseSourceRows = nextProjectData.cases.flatMap((item) =>
      item.sourceIds.map((sourceId) => ({
        project_id: nextProjectId,
        case_id: item.id,
        source_id: sourceId,
      }))
    )
    const attributeRows = nextProjectData.attributes.map((attribute) => ({
      id: attribute.id,
      project_id: nextProjectId,
      name: attribute.name,
      value_type: attribute.valueType,
    }))
    const attributeValueRows = nextProjectData.attributeValues
      .filter((attributeValue) => attributeValue.value.trim())
      .map((attributeValue) => ({
        project_id: nextProjectId,
        case_id: attributeValue.caseId,
        attribute_id: attributeValue.attributeId,
        value: attributeValue.value,
      }))
    const codeRows = nextProjectData.codes.map((code) => ({
      id: code.id,
      project_id: nextProjectId,
      name: code.name,
      color: code.color,
      description: code.description,
    }))
    const memoRows = nextProjectData.memos.map((memo) => ({
      id: memo.id,
      project_id: nextProjectId,
      title: memo.title,
      body: memo.body,
      linked_type: memo.linkedType,
      linked_id: memo.linkedId ?? null,
    }))
    const segmentRows = nextProjectData.excerpts.map((excerpt) => ({
      id: excerpt.id,
      project_id: nextProjectId,
      source_id: excerpt.sourceId,
      segment_type: 'text_range',
      content: excerpt.text,
    }))
    const referenceRows = nextProjectData.excerpts.flatMap((excerpt) =>
      excerpt.codeIds.map((codeId) => ({
        project_id: nextProjectId,
        segment_id: excerpt.id,
        code_id: codeId,
        source_id: excerpt.sourceId,
        note: excerpt.note,
      }))
    )

    const upserts = [
      folderRows.length ? supabase.from('fieldnote_folders').upsert(folderRows, { onConflict: 'project_id,id' }) : undefined,
      sourceRows.length ? supabase.from('fieldnote_sources').upsert(sourceRows, { onConflict: 'project_id,id' }) : undefined,
      caseRows.length ? supabase.from('fieldnote_cases').upsert(caseRows, { onConflict: 'project_id,id' }) : undefined,
      attributeRows.length ? supabase.from('fieldnote_attributes').upsert(attributeRows, { onConflict: 'project_id,id' }) : undefined,
      codeRows.length ? supabase.from('fieldnote_codes').upsert(codeRows, { onConflict: 'project_id,id' }) : undefined,
      memoRows.length ? supabase.from('fieldnote_memos').upsert(memoRows, { onConflict: 'project_id,id' }) : undefined,
      segmentRows.length ? supabase.from('fieldnote_source_segments').upsert(segmentRows, { onConflict: 'project_id,id' }) : undefined,
    ].filter(Boolean)

    const upsertResults = await Promise.all(upserts)
    const upsertError = upsertResults.find((result) => result?.error)?.error
    if (upsertError) throw upsertError

    const existingSourceIds = nextProjectData.sources.map((source) => source.id)
    const existingCaseIds = nextProjectData.cases.map((item) => item.id)
    const existingAttributeIds = nextProjectData.attributes.map((attribute) => attribute.id)
    const existingCodeIds = nextProjectData.codes.map((code) => code.id)
    const existingMemoIds = nextProjectData.memos.map((memo) => memo.id)
    const existingSegmentIds = nextProjectData.excerpts.map((excerpt) => excerpt.id)

    const { error: caseSourcesDeleteError } = await supabase.from('fieldnote_case_sources').delete().eq('project_id', nextProjectId)
    if (caseSourcesDeleteError) throw caseSourcesDeleteError
    if (caseSourceRows.length) {
      const { error: caseSourcesInsertError } = await supabase.from('fieldnote_case_sources').insert(caseSourceRows)
      if (caseSourcesInsertError) throw caseSourcesInsertError
    }

    const { error: attributeValuesDeleteError } = await supabase.from('fieldnote_attribute_values').delete().eq('project_id', nextProjectId)
    if (attributeValuesDeleteError) throw attributeValuesDeleteError
    if (attributeValueRows.length) {
      const { error: attributeValuesInsertError } = await supabase.from('fieldnote_attribute_values').insert(attributeValueRows)
      if (attributeValuesInsertError) throw attributeValuesInsertError
    }

    await Promise.all([
      existingSourceIds.length
        ? supabase.from('fieldnote_sources').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingSourceIds))
        : supabase.from('fieldnote_sources').delete().eq('project_id', nextProjectId),
      existingCaseIds.length
        ? supabase.from('fieldnote_cases').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingCaseIds))
        : supabase.from('fieldnote_cases').delete().eq('project_id', nextProjectId),
      existingAttributeIds.length
        ? supabase.from('fieldnote_attributes').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingAttributeIds))
        : supabase.from('fieldnote_attributes').delete().eq('project_id', nextProjectId),
      existingCodeIds.length
        ? supabase.from('fieldnote_codes').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingCodeIds))
        : supabase.from('fieldnote_codes').delete().eq('project_id', nextProjectId),
      existingMemoIds.length
        ? supabase.from('fieldnote_memos').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingMemoIds))
        : supabase.from('fieldnote_memos').delete().eq('project_id', nextProjectId),
      existingSegmentIds.length
        ? supabase.from('fieldnote_source_segments').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingSegmentIds))
        : supabase.from('fieldnote_source_segments').delete().eq('project_id', nextProjectId),
    ])

    const { error: referencesDeleteError } = await supabase.from('fieldnote_coded_references').delete().eq('project_id', nextProjectId)
    if (referencesDeleteError) throw referencesDeleteError
    if (referenceRows.length) {
      const { error: referencesInsertError } = await supabase.from('fieldnote_coded_references').insert(referenceRows)
      if (referencesInsertError) throw referencesInsertError
    }
  }

  async function applyProject(project: ProjectRow) {
    setSaveStatus('Opening project...')
    const nextProject = await loadProjectData(project)

    setProjectId(project.id)
    setProjectTitle(project.title || 'Untitled project')
    setActiveView('organize')
    setActiveSourceId(nextProject.activeSourceId)
    setSources(nextProject.sources)
    setCases(nextProject.cases)
    setAttributes(nextProject.attributes)
    setAttributeValues(nextProject.attributeValues)
    setCodes(nextProject.codes)
    setMemos(nextProject.memos)
    setExcerpts(nextProject.excerpts)
    setActiveCodeId(nextProject.codes[0]?.id ?? initialCodes[0].id)
    setActiveMemoId(nextProject.memos[0]?.id ?? initialMemos[0].id)
    setSelectedCodeIds(nextProject.codes[0]?.id ? [nextProject.codes[0].id] : [initialCodes[0].id])
    setSourceFolderFilter('All')
    hasLoadedRemoteProject.current = true
    setSaveStatus('Project open.')
  }

  async function loadProjectRows() {
    const { data, error } = await supabase
      .from('fieldnote_projects')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    setProjectRows((data ?? []) as ProjectRow[])
  }

  function returnToProjects() {
    hasLoadedRemoteProject.current = false
    setProjectId(null)
    setSaveStatus('Choose or create a project.')
    void loadProjectRows().catch((error: Error) => setSaveStatus(error.message))
  }

  async function createProject() {
    if (!session?.user || isCreatingProject) return

    const title = newProjectTitle.trim() || 'Untitled research project'
    setIsCreatingProject(true)
    setSaveStatus('Creating project...')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('Your sign-in expired. Sign out and sign back in, then create the project again.')

      const { data: createdProject, error } = await supabase
        .from('fieldnote_projects')
        .insert({
          owner_id: user.id,
          title,
          active_source_id: defaultProject.activeSourceId,
          source_title: defaultProject.sources[0].title,
          transcript: defaultProject.sources[0].content,
          memo: defaultProject.memos[0].body,
          sources: defaultProject.sources,
          codes: defaultProject.codes,
          memos: defaultProject.memos,
          excerpts: defaultProject.excerpts,
        })
        .select('*')
        .single()

      if (error) throw error
      const nextProject = createdProject as ProjectRow
      await saveNormalizedProject(nextProject.id, defaultProject)
      setProjectRows((current) => [nextProject, ...current])
      setNewProjectTitle('')
      await applyProject(nextProject)
    } catch (error) {
      setSaveStatus(errorMessage(error, 'Could not create project.'))
    } finally {
      setIsCreatingProject(false)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      hasLoadedRemoteProject.current = false
      queueMicrotask(() => {
        setProjectId(null)
        setProjectRows([])
        setSaveStatus('Sign in to sync.')
      })
      return
    }

    let isCurrent = true
    hasLoadedRemoteProject.current = false
    queueMicrotask(() => {
      setProjectId(null)
      setSaveStatus('Loading projects...')
    })

    async function loadProjectsForUser() {
      const { data, error } = await supabase
        .from('fieldnote_projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as ProjectRow[]
    }

    loadProjectsForUser()
      .then((projects) => {
        if (!isCurrent) return
        setProjectRows(projects)
        setSaveStatus('Choose or create a project.')
      })
      .catch((error: Error) => {
        if (!isCurrent) return
        setSaveStatus(errorMessage(error, 'Could not load projects.'))
      })

    return () => {
      isCurrent = false
    }
  }, [session])

  useEffect(() => {
    if (!session?.user || !projectId || !hasLoadedRemoteProject.current) return

    const currentProjectId = projectId
    setSaveStatus('Saving...')
    const timeout = window.setTimeout(() => {
      async function saveProject() {
        try {
          const { error } = await supabase
            .from('fieldnote_projects')
            .update({
              active_source_id: projectData.activeSourceId,
              title: projectTitle,
              source_title: activeSource.title,
              transcript: activeSource.content,
              memo: projectMemo.body,
              sources: projectData.sources,
              codes: projectData.codes,
              memos: projectData.memos,
              excerpts: projectData.excerpts,
            })
            .eq('id', currentProjectId)

          if (error) throw error
          try {
            await saveNormalizedProject(currentProjectId, projectData)
          } catch (normalizedError) {
            console.warn('Project JSON saved, but normalized save failed.', normalizedError)
          }
          setProjectRows((current) =>
            current.map((project) =>
              project.id === currentProjectId
                ? {
                    ...project,
                    title: projectTitle,
                    active_source_id: projectData.activeSourceId,
                    source_title: activeSource.title,
                    transcript: activeSource.content,
                    memo: projectMemo.body,
                    sources: projectData.sources,
                    codes: projectData.codes,
                    memos: projectData.memos,
                    excerpts: projectData.excerpts,
                  }
                : project
            )
          )
          setSaveStatus('Saved to Supabase.')
        } catch (error) {
          setSaveStatus(errorMessage(error, 'Save failed.'))
        }
      }

      void saveProject()
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [activeSource.content, activeSource.title, projectData, projectId, projectMemo.body, projectTitle, session])

  const visibleExcerpts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const list = activeView === 'refine' ? codeExcerpts : activeView === 'code' ? sourceExcerpts : excerpts
    if (!term) return list

    return list.filter((excerpt) => {
      const excerptCodes = codes.filter((item) => excerpt.codeIds.includes(item.id)).map((code) => code.name)
      return [excerpt.text, excerpt.note, excerpt.sourceTitle, ...excerptCodes].join(' ').toLowerCase().includes(term)
    })
  }, [activeView, codeExcerpts, codes, excerpts, searchTerm, sourceExcerpts])

  const analyzeResults = useMemo(() => {
    const term = queryText.trim().toLowerCase()

    return excerpts.filter((excerpt) => {
      const excerptCodes = codes.filter((item) => excerpt.codeIds.includes(item.id))
      const source = sourceById.get(excerpt.sourceId)
      const linkedCase = caseBySourceId.get(excerpt.sourceId)
      const haystack = [
        excerpt.text,
        excerpt.note,
        excerpt.sourceTitle,
        source?.folder ?? '',
        linkedCase?.name ?? '',
        linkedCase?.description ?? '',
        ...excerptCodes.map((code) => code.name),
        ...excerptCodes.map((code) => code.description),
      ]
        .join(' ')
        .toLowerCase()

      if (term && !haystack.includes(term)) return false
      if (queryCodeId && !excerpt.codeIds.includes(queryCodeId)) return false
      if (queryCaseId && linkedCase?.id !== queryCaseId) return false

      if (queryAttributeId) {
        if (!linkedCase) return false
        const value = attributeValues.find((item) => item.caseId === linkedCase.id && item.attributeId === queryAttributeId)?.value.trim() ?? ''
        if (!value) return false
        if (queryAttributeValue && value !== queryAttributeValue) return false
      }

      return true
    })
  }, [attributeValues, caseBySourceId, codes, excerpts, queryAttributeId, queryAttributeValue, queryCaseId, queryCodeId, queryText, sourceById])

  const analyzeMatchingCases = useMemo(() => {
    const matchingCases = analyzeResults.flatMap((excerpt) => {
      const linkedCase = caseBySourceId.get(excerpt.sourceId)
      return linkedCase ? [linkedCase] : []
    })
    return Array.from(new Map(matchingCases.map((item) => [item.id, item])).values())
  }, [analyzeResults, caseBySourceId])

  const activeQueryFilters = [
    queryText.trim() ? `Text contains "${queryText.trim()}"` : '',
    queryCodeId ? `Code: ${codes.find((code) => code.id === queryCodeId)?.name ?? 'Unknown code'}` : '',
    queryCaseId ? `Case: ${cases.find((item) => item.id === queryCaseId)?.name ?? 'Unknown case'}` : '',
    queryAttributeId
      ? `Attribute: ${attributes.find((attribute) => attribute.id === queryAttributeId)?.name ?? 'Unknown attribute'}${
          queryAttributeValue ? ` = ${queryAttributeValue}` : ''
        }`
      : '',
  ].filter(Boolean)

  const highlightedTranscript = useMemo(() => {
    let pieces: Array<{ text: string; codes?: Code[] }> = [{ text: activeSource.content }]

    sourceExcerpts.forEach((excerpt) => {
      const excerptCodes = codes.filter((item) => excerpt.codeIds.includes(item.id))
      if (!excerptCodes.length || !excerpt.text.trim()) return

      pieces = pieces.flatMap((piece) => {
        if (piece.codes) return [piece]

        const index = piece.text.indexOf(excerpt.text)
        if (index === -1) return [piece]

        return [
          { text: piece.text.slice(0, index) },
          { text: excerpt.text, codes: excerptCodes },
          { text: piece.text.slice(index + excerpt.text.length) },
        ].filter((item) => item.text)
      })
    })

    return pieces
  }, [activeSource.content, codes, sourceExcerpts])

  function addCode() {
    const name = newCodeName.trim()
    if (!name) return

    const addToActiveCodingSet = activeView === 'code'
    const palette = ['#d9892b', '#2f7ebc', '#9b5a9f', '#5c8f42', '#c45173']
    const code: Code = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name,
      color: palette[codes.length % palette.length],
      description: 'New research code. Add a short meaning once the pattern becomes clear.',
    }

    setCodes((current) => [...current, code])
    if (addToActiveCodingSet) setSelectedCodeIds((current) => [...current, code.id])
    setActiveCodeId(code.id)
    setSelectionHint(addToActiveCodingSet ? `Created "${name}" and added it to the active coding set.` : `Created "${name}" in the codebook.`)
    setNewCodeName('')
  }

  function updateCode(codeId: string, patch: Partial<Code>) {
    setCodes((current) => current.map((code) => (code.id === codeId ? { ...code, ...patch } : code)))
  }

  function deleteActiveCode() {
    const references = excerpts.filter((excerpt) => excerpt.codeIds.includes(activeCode.id)).length
    const shouldDelete = window.confirm(
      `Delete "${activeCode.name}"? It will be removed from ${references} coded reference${references === 1 ? '' : 's'}.`
    )
    if (!shouldDelete) return

    const remainingCodes = codes.filter((code) => code.id !== activeCode.id)
    if (!remainingCodes.length) {
      setSelectionHint('Keep at least one code in the codebook.')
      return
    }

    setCodes(remainingCodes)
    setExcerpts((current) =>
      current
        .map((excerpt) => ({ ...excerpt, codeIds: excerpt.codeIds.filter((codeId) => codeId !== activeCode.id) }))
        .filter((excerpt) => excerpt.codeIds.length)
    )
    setMemos((current) => current.filter((memo) => !(memo.linkedType === 'code' && memo.linkedId === activeCode.id)))
    setSelectedCodeIds((current) => {
      const next = current.filter((codeId) => codeId !== activeCode.id)
      return next.length ? next : [remainingCodes[0].id]
    })
    setActiveCodeId(remainingCodes[0].id)
  }

  function mergeActiveCodeIntoTarget() {
    const targetCode = codes.find((code) => code.id === mergeTargetCodeId)
    if (!activeCode || !targetCode || activeCode.id === targetCode.id) return

    const references = excerpts.filter((excerpt) => excerpt.codeIds.includes(activeCode.id)).length
    const shouldMerge = window.confirm(
      `Merge "${activeCode.name}" into "${targetCode.name}"? ${references} coded reference${references === 1 ? '' : 's'} will move to "${targetCode.name}", and "${activeCode.name}" will be removed from the codebook.`
    )
    if (!shouldMerge) return

    setExcerpts((current) =>
      current.map((excerpt) =>
        excerpt.codeIds.includes(activeCode.id)
          ? {
              ...excerpt,
              codeIds: Array.from(new Set(excerpt.codeIds.map((codeId) => (codeId === activeCode.id ? targetCode.id : codeId)))),
            }
          : excerpt
      )
    )
    setCodes((current) => current.filter((code) => code.id !== activeCode.id))
    setMemos((current) => current.filter((memo) => !(memo.linkedType === 'code' && memo.linkedId === activeCode.id)))
    setSelectedCodeIds((current) => Array.from(new Set(current.map((codeId) => (codeId === activeCode.id ? targetCode.id : codeId)))))
    setActiveCodeId(targetCode.id)
    setMergeTargetCodeId('')
    setSelectionHint(`Merged "${activeCode.name}" into "${targetCode.name}".`)
  }

  function toggleSelectedCode(codeId: string) {
    setSelectedCodeIds((current) => {
      if (current.includes(codeId)) return current.length === 1 ? current : current.filter((id) => id !== codeId)
      return [...current, codeId]
    })
  }

  function selectView(view: WorkspaceView) {
    setActiveView(view)
    if (view === 'refine') setActiveCodeId(activeCodeId || codes[0]?.id || '')
  }

  function selectSourceFolder(folder: SourceFolderFilter) {
    setSourceFolderFilter(folder)
    const firstVisibleSource =
      folder === 'Archived'
        ? archivedSources[0]
        : folder === 'All'
          ? activeSources[0]
          : activeSources.find((source) => source.folder === folder)
    if (firstVisibleSource) setActiveSourceId(firstVisibleSource.id)
  }

  function codeSelection() {
    const selectedText = window.getSelection()?.toString().trim()

    if (!selectedText || activeView !== 'code') {
      setSelectionHint(activeView === 'code' ? 'No text is selected yet. Drag across a phrase or paragraph first.' : 'Switch to Code mode before coding text.')
      return
    }

    let mergedExistingReference = false

    setExcerpts((current) => {
      const existingReference = current.find((excerpt) => excerpt.sourceId === activeSource.id && excerpt.text === selectedText)
      if (existingReference) {
        mergedExistingReference = true
        return current.map((excerpt) =>
          excerpt.id === existingReference.id
            ? {
                ...excerpt,
                codeIds: Array.from(new Set([...excerpt.codeIds, ...selectedCodes.map((code) => code.id)])),
              }
            : excerpt
        )
      }

      return [
        {
          id: `excerpt-${Date.now()}`,
          codeIds: selectedCodes.map((code) => code.id),
          sourceId: activeSource.id,
          sourceTitle: activeSource.title,
          text: selectedText,
          note: '',
        },
        ...current,
      ]
    })
    setSelectionHint(`${mergedExistingReference ? 'Added codes to existing reference' : 'Coded selection'} as ${selectedCodeNames}.`)
    window.getSelection()?.removeAllRanges()
  }

  function updateSource(sourceId: string, patch: Partial<Source>) {
    setSources((current) => current.map((source) => (source.id === sourceId ? { ...source, ...patch } : source)))
    if (patch.title) {
      setExcerpts((current) => current.map((excerpt) => (excerpt.sourceId === sourceId ? { ...excerpt, sourceTitle: patch.title ?? excerpt.sourceTitle } : excerpt)))
    }
  }

  function updateProjectTitle(title: string) {
    setProjectTitle(title)
  }

  function moveActiveSourceToNewFolder() {
    const folderName = newFolderName.trim()
    if (!folderName) return

    updateSource(activeSource.id, { folder: folderName, archived: false })
    setSourceFolderFilter(folderName)
    setNewFolderName('')
  }

  function createCaseFromSource() {
    const caseName = activeSource.caseName?.trim() || activeSource.title
    const existingCase = cases.find((item) => item.name.toLowerCase() === caseName.toLowerCase())

    if (existingCase) {
      setCases((current) =>
        current.map((item) =>
          item.id === existingCase.id ? { ...item, sourceIds: Array.from(new Set([...item.sourceIds, activeSource.id])) } : item
        )
      )
      updateSource(activeSource.id, { caseName: existingCase.name })
      return
    }

    const newCase: Case = {
      id: `case-${Date.now()}`,
      name: caseName,
      description: '',
      sourceIds: [activeSource.id],
    }
    setCases((current) => [...current, newCase])
    updateSource(activeSource.id, { caseName: newCase.name })
  }

  function createCasesFromSources() {
    const nextCasesByName = new Map(cases.map((item) => [item.name.toLowerCase(), item]))
    sources.forEach((source) => {
      const caseName = source.caseName?.trim() || source.title
      const key = caseName.toLowerCase()
      const existingCase = nextCasesByName.get(key) ?? {
        id: `case-${slugId(caseName)}-${Date.now()}`,
        name: caseName,
        description: '',
        sourceIds: [],
      }
      nextCasesByName.set(key, { ...existingCase, sourceIds: Array.from(new Set([...existingCase.sourceIds, source.id])) })
    })

    const nextCases = Array.from(nextCasesByName.values())
    setCases(nextCases)
    setSources((current) =>
      current.map((source) => {
        const linkedCase = nextCases.find((item) => item.sourceIds.includes(source.id))
        return linkedCase ? { ...source, caseName: linkedCase.name } : source
      })
    )
  }

  function assignSourceToCase(sourceId: string, caseId: string) {
    const nextCase = cases.find((item) => item.id === caseId)
    setCases((current) =>
      current.map((item) => ({
        ...item,
        sourceIds: caseId && item.id === caseId ? Array.from(new Set([...item.sourceIds, sourceId])) : item.sourceIds.filter((id) => id !== sourceId),
      }))
    )
    updateSource(sourceId, { caseName: nextCase?.name ?? '' })
  }

  function updateCase(caseId: string, patch: Partial<Case>) {
    setCases((current) =>
      current.map((item) => {
        if (item.id !== caseId) return item
        const nextCase = { ...item, ...patch }
        if (patch.name) {
          setSources((sourceList) =>
            sourceList.map((source) => (nextCase.sourceIds.includes(source.id) ? { ...source, caseName: nextCase.name } : source))
          )
        }
        return nextCase
      })
    )
  }

  function deleteCase(caseId: string) {
    const removedCase = cases.find((item) => item.id === caseId)
    setCases((current) => current.filter((item) => item.id !== caseId))
    setAttributeValues((current) => current.filter((item) => item.caseId !== caseId))
    if (removedCase) {
      setSources((current) =>
        current.map((source) => (removedCase.sourceIds.includes(source.id) ? { ...source, caseName: '' } : source))
      )
    }
  }

  function addAttribute() {
    const name = newAttributeName.trim()
    if (!name) return

    const exists = attributes.some((attribute) => attribute.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      setNewAttributeName('')
      return
    }

    setAttributes((current) => [...current, { id: `attribute-${Date.now()}`, name, valueType: 'text' }])
    setNewAttributeName('')
  }

  function updateAttributeValue(caseId: string, attributeId: string, value: string) {
    setAttributeValues((current) => {
      const existingValue = current.find((item) => item.caseId === caseId && item.attributeId === attributeId)
      if (existingValue) {
        return current.map((item) => (item.caseId === caseId && item.attributeId === attributeId ? { ...item, value } : item))
      }

      return [...current, { caseId, attributeId, value }]
    })
  }

  function archiveActiveSource() {
    updateSource(activeSource.id, { archived: true })
    const nextSource = activeSources.find((source) => source.id !== activeSource.id) ?? sources.find((source) => source.id !== activeSource.id)
    if (nextSource) setActiveSourceId(nextSource.id)
  }

  function restoreActiveSource() {
    updateSource(activeSource.id, { archived: false })
    setSourceFolderFilter(activeSource.folder || 'All')
  }

  function deleteActiveSource() {
    const shouldDelete = window.confirm(`Delete "${activeSource.title}" and its linked excerpts and source memos? This cannot be undone.`)
    if (!shouldDelete) return

    setSources((current) => current.filter((source) => source.id !== activeSource.id))
    setExcerpts((current) => current.filter((excerpt) => excerpt.sourceId !== activeSource.id))
    setMemos((current) => current.filter((memo) => !(memo.linkedType === 'source' && memo.linkedId === activeSource.id)))
    const nextSource = sources.find((source) => source.id !== activeSource.id)
    if (nextSource) setActiveSourceId(nextSource.id)
  }

  function updateMemo(memoId: string, patch: Partial<Memo>) {
    setMemos((current) => current.map((memo) => (memo.id === memoId ? { ...memo, ...patch } : memo)))
  }

  function updateExcerptNote(id: string, note: string) {
    setExcerpts((current) => current.map((excerpt) => (excerpt.id === id ? { ...excerpt, note } : excerpt)))
  }

  function deleteExcerpt(id: string) {
    const excerpt = excerpts.find((item) => item.id === id)
    if (!excerpt) return

    const shouldDelete = window.confirm('Delete this coded reference? This removes the excerpt from all codes.')
    if (!shouldDelete) return

    setExcerpts((current) => current.filter((item) => item.id !== id))
  }

  function removeCodeFromExcerpt(excerptId: string, codeId: string) {
    const excerpt = excerpts.find((item) => item.id === excerptId)
    const code = codes.find((item) => item.id === codeId)
    if (!excerpt || !code) return

    const shouldRemove = window.confirm(
      excerpt.codeIds.length === 1
        ? `Remove "${code.name}"? This reference has no other codes, so the reference will be deleted.`
        : `Remove "${code.name}" from this reference?`
    )
    if (!shouldRemove) return

    setExcerpts((current) =>
      current
        .map((item) => (item.id === excerptId ? { ...item, codeIds: item.codeIds.filter((itemCodeId) => itemCodeId !== codeId) } : item))
        .filter((item) => item.codeIds.length)
    )
  }

  function splitExcerpt(excerptId: string) {
    const excerpt = excerpts.find((item) => item.id === excerptId)
    const selectedText = window.getSelection()?.toString().trim()
    if (!excerpt) return

    if (!selectedText) {
      setSelectionHint('Select part of the coded reference text first, then click Split.')
      return
    }

    const splitIndex = excerpt.text.indexOf(selectedText)
    if (splitIndex === -1) {
      setSelectionHint('The selected text must be inside the coded reference you are splitting.')
      return
    }

    const before = excerpt.text.slice(0, splitIndex).trim()
    const after = excerpt.text.slice(splitIndex + selectedText.length).trim()
    const remainingText = [before, after].filter(Boolean).join(' ')

    if (!remainingText) {
      setSelectionHint('Split needs a smaller selection, not the whole coded reference.')
      return
    }

    const splitReference: Excerpt = {
      ...excerpt,
      id: `excerpt-${Date.now()}`,
      text: selectedText,
      note: '',
    }

    setExcerpts((current) =>
      current.flatMap((item) => (item.id === excerpt.id ? [{ ...item, text: remainingText }, splitReference] : [item]))
    )
    window.getSelection()?.removeAllRanges()
    setSelectionHint('Split the selected text into a new coded reference.')
  }

  function updateRailMemo(body: string) {
    if (contextualMemo) {
      updateMemo(contextualMemo.id, { body })
      return
    }

    const linkedType: Memo['linkedType'] = activeView === 'code' || activeView === 'organize' ? 'source' : activeView === 'refine' ? 'code' : 'project'
    const memo: Memo = {
      id: `memo-${Date.now()}`,
      title: railMemoTitle,
      linkedType,
      linkedId: linkedType === 'source' ? activeSource.id : linkedType === 'code' ? activeCode.id : undefined,
      body,
    }
    setMemos((current) => [memo, ...current])
    setActiveMemoId(memo.id)
  }

  function importTranscript(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const targetFolder = sourceFolderFilter !== 'All' && sourceFolderFilter !== 'Archived' ? sourceFolderFilter : 'Internals'

    Promise.all(
      files.map(async (file, index) => {
        const sourceFile = await readSourceFile(file)
        return {
          id: `source-${Date.now()}-${index}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          kind: sourceFile.kind,
          folder: targetFolder,
          content: sourceFile.content || '[No readable text found in this file.]',
          importedAt: new Date().toISOString(),
        }
      })
    ).then((newSources) => {
      setSources((current) => [...newSources, ...current])
      setActiveSourceId(newSources[0].id)
      setSourceFolderFilter(targetFolder)
      setActiveView('organize')
      setSelectionHint(`${newSources.length} source${newSources.length === 1 ? '' : 's'} imported.`)
      event.target.value = ''
    })
  }

  async function submitAuth(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    if (!isSupabaseConfigured) {
      setAuthStatus('Supabase env variables are missing.')
      return
    }

    setAuthStatus(authMode === 'sign-in' ? 'Signing in...' : 'Creating account...')
    const credentials = { email, password }
    const { error } =
      authMode === 'sign-in' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials)

    if (error) {
      setAuthStatus(error.message)
      return
    }

    setAuthStatus(authMode === 'sign-in' ? 'Signed in.' : 'Account created. Check email confirmation settings if needed.')
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSaveStatus('Sign in to sync.')
  }

  function exportCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Source', 'Source folder', 'Case', 'Codes', 'Code descriptions', 'Excerpt', 'Note'],
      ...excerpts.map((excerpt) => {
        const source = sources.find((item) => item.id === excerpt.sourceId)
        const linkedCase = caseBySourceId.get(excerpt.sourceId)
        const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))
        return [
          projectTitle,
          excerpt.sourceTitle,
          source?.folder ?? '',
          linkedCase?.name ?? source?.caseName ?? '',
          excerptCodes.map((code) => code.name).join('; '),
          excerptCodes.map((code) => code.description).join('; '),
          excerpt.text,
          excerpt.note,
        ]
      }),
    ]

    downloadCsv(rows, 'fieldnote-coded-excerpts.csv')
  }

  function exportCaseSheetCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Case', 'Sources', 'Notes', ...attributes.map((attribute) => attribute.name)],
      ...cases.map((item) => {
        const linkedSources = sources.filter((source) => item.sourceIds.includes(source.id))
        return [
          projectTitle,
          item.name,
          linkedSources.map((source) => source.title).join('; '),
          item.description,
          ...attributes.map((attribute) => attributeValues.find((value) => value.caseId === item.id && value.attributeId === attribute.id)?.value ?? ''),
        ]
      }),
    ]

    downloadCsv(rows, 'fieldnote-case-sheet.csv')
  }

  function exportCaseExcerptCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Case', 'Source', 'Codes', 'Excerpt', 'Note', ...attributes.map((attribute) => attribute.name)],
      ...excerpts.map((excerpt) => {
        const linkedCase = caseBySourceId.get(excerpt.sourceId)
        const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))
        return [
          projectTitle,
          linkedCase?.name ?? '',
          excerpt.sourceTitle,
          excerptCodes.map((code) => code.name).join('; '),
          excerpt.text,
          excerpt.note,
          ...attributes.map((attribute) =>
            linkedCase ? attributeValues.find((value) => value.caseId === linkedCase.id && value.attributeId === attribute.id)?.value ?? '' : ''
          ),
        ]
      }),
    ]

    downloadCsv(rows, 'fieldnote-coded-excerpts-by-case.csv')
  }

  function exportAnalyzeCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Source', 'Case', 'Codes', 'Excerpt', 'Note', 'Active filters'],
      ...analyzeResults.map((excerpt) => {
        const linkedCase = caseBySourceId.get(excerpt.sourceId)
        const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))
        return [
          projectTitle,
          excerpt.sourceTitle,
          linkedCase?.name ?? '',
          excerptCodes.map((code) => code.name).join('; '),
          excerpt.text,
          excerpt.note,
          activeQueryFilters.join('; '),
        ]
      }),
    ]

    downloadCsv(rows, 'fieldnote-query-results.csv')
  }

  function exportCodebookCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Code', 'Description', 'References', 'Example excerpt'],
      ...codes.map((code) => {
        const references = excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id))
        return [projectTitle, code.name, code.description, String(references.length), references[0]?.text ?? '']
      }),
    ]

    downloadCsv(rows, 'fieldnote-codebook.csv')
  }

  function exportMemosCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Memo title', 'Linked type', 'Linked item', 'Memo body'],
      ...memos.map((memo) => {
        const linkedItem =
          memo.linkedType === 'source'
            ? sources.find((source) => source.id === memo.linkedId)?.title
            : memo.linkedType === 'code'
              ? codes.find((code) => code.id === memo.linkedId)?.name
              : projectTitle

        return [projectTitle, memo.title, memo.linkedType, linkedItem ?? '', memo.body]
      }),
    ]

    downloadCsv(rows, 'fieldnote-memos.csv')
  }

  function downloadCsv(rows: string[][], filename: string) {
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-block">
            <div className="brand-mark">F</div>
            <div>
              <p className="eyebrow">Qualitative workspace</p>
              <h1>Fieldnote</h1>
            </div>
          </div>

          <div className="auth-copy">
            <h2>{authMode === 'sign-in' ? 'Sign in' : 'Create account'}</h2>
            <p>Use an account so each researcher has their own synced project. Sharing can build on this next.</p>
          </div>

          <label className="auth-field">
            <span>Email</span>
            <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} />
          </label>

          <button className="auth-submit" type="button" onClick={submitAuth} disabled={!isSupabaseConfigured}>
            {authMode === 'sign-in' ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
            {authMode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>

          <button className="auth-switch" type="button" onClick={() => setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}>
            {authMode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>

          <p className="auth-status">{isSupabaseConfigured ? authStatus : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.'}</p>
        </section>
      </main>
    )
  }

  if (!projectId) {
    return (
      <main className="project-home-shell">
        <header className="project-home-header">
          <div className="brand-block">
            <div className="brand-mark">F</div>
            <div>
              <p className="eyebrow">Qualitative workspace</p>
              <h1>Fieldnote</h1>
            </div>
          </div>

          <div className="header-tools">
            <div className="sync-box">
              <Cloud size={16} aria-hidden="true" />
              <span>{saveStatus}</span>
            </div>
            <div className="user-box">
              <span>{session.user.email}</span>
              <button type="button" onClick={signOut}>
                <LogOut size={15} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="project-home">
          <div className="project-home-heading">
            <div>
              <p className="eyebrow">Project Home</p>
              <h2>Research projects</h2>
              <p>Choose a study, or start a separate workspace for another class, grant, dissertation, or paper.</p>
            </div>
            <div className="new-project-row">
              <input
                value={newProjectTitle}
                placeholder="Project title"
                aria-label="Project title"
                onChange={(event) => setNewProjectTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void createProject()
                }}
              />
              <button type="button" onClick={createProject} disabled={isCreatingProject}>
                <Plus size={18} aria-hidden="true" />
                Create
              </button>
            </div>
          </div>

          <section className="project-list-card">
            <div className="project-list-heading">
              <h2>Projects</h2>
              <button type="button" onClick={() => void loadProjectRows()}>
                Refresh
              </button>
            </div>

            {projectRows.length ? (
              <div className="project-list" role="table" aria-label="Research projects">
                <div className="project-row project-row-head" role="row">
                  <span>Project</span>
                  <span>Sources</span>
                  <span>Codes</span>
                  <span>References</span>
                  <span>Updated</span>
                </div>
                {projectRows.map((project) => (
                  <button key={project.id} className="project-row" type="button" role="row" onClick={() => void applyProject(project)}>
                    <span>
                      <strong>{project.title || 'Untitled project'}</strong>
                      <small>Open workspace</small>
                    </span>
                    <span>{(project.sources?.length ?? 0) || 1}</span>
                    <span>{(project.codes?.length ?? 0) || defaultProject.codes.length}</span>
                    <span>{(project.excerpts?.length ?? 0) || 0}</span>
                    <span>{project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '-'}</span>
                  </button>
                ))}
              </div>
            ) : (
              <article className="empty-project-state">
                <Database size={22} aria-hidden="true" />
                <strong>No projects yet</strong>
                <span>Create the first one here, then Fieldnote will take you into the workspace.</span>
              </article>
            )}
          </section>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">F</div>
          <div>
            <p className="eyebrow">Qualitative workspace</p>
            <h1>Fieldnote</h1>
          </div>
        </div>

        <div className="header-tools">
          <div className="sync-box">
            <Cloud size={16} aria-hidden="true" />
            <span>{saveStatus}</span>
          </div>
        </div>
      </header>

      <aside className="workspace-sidebar" aria-label="Workspace sidebar">
        <button className="project-switcher project-nav-link" type="button" onClick={returnToProjects} title="Back to project home">
          <FolderOpen size={16} aria-hidden="true" />
          {projectTitle}
        </button>

        <nav className="mode-switcher" aria-label="Research modes">
          {modeItems.map((mode) => (
            <button key={mode.id} className={activeView === mode.id ? 'active' : ''} type="button" title={mode.description} onClick={() => selectView(mode.id)}>
              <span>{mode.label}</span>
              <small className={`mode-badge ${mode.status}`}>{mode.status === 'ready' ? 'Now' : mode.status === 'partial' ? 'MVP' : 'Soon'}</small>
            </button>
          ))}
        </nav>

        {activeView === 'organize' && (
          <section className="folder-pane" aria-label="Source folders">
            <div className="pane-title">
              <ListTree size={16} aria-hidden="true" />
              <span>Source folders</span>
            </div>
              <label className="folder-row import-row">
                <FilePlus2 size={16} aria-hidden="true" />
                Import sources
                <input type="file" accept=".txt,.md,.csv,.docx" multiple onChange={importTranscript} />
              </label>
              <button className={sourceFolderFilter === 'All' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectSourceFolder('All')}>
                <FolderOpen size={16} aria-hidden="true" />
                All sources
                <span>{activeSources.length}</span>
              </button>
              {sourceFolders.map((folder) => (
                <button key={folder} className={sourceFolderFilter === folder ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectSourceFolder(folder)}>
                  <FolderInput size={16} aria-hidden="true" />
                  {folder}
                  <span>{activeSources.filter((source) => source.folder === folder).length}</span>
                </button>
              ))}
              <button className={sourceFolderFilter === 'Archived' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectSourceFolder('Archived')}>
                <FolderOpen size={16} aria-hidden="true" />
                Archived
                <span>{archivedSources.length}</span>
              </button>
              <div className="new-folder-row">
                <input
                  value={newFolderName}
                  placeholder="New folder"
                  aria-label="New folder name"
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') moveActiveSourceToNewFolder()
                  }}
                />
                <button className="icon-button" type="button" onClick={moveActiveSourceToNewFolder} aria-label="Move source to new folder">
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
          </section>
        )}

        <section className="list-view" aria-label="Objects">
          <ListView
            activeView={activeView}
            activeSourceId={activeSource.id}
            activeCodeId={activeCode.id}
            sources={activeSources}
            visibleSources={activeView === 'organize' ? visibleSources : sources}
            cases={cases}
            codes={codes}
            excerpts={excerpts}
            onSelectSource={(id) => {
              setActiveSourceId(id)
              if (activeView === 'organize' || activeView === 'classify') return
              setActiveView('code')
            }}
            onSelectCode={(id) => {
              setActiveCodeId(id)
              setActiveView('refine')
            }}
          />
        </section>

        <div className="sidebar-account">
          <div className="user-box">
            <span>{session.user.email}</span>
            <button type="button" onClick={signOut}>
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <section className="detail-view" id="sources">
        <header className="detail-toolbar">
          <div>
            <p className="eyebrow">Detail View</p>
            <DetailTitle
              activeView={activeView}
              activeSource={activeSource}
              activeCode={activeCode}
              projectTitle={projectTitle}
              onProjectTitleChange={updateProjectTitle}
              onSourceTitleChange={(title) => updateSource(activeSource.id, { title })}
              onCodeNameChange={(name) => setCodes((current) => current.map((code) => (code.id === activeCode.id ? { ...code, name } : code)))}
            />
          </div>

          {activeView !== 'analyze' && (
            <div className="search-box">
              <Search size={17} aria-hidden="true" />
              <input value={searchTerm} placeholder="Find coded work" aria-label="Search coded work" onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
          )}
        </header>

        {activeView === 'organize' && (
          <article className="detail-card organize-surface">
            <div className="source-register-heading">
              <div>
                <p className="detail-kicker">Source register</p>
                <h2>{sourceFolderFilter === 'All' ? 'All sources' : sourceFolderFilter}</h2>
              </div>
              <label className="secondary-button import-inline">
                <FilePlus2 size={17} aria-hidden="true" />
                Import
                <input type="file" accept=".txt,.md,.csv,.docx" multiple onChange={importTranscript} />
              </label>
            </div>
            <div className="source-table" role="table" aria-label="Project sources">
              <div className="source-row source-row-head" role="row">
                <span>Title</span>
                <small>Type</small>
                <small>Folder</small>
                <small>Case</small>
                <small>References</small>
                <small>Memo</small>
              </div>
              {visibleSources.map((source) => {
                const referenceCount = excerpts.filter((excerpt) => excerpt.sourceId === source.id).length
                const hasMemo = memos.some((memo) => memo.linkedType === 'source' && memo.linkedId === source.id && memo.body.trim())

                return (
                  <button key={source.id} className={source.id === activeSource.id ? 'source-row active' : 'source-row'} type="button" onClick={() => setActiveSourceId(source.id)}>
                    <span>{source.title}</span>
                    <small>{source.kind}</small>
                    <small>{source.folder}</small>
                    <small>{source.caseName || '-'}</small>
                    <small>{referenceCount}</small>
                    <small>{hasMemo ? 'Yes' : 'No'}</small>
                  </button>
                )
              })}
              {!visibleSources.length && (
                <article className="empty-list-state">
                  <FileText size={20} aria-hidden="true" />
                  <strong>No sources in this folder</strong>
                  <span>Import a text file or move an existing source here from the properties rail.</span>
                </article>
              )}
            </div>
          </article>
        )}

        {activeView === 'code' && (
          <article className="document-panel">
            <div className="document-actions">
              <div>
                <strong>{selectedCodeNames}</strong>
                <p>{selectionHint} Active codes can be combined.</p>
              </div>
              <button type="button" className="primary-button" onClick={codeSelection}>
                <Highlighter size={18} aria-hidden="true" />
                Code selection
              </button>
            </div>

            <div className="transcript" aria-label="Source text">
              {highlightedTranscript.map((piece, index) =>
                piece.codes ? (
                  <mark
                    key={`${piece.text}-${index}`}
                    className="multi-code-mark"
                    style={{
                      backgroundColor: `${piece.codes[0].color}28`,
                      borderColor: piece.codes[0].color,
                      boxShadow: piece.codes
                        .slice(1, 4)
                        .map((code, shadowIndex) => `inset 0 ${-2 - shadowIndex * 3}px 0 ${code.color}70`)
                        .join(', '),
                    }}
                    title={piece.codes.map((code) => code.name).join(', ')}
                  >
                    {piece.text}
                  </mark>
                ) : (
                  <span key={`${piece.text}-${index}`}>{piece.text}</span>
                )
              )}
            </div>
          </article>
        )}

        {activeView === 'refine' && (
          <article className="detail-card refine-surface">
            <div className="refine-header">
              <div>
                <p className="detail-kicker">Code definition</p>
                <h2>{activeCode.name}</h2>
              </div>
              <span className="reference-count">{codeExcerpts.length} references</span>
            </div>

            <div className="code-definition-grid">
              <label className="property-field">
                <span>Name</span>
                <input value={activeCode.name} onChange={(event) => updateCode(activeCode.id, { name: event.target.value })} />
              </label>
              <label className="property-field color-field">
                <span>Color</span>
                <input type="color" value={activeCode.color} onChange={(event) => updateCode(activeCode.id, { color: event.target.value })} />
              </label>
            </div>

            <label className="property-field">
              <span>Description</span>
              <textarea
                className="code-description"
                value={activeCode.description}
                aria-label="Code description"
                onChange={(event) => updateCode(activeCode.id, { description: event.target.value })}
              />
            </label>

            <div className="code-maintenance-row">
              <label className="property-field">
                <span>Merge into</span>
                <select value={mergeTargetCodeId} onChange={(event) => setMergeTargetCodeId(event.target.value)}>
                  <option value="">Choose another code</option>
                  {codes
                    .filter((code) => code.id !== activeCode.id)
                    .map((code) => (
                      <option key={code.id} value={code.id}>
                        {code.name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="secondary-button" type="button" disabled={!mergeTargetCodeId} onClick={mergeActiveCodeIntoTarget}>
                Merge code
              </button>
            </div>

            <div className="reference-toolbar">
              <p className="detail-kicker">References</p>
              <button className="danger-text-button" type="button" onClick={deleteActiveCode}>
                <Trash2 size={15} aria-hidden="true" />
                Delete code
              </button>
            </div>

            <ReferenceList excerpts={codeExcerpts} codes={codes} onNoteChange={updateExcerptNote} onDelete={deleteExcerpt} onRemoveCode={removeCodeFromExcerpt} onSplit={splitExcerpt} />
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Parent/child codes, hierarchy views, and deeper codebook cleanup tools.</span>
            </div>
          </article>
        )}

        {activeView === 'classify' && (
          <article className="detail-card classify-surface">
            <div className="source-register-heading">
              <div>
                <p className="detail-kicker">Participants and attributes</p>
                <h2>Case sheet</h2>
              </div>
              <span className="reference-count">{cases.length} cases</span>
            </div>

            <div className="classify-toolbar">
              <button className="secondary-button" type="button" onClick={createCasesFromSources}>
                <UserPlus size={16} aria-hidden="true" />
                Create cases from sources
              </button>
              <label className="inline-entry">
                <input value={newAttributeName} placeholder="New attribute" onChange={(event) => setNewAttributeName(event.target.value)} />
                <button className="secondary-button" type="button" onClick={addAttribute}>
                  <Plus size={16} aria-hidden="true" />
                  Add
                </button>
              </label>
            </div>

            <div className="case-assignment-table" role="table" aria-label="Source case assignments">
              <div className="case-assignment-row case-row-head" role="row">
                <span>Source</span>
                <span>Assigned case</span>
              </div>
              {sources.map((source) => (
                <div key={source.id} className={source.id === activeSource.id ? 'case-assignment-row active' : 'case-assignment-row'} role="row">
                  <button type="button" onClick={() => setActiveSourceId(source.id)}>
                    <strong>{source.title}</strong>
                    <small>{source.kind}</small>
                  </button>
                  <select
                    value={cases.find((item) => item.sourceIds.includes(source.id))?.id ?? ''}
                    aria-label={`Assigned case for ${source.title}`}
                    onFocus={() => setActiveSourceId(source.id)}
                    onChange={(event) => assignSourceToCase(source.id, event.target.value)}
                  >
                    <option value="">No case</option>
                    {cases.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="case-table" role="table" aria-label="Case attributes">
              <div className="case-row case-row-head" role="row" style={{ gridTemplateColumns: caseGridTemplate }}>
                <span>Case</span>
                <span>Sources</span>
                {attributes.map((attribute) => (
                  <span key={attribute.id}>{attribute.name}</span>
                ))}
                <span>Notes</span>
                <span />
              </div>
              {cases.map((item) => {
                const linkedSources = sources.filter((source) => item.sourceIds.includes(source.id))

                return (
                  <div key={item.id} className="case-row" role="row" style={{ gridTemplateColumns: caseGridTemplate }}>
                    <input value={item.name} aria-label="Case name" onChange={(event) => updateCase(item.id, { name: event.target.value })} />
                    <small>{linkedSources.map((source) => source.title).join(', ') || '-'}</small>
                    {attributes.map((attribute) => (
                      <input
                        key={attribute.id}
                        value={attributeValues.find((value) => value.caseId === item.id && value.attributeId === attribute.id)?.value ?? ''}
                        aria-label={`${attribute.name} for ${item.name}`}
                        onChange={(event) => updateAttributeValue(item.id, attribute.id, event.target.value)}
                      />
                    ))}
                    <input
                      value={item.description}
                      aria-label={`Notes for ${item.name}`}
                      placeholder="Optional note"
                      onChange={(event) => updateCase(item.id, { description: event.target.value })}
                    />
                    <button className="icon-button danger-icon" type="button" aria-label={`Delete ${item.name}`} onClick={() => deleteCase(item.id)}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
              {!cases.length && (
                <div className="empty-table-state">
                  <strong>No cases yet</strong>
                  <span>Create cases from sources, then fill in participant attributes here.</span>
                </div>
              )}
            </div>
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Attribute import, case groups, and spreadsheet-style filtering.</span>
            </div>
          </article>
        )}

        {activeView === 'analyze' && (
          <article className="detail-card analyze-surface">
            <div className="source-register-heading">
              <div>
                <p className="detail-kicker">Query builder</p>
                <h2>Coded excerpt query</h2>
              </div>
              <span className="reference-count">{analyzeResults.length} results</span>
            </div>

            <div className="query-builder">
              <label className="property-field">
                <span>Text</span>
                <input value={queryText} placeholder="Search excerpt text, notes, sources, cases" onChange={(event) => setQueryText(event.target.value)} />
              </label>
              <label className="property-field">
                <span>Code</span>
                <select value={queryCodeId} onChange={(event) => setQueryCodeId(event.target.value)}>
                  <option value="">Any code</option>
                  {codes.map((code) => (
                    <option key={code.id} value={code.id}>
                      {code.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="property-field">
                <span>Case</span>
                <select value={queryCaseId} onChange={(event) => setQueryCaseId(event.target.value)}>
                  <option value="">Any case</option>
                  {cases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="property-field">
                <span>Attribute</span>
                <select
                  value={queryAttributeId}
                  onChange={(event) => {
                    setQueryAttributeId(event.target.value)
                    setQueryAttributeValue('')
                  }}
                >
                  <option value="">Any attribute</option>
                  {attributes.map((attribute) => (
                    <option key={attribute.id} value={attribute.id}>
                      {attribute.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="property-field">
                <span>Value</span>
                <select value={queryAttributeValue} disabled={!queryAttributeId} onChange={(event) => setQueryAttributeValue(event.target.value)}>
                  <option value="">Any filled value</option>
                  {queryAttributeOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="secondary-button query-clear"
                type="button"
                onClick={() => {
                  setQueryText('')
                  setQueryCodeId('')
                  setQueryCaseId('')
                  setQueryAttributeId('')
                  setQueryAttributeValue('')
                }}
              >
                Clear filters
              </button>
            </div>

            <div className="query-results-table" role="table" aria-label="Analyze query results">
              <div className="query-result-row query-result-head" role="row">
                <span>Source</span>
                <span>Case</span>
                <span>Codes</span>
                <span>Excerpt</span>
                <span>Note</span>
              </div>
              {analyzeResults.map((excerpt) => {
                const linkedCase = caseBySourceId.get(excerpt.sourceId)
                const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))

                return (
                  <div key={excerpt.id} className="query-result-row" role="row">
                    <button type="button" onClick={() => setActiveSourceId(excerpt.sourceId)}>
                      {excerpt.sourceTitle}
                    </button>
                    <span>{linkedCase?.name ?? '-'}</span>
                    <span>{excerptCodes.map((code) => code.name).join(', ')}</span>
                    <p>{excerpt.text}</p>
                    <input value={excerpt.note} placeholder="Add note" onChange={(event) => updateExcerptNote(excerpt.id, event.target.value)} />
                  </div>
                )
              })}
              {!analyzeResults.length && (
                <div className="empty-table-state">
                  <strong>No matching excerpts</strong>
                  <span>Loosen the filters or add more coded references.</span>
                </div>
              )}
            </div>
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Matrix coding, co-occurrence, word frequency, and saved queries.</span>
            </div>
          </article>
        )}

        {activeView === 'report' && (
          <article className="detail-card report-surface">
            <p className="detail-kicker">Exports</p>
            <button className="report-card" type="button" onClick={exportCsv}>
              <Download size={20} aria-hidden="true" />
              <span>
                <strong>Coded excerpts CSV</strong>
                <small>Source, codes, excerpt text, and notes.</small>
              </span>
            </button>
            <button className="report-card" type="button" onClick={exportCodebookCsv}>
              <FileText size={20} aria-hidden="true" />
              <span>
                <strong>Codebook CSV</strong>
                <small>Code names, descriptions, counts, and example excerpts.</small>
              </span>
            </button>
            <button className="report-card" type="button" onClick={exportCaseSheetCsv}>
              <Database size={20} aria-hidden="true" />
              <span>
                <strong>Case sheet CSV</strong>
                <small>Cases, linked sources, notes, and participant attributes.</small>
              </span>
            </button>
            <button className="report-card" type="button" onClick={exportCaseExcerptCsv}>
              <Rows3 size={20} aria-hidden="true" />
              <span>
                <strong>Coded excerpts by case CSV</strong>
                <small>Each coded excerpt with its case and attribute values.</small>
              </span>
            </button>
            <button className="report-card" type="button" onClick={exportAnalyzeCsv}>
              <Search size={20} aria-hidden="true" />
              <span>
                <strong>Current query CSV</strong>
                <small>Exports the active Analyze filters and matching results.</small>
              </span>
            </button>
            <button className="report-card" type="button" onClick={exportMemosCsv}>
              <MessageSquareText size={20} aria-hidden="true" />
              <span>
                <strong>Memos CSV</strong>
                <small>Project, source, and code memos with their linked items.</small>
              </span>
            </button>
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Report preview and formatted Word/PDF outputs.</span>
            </div>
          </article>
        )}
      </section>

      <aside className="properties-view">
        {activeView === 'organize' && (
          <section className="panel source-properties-panel">
            <div className="panel-heading">
              <Database size={18} aria-hidden="true" />
              <h2>Source Properties</h2>
            </div>

            <label className="property-field">
              <span>Title</span>
              <input value={activeSource.title} onChange={(event) => updateSource(activeSource.id, { title: event.target.value })} />
            </label>

            <label className="property-field">
              <span>Type</span>
              <select value={activeSource.kind} onChange={(event) => updateSource(activeSource.id, { kind: event.target.value as Source['kind'] })}>
                <option value="Transcript">Transcript</option>
                <option value="Document">Document</option>
              </select>
            </label>

            <label className="property-field">
              <span>Folder</span>
              <select value={activeSource.folder} onChange={(event) => updateSource(activeSource.id, { folder: event.target.value })}>
                {sourceFolders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </label>

            <label className="property-field">
              <span>Case</span>
              <select
                value={cases.find((item) => item.sourceIds.includes(activeSource.id))?.id ?? ''}
                aria-label={`Case for ${activeSource.title}`}
                onChange={(event) => assignSourceToCase(activeSource.id, event.target.value)}
              >
                <option value="">No case assigned</option>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <dl className="properties-list compact-properties">
              <div>
                <dt>Words</dt>
                <dd>{activeSourceWords}</dd>
              </div>
              <div>
                <dt>References</dt>
                <dd>{sourceExcerpts.length}</dd>
              </div>
              <div>
                <dt>Memo</dt>
                <dd>{activeSourceMemo?.body.trim() ? 'Started' : 'Blank'}</dd>
              </div>
              <div>
                <dt>Imported</dt>
                <dd>{activeSource.importedAt ? new Date(activeSource.importedAt).toLocaleDateString() : 'Sample'}</dd>
              </div>
            </dl>

            <button className="secondary-button" type="button" onClick={createCaseFromSource}>
              <Database size={17} aria-hidden="true" />
              Create case from source
            </button>
            <button className="secondary-button" type="button" onClick={() => setActiveView('code')}>
              <BookOpenText size={17} aria-hidden="true" />
              Open for coding
            </button>
            {activeSource.archived ? (
              <button className="secondary-button" type="button" onClick={restoreActiveSource}>
                <FolderInput size={17} aria-hidden="true" />
                Restore source
              </button>
            ) : (
              <button className="secondary-button" type="button" onClick={archiveActiveSource}>
                <FolderOpen size={17} aria-hidden="true" />
                Archive source
              </button>
            )}
            <button className="danger-button" type="button" onClick={deleteActiveSource}>
              <Trash2 size={17} aria-hidden="true" />
              Delete source
            </button>
          </section>
        )}

        {(activeView === 'code' || activeView === 'refine') && (
          <section className="panel" id="codes">
            <div className="panel-heading">
              <Tags size={18} aria-hidden="true" />
              <h2>{activeView === 'code' ? 'Active Codes' : 'Codebook'}</h2>
            </div>
            <div className="code-picker">
              {codes.map((code) => (
                <button
                  key={code.id}
                  className={(activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id) ? 'selected' : ''}
                  type="button"
                  aria-pressed={activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id}
                  onClick={() => {
                    if (activeView === 'code') {
                      toggleSelectedCode(code.id)
                      return
                    }
                    setActiveCodeId(code.id)
                  }}
                >
                  <span style={{ background: code.color }} />
                  {code.name}
                </button>
              ))}
            </div>

            <div className="new-code">
              <input
                value={newCodeName}
                placeholder="New code"
                aria-label="New code name"
                onChange={(event) => setNewCodeName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addCode()
                }}
              />
              <button className="icon-button" type="button" onClick={addCode} aria-label="Add code">
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {(activeView === 'organize' || activeView === 'code' || activeView === 'refine') && (
          <section className="panel" id="memo">
            <div className="panel-heading">
              <MessageSquareText size={18} aria-hidden="true" />
              <h2>{railMemoTitle}</h2>
            </div>
            <textarea value={contextualMemo?.body ?? ''} placeholder={`Add notes for ${railMemoTitle.toLowerCase()}`} onChange={(event) => updateRailMemo(event.target.value)} aria-label={railMemoTitle} />
            {railMemo.id !== projectMemo.id && <p className="memo-link-note">Linked to this {railMemo.linkedType}.</p>}
          </section>
        )}

        {activeView === 'analyze' && (
          <section className="panel">
            <div className="panel-heading">
              <Search size={18} aria-hidden="true" />
              <h2>Query Summary</h2>
            </div>
            <dl className="properties-list">
              <div>
                <dt>Results</dt>
                <dd>{analyzeResults.length}</dd>
              </div>
              <div>
                <dt>Cases</dt>
                <dd>{analyzeMatchingCases.length}</dd>
              </div>
              <div>
                <dt>Codes</dt>
                <dd>{new Set(analyzeResults.flatMap((excerpt) => excerpt.codeIds)).size}</dd>
              </div>
            </dl>
            <div className="query-filter-list">
              <strong>Active filters</strong>
              {activeQueryFilters.length ? (
                activeQueryFilters.map((filter) => <span key={filter}>{filter}</span>)
              ) : (
                <span>None. Showing all coded excerpts.</span>
              )}
            </div>
            <button className="secondary-button" type="button" onClick={exportAnalyzeCsv}>
              <Download size={17} aria-hidden="true" />
              Export query CSV
            </button>
          </section>
        )}

        {activeView === 'report' && (
          <section className="panel">
            <div className="panel-heading">
              <Database size={18} aria-hidden="true" />
              <h2>Export Summary</h2>
            </div>
            <dl className="properties-list">
              <div>
                <dt>Project</dt>
                <dd>{projectTitle}</dd>
              </div>
              <div>
                <dt>Sources</dt>
                <dd>{activeSources.length}</dd>
              </div>
              <div>
                <dt>Codes</dt>
                <dd>{codes.length}</dd>
              </div>
              <div>
                <dt>References</dt>
                <dd>{excerpts.length}</dd>
              </div>
              <div>
                <dt>Cases</dt>
                <dd>{cases.length}</dd>
              </div>
              <div>
                <dt>Attributes</dt>
                <dd>{attributes.length}</dd>
              </div>
            </dl>
          </section>
        )}

        {(activeView === 'code' || activeView === 'refine') && (
          <section className="panel">
          <div className="panel-heading">
            <Highlighter size={18} aria-hidden="true" />
            <h2>Coded excerpts</h2>
          </div>
          <ReferenceList excerpts={visibleExcerpts} codes={codes} onNoteChange={updateExcerptNote} onDelete={deleteExcerpt} onRemoveCode={removeCodeFromExcerpt} compact />
          </section>
        )}
      </aside>
    </main>
  )
}

function ListView({
  activeView,
  activeSourceId,
  activeCodeId,
  sources,
  visibleSources,
  cases,
  codes,
  excerpts,
  onSelectSource,
  onSelectCode,
}: {
  activeView: WorkspaceView
  activeSourceId: string
  activeCodeId: string
  sources: Source[]
  visibleSources: Source[]
  cases: Case[]
  codes: Code[]
  excerpts: Excerpt[]
  onSelectSource: (id: string) => void
  onSelectCode: (id: string) => void
}) {
  return (
    <>
      <div className="pane-title">
        <FileText size={16} aria-hidden="true" />
        <span>{activeView === 'organize' || activeView === 'code' ? 'Sources' : activeView === 'refine' ? 'Codebook' : activeView === 'classify' ? 'Classifications' : activeView === 'analyze' ? 'Queries' : 'Exports'}</span>
      </div>
      {(activeView === 'organize' || activeView === 'code') &&
        (activeView === 'organize' ? visibleSources : sources).map((source) => (
          <button className={source.id === activeSourceId ? 'list-item active' : 'list-item'} key={source.id} type="button" onClick={() => onSelectSource(source.id)}>
            <FileText size={17} aria-hidden="true" />
            <div>
              <strong>{source.title}</strong>
              <span>
                {source.kind} - {excerpts.filter((excerpt) => excerpt.sourceId === source.id).length} references
              </span>
            </div>
          </button>
        ))}
      {activeView === 'refine' &&
        codes.map((code) => (
          <button className={code.id === activeCodeId ? 'list-item active' : 'list-item'} key={code.id} type="button" onClick={() => onSelectCode(code.id)}>
            <span className="code-dot" style={{ background: code.color }} />
            <div>
              <strong>{code.name}</strong>
              <span>{excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id)).length} references</span>
            </div>
          </button>
        ))}
      {activeView === 'classify' && (
        cases.length ? cases.map((item) => {
          const firstSourceId = item.sourceIds[0] ?? activeSourceId
          return (
          <button className={item.sourceIds.includes(activeSourceId) ? 'list-item active' : 'list-item'} key={item.id} type="button" onClick={() => onSelectSource(firstSourceId)}>
            <Database size={17} aria-hidden="true" />
            <div>
              <strong>{item.name}</strong>
              <span>{item.sourceIds.length} source{item.sourceIds.length === 1 ? '' : 's'}</span>
            </div>
          </button>
          )
        }) : sources.map((source) => (
          <button className={source.id === activeSourceId ? 'list-item active' : 'list-item'} key={source.id} type="button" onClick={() => onSelectSource(source.id)}>
            <Database size={17} aria-hidden="true" />
            <div>
              <strong>{source.title}</strong>
              <span>No case yet</span>
            </div>
          </button>
        ))
      )}
      {activeView === 'analyze' && (
        <>
          <button className="list-item active" type="button">
            <Search size={17} aria-hidden="true" />
            <div>
              <strong>Text search</strong>
              <span>Search across coded excerpts</span>
            </div>
          </button>
          <button className="list-item" type="button">
            <Rows3 size={17} aria-hidden="true" />
            <div>
              <strong>Matrix coding</strong>
              <span>Not implemented yet</span>
            </div>
          </button>
        </>
      )}
      {activeView === 'report' && (
        <article className="empty-list-state">
          <Download size={20} aria-hidden="true" />
          <strong>Exports are in the Report panel</strong>
          <span>Use the center workspace to download coded excerpts or the codebook.</span>
        </article>
      )}
    </>
  )
}

function DetailTitle({
  activeView,
  activeSource,
  activeCode,
  projectTitle,
  onProjectTitleChange,
  onSourceTitleChange,
  onCodeNameChange,
}: {
  activeView: WorkspaceView
  activeSource: Source
  activeCode: Code
  projectTitle: string
  onProjectTitleChange: (title: string) => void
  onSourceTitleChange: (title: string) => void
  onCodeNameChange: (name: string) => void
}) {
  if (activeView === 'refine') {
    return <input className="title-input" value={activeCode.name} aria-label="Code name" onChange={(event) => onCodeNameChange(event.target.value)} />
  }
  if (activeView === 'classify') {
    return <h2 className="static-detail-title">Classify</h2>
  }
  if (activeView === 'analyze') {
    return <h2 className="static-detail-title">Analyze</h2>
  }
  if (activeView === 'report') {
    return <h2 className="static-detail-title">Report</h2>
  }
  if (activeView === 'organize') {
    return <input className="title-input" value={projectTitle} aria-label="Project title" onChange={(event) => onProjectTitleChange(event.target.value)} />
  }
  return <input className="title-input" value={activeSource.title} aria-label="Source title" onChange={(event) => onSourceTitleChange(event.target.value)} />
}

function ReferenceList({
  excerpts,
  codes,
  onNoteChange,
  onDelete,
  onRemoveCode,
  onSplit,
  compact = false,
}: {
  excerpts: Excerpt[]
  codes: Code[]
  onNoteChange: (id: string, note: string) => void
  onDelete: (id: string) => void
  onRemoveCode: (excerptId: string, codeId: string) => void
  onSplit?: (excerptId: string) => void
  compact?: boolean
}) {
  if (!excerpts.length) {
    return <p className="empty-reference-state">No coded references in this view yet.</p>
  }

  return (
    <div className={compact ? 'excerpt-list compact' : 'excerpt-list'}>
      {excerpts.map((excerpt) => {
        const excerptCodes = codes.filter((item) => excerpt.codeIds.includes(item.id))
        return (
          <article className="excerpt-card" key={excerpt.id}>
            <div className="excerpt-meta">
              <div className="code-stack">
                {excerptCodes.map((code) => (
                  <button key={code.id} type="button" style={{ borderColor: code.color }} onClick={() => onRemoveCode(excerpt.id, code.id)}>
                    <span aria-hidden="true" style={{ background: code.color }} />
                    {code.name}
                  </button>
                ))}
              </div>
              <small>{excerpt.sourceTitle}</small>
            </div>
            <p>{excerpt.text}</p>
            <div className="reference-actions">
              <input value={excerpt.note} placeholder="Add note" aria-label="Reference note" onChange={(event) => onNoteChange(excerpt.id, event.target.value)} />
              {onSplit && (
                <button className="neutral-reference-button" type="button" onClick={() => onSplit(excerpt.id)}>
                  <Scissors size={14} aria-hidden="true" />
                  Split
                </button>
              )}
              <button type="button" onClick={() => onDelete(excerpt.id)}>
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default App
