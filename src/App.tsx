import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, MouseEvent } from 'react'
import {
  BarChart3,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  FolderInput,
  FolderOpen,
  Folders,
  Grid3x3,
  Highlighter,
  ListTree,
  LogOut,
  MessageSquareText,
  Plus,
  Rows3,
  Scissors,
  Search,
  Settings,
  Tags,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  DEFAULT_ANALYZE_VIEW,
  serialize as serializeAnalyzeView,
  type AnalyzeViewState,
} from './analyze/analyzeViewState'
import { WordFreqView, type WordFreqRow } from './analyze/WordFreqView'
import { CooccurrenceView, type CooccurPair } from './analyze/CooccurrenceView'
import { MatrixView, type MatrixCellInput } from './analyze/MatrixView'
import { CrosstabsView } from './analyze/CrosstabsView'
import { buildCrosstab, crosstabCsvRows, type CrosstabResult } from './analyze/crosstabs'
import { excerptMatchesAttributeFilters } from './analyze/excerptFilters'
import {
  normalizeQueryDefinition,
  type AttributeFilter,
  type QueryDefinition,
} from './analyze/queryDefinition'
import { Landing } from './Landing'
import './App.css'

type WorkspaceView = 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
type SourceFolderFilter = 'All' | 'Archived' | string
type AnalyzePanel = 'query' | 'matrix' | 'frequency' | 'cooccurrence' | 'crosstab'
type MatrixColumnMode = 'case' | 'attribute'

type Code = {
  id: string
  name: string
  color: string
  description: string
  parentCodeId?: string
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



type SavedQuery = {
  id: string
  name: string
  queryType: 'coded_excerpt'
  definition: QueryDefinition
}

type MatrixColumn = {
  id: string
  label: string
  caseIds: string[]
}

type WordFrequencyRow = {
  word: string
  count: number
  excerptCount: number
}

type CoOccurrenceRow = {
  key: string
  codes: Code[]
  count: number
  excerpts: Excerpt[]
}

type QuickCodeMenu = {
  text: string
  x: number
  y: number
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
  savedQueries: SavedQuery[]
  codes: Code[]
  memos: Memo[]
  excerpts: Excerpt[]
}

type LineNumberingMode = 'paragraph' | 'fixed-width'

const DEFAULT_LINE_NUMBERING_MODE: LineNumberingMode = 'fixed-width'
const DEFAULT_LINE_NUMBERING_WIDTH = 80
const LINE_NUMBERING_WIDTH_MIN = 40
const LINE_NUMBERING_WIDTH_MAX = 160

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
  line_numbering_mode?: LineNumberingMode | null
  line_numbering_width?: number | null
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

type NormalizedQueryRow = {
  id: string
  project_id: string
  name: string
  query_type: SavedQuery['queryType']
  definition: Partial<QueryDefinition> | null
}

function markBackground(codes: { color: string }[]): CSSProperties {
  if (codes.length === 0) return {}
  if (codes.length === 1) {
    return {
      background: `color-mix(in oklch, ${codes[0].color} 22%, transparent)`,
    }
  }
  const stops = codes
    .map((c, i) => {
      const a = (i * 100) / codes.length
      const b = ((i + 1) * 100) / codes.length
      const tint = `color-mix(in oklch, ${c.color} 22%, transparent)`
      return `${tint} ${a}% ${b}%`
    })
    .join(', ')
  return { background: `linear-gradient(${stops})` }
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

const initialSavedQueries: SavedQuery[] = []

const stopWords = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'been',
  'being',
  'could',
  'did',
  'does',
  'doing',
  'for',
  'from',
  'had',
  'has',
  'have',
  'her',
  'him',
  'his',
  'how',
  'into',
  'just',
  'like',
  'not',
  'now',
  'our',
  'out',
  'she',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'they',
  'this',
  'was',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
  'would',
  'you',
  'your',
])

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
  savedQueries: initialSavedQueries,
  codes: initialCodes,
  memos: initialMemos,
  excerpts: initialExcerpts,
}

const modeItems: Array<{
  id: WorkspaceView
  label: string
  description: string
  status: 'ready' | 'partial' | 'soon'
  icon: LucideIcon
}> = [
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.', status: 'ready',   icon: Folders },
  { id: 'code',     label: 'Code',     description: 'Close-read sources and code selected passages.', status: 'ready',   icon: Highlighter },
  { id: 'refine',   label: 'Refine',   description: 'Clean the codebook and review code references.', status: 'partial', icon: ListTree },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'partial', icon: Tags },
  { id: 'analyze',  label: 'Analyze',  description: 'Run searches, matrices, and comparisons.', status: 'partial', icon: BarChart3 },
  { id: 'report',   label: 'Report',   description: 'Export excerpts, memos, and codebooks.', status: 'partial', icon: FileText },
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



function buildCodeTree(codes: Code[]) {
  const byParent = new Map<string, Code[]>()
  codes.forEach((code) => {
    const parentId = code.parentCodeId && codes.some((item) => item.id === code.parentCodeId) ? code.parentCodeId : 'root'
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), code])
  })

  const ordered: Array<Code & { depth: number }> = []
  const visit = (parentId: string, depth: number, seen: Set<string>) => {
    const children = [...(byParent.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    children.forEach((code) => {
      if (seen.has(code.id)) return
      const nextSeen = new Set(seen).add(code.id)
      ordered.push({ ...code, depth })
      visit(code.id, depth + 1, nextSeen)
    })
  }

  visit('root', 0, new Set())
  codes.forEach((code) => {
    if (!ordered.some((item) => item.id === code.id)) ordered.push({ ...code, depth: 0 })
  })

  return ordered
}

function descendantCodeIds(codes: Code[], codeId: string) {
  const childrenByParent = new Map<string, string[]>()
  codes.forEach((code) => {
    if (!code.parentCodeId) return
    childrenByParent.set(code.parentCodeId, [...(childrenByParent.get(code.parentCodeId) ?? []), code.id])
  })

  const ids: string[] = []
  const visit = (parentId: string, seen = new Set<string>()) => {
    const childIds = childrenByParent.get(parentId) ?? []
    childIds.forEach((childId) => {
      if (seen.has(childId)) return
      ids.push(childId)
      visit(childId, new Set(seen).add(childId))
    })
  }

  visit(codeId)
  return ids
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
    savedQueries: initialSavedQueries,
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
  attributeValueRows: NormalizedAttributeValueRow[] = [],
  queryRows: NormalizedQueryRow[] = []
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
  const savedQueries = queryRows.map<SavedQuery>((query) => ({
    id: query.id,
    name: query.name,
    queryType: query.query_type,
    definition: normalizeQueryDefinition(query.definition),
  }))
  const codes = codeRows.map<Code>((code) => ({
    id: code.id,
    name: code.name,
    color: code.color,
    description: code.description,
    parentCodeId: code.parent_code_id ?? undefined,
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
    savedQueries,
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

type TranscriptPiece = { text: string; codes?: Code[] }

function wrapHighlightedTranscript(
  pieces: TranscriptPiece[],
  mode: LineNumberingMode,
  width: number,
): TranscriptPiece[][] {
  const lines: TranscriptPiece[][] = [[]]
  let currentLength = 0

  const pushNewLine = () => {
    lines.push([])
    currentLength = 0
  }

  const pushSegment = (piece: TranscriptPiece, text: string) => {
    if (!text) return
    lines[lines.length - 1].push({ ...piece, text })
    currentLength += text.length
  }

  for (const piece of pieces) {
    const paragraphs = piece.text.split('\n')
    paragraphs.forEach((paragraph, paragraphIndex) => {
      if (paragraphIndex > 0) pushNewLine()

      if (mode === 'paragraph' || paragraph.length === 0) {
        pushSegment(piece, paragraph)
        return
      }

      let remaining = paragraph
      while (remaining.length > 0) {
        const room = width - currentLength
        if (remaining.length <= room) {
          pushSegment(piece, remaining)
          break
        }
        // Break at the last space within the remaining room (word-aware).
        // -1 means no space found at or before `room`.
        const breakIndex = remaining.lastIndexOf(' ', room)
        if (breakIndex <= 0) {
          // No usable break point. If the current line already has content,
          // wrap to a fresh line and try again. Otherwise hard-break at room
          // to make progress on a single very long word.
          if (currentLength > 0) {
            pushNewLine()
            continue
          }
          pushSegment(piece, remaining.slice(0, room))
          remaining = remaining.slice(room)
          pushNewLine()
          continue
        }
        pushSegment(piece, remaining.slice(0, breakIndex))
        remaining = remaining.slice(breakIndex + 1) // drop the space at the break
        pushNewLine()
      }
    })
  }

  return lines
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
  const [savedQueries, setSavedQueries] = useState(defaultProject.savedQueries)
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
  const [queryAttributes, setQueryAttributes] = useState<AttributeFilter[]>([])
  const [queryName, setQueryName] = useState('')
  const [activeSavedQueryId, setActiveSavedQueryId] = useState('')
  const [analyzePanel, setAnalyzePanel] = useState<AnalyzePanel>('query')
  const [analyzeView, setAnalyzeView] = useState<AnalyzeViewState>(DEFAULT_ANALYZE_VIEW)
  const [matrixColumnMode, setMatrixColumnMode] = useState<MatrixColumnMode>('case')
  const [matrixAttributeId, setMatrixAttributeId] = useState('')
  const [quickCodingEnabled, setQuickCodingEnabled] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('fieldnote.sidebarCollapsed') === 'true'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('fieldnote.sidebarCollapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])
  const [quickCodeMenu, setQuickCodeMenu] = useState<QuickCodeMenu | null>(null)
  const [quickNewCodeName, setQuickNewCodeName] = useState('')
  const [lineNumberingMode, setLineNumberingMode] = useState<LineNumberingMode>(DEFAULT_LINE_NUMBERING_MODE)
  const [lineNumberingWidth, setLineNumberingWidth] = useState(DEFAULT_LINE_NUMBERING_WIDTH)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectionHint, setSelectionHint] = useState('Select text in the source, then click Code selection.')
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  const hasLoadedRemoteProject = useRef(false)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const activeSource = sources.find((source) => source.id === activeSourceId) ?? sources[0] ?? defaultProject.sources[0]
  const activeCode = codes.find((code) => code.id === activeCodeId) ?? codes[0]
  const activeMemo = memos.find((memo) => memo.id === activeMemoId) ?? memos[0]
  const selectedCodes = codes.filter((code) => selectedCodeIds.includes(code.id))
  const selectedCodeNames = selectedCodes.map((code) => code.name).join(', ')
  const sourceExcerpts = excerpts.filter((excerpt) => excerpt.sourceId === activeSource.id)
  const activeCodeTreeIds = [activeCode.id, ...descendantCodeIds(codes, activeCode.id)]
  const codeExcerpts = excerpts.filter((excerpt) => excerpt.codeIds.some((codeId) => activeCodeTreeIds.includes(codeId)))
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
    () => ({ activeSourceId, sources, cases, attributes, attributeValues, savedQueries, codes, memos, excerpts }),
    [activeSourceId, attributeValues, attributes, cases, codes, excerpts, memos, savedQueries, sources]
  )
  const currentQueryDefinition: QueryDefinition = {
    text: queryText,
    codeId: queryCodeId,
    caseId: queryCaseId,
    attributes: queryAttributes,
    analyzeView: serializeAnalyzeView(analyzeView),
  }
  const activeSavedQuery = savedQueries.find((query) => query.id === activeSavedQueryId)
  const caseGridTemplate = `minmax(170px, 1fr) minmax(160px, 1fr) ${attributes
    .map(() => 'minmax(120px, 0.75fr)')
    .join(' ')} minmax(160px, 1fr) 36px`
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources])
  const codeById = useMemo(() => new Map(codes.map((code) => [code.id, code])), [codes])
  const sortedCodes = useMemo(() => buildCodeTree(codes), [codes])
  const activeCodeParent = activeCode.parentCodeId ? codeById.get(activeCode.parentCodeId) : undefined
  const activeCodeChildren = codes.filter((code) => code.parentCodeId === activeCode.id)
  const parentCodeOptions = sortedCodes.filter((code) => code.id !== activeCode.id && !descendantCodeIds(codes, activeCode.id).includes(code.id))
  const caseBySourceId = useMemo(() => {
    const map = new Map<string, Case>()
    cases.forEach((item) => item.sourceIds.forEach((sourceId) => map.set(sourceId, item)))
    return map
  }, [cases])
  const valuesForAttribute = useMemo(() => {
    const cache = new Map<string, string[]>()
    return (attributeId: string): string[] => {
      if (!attributeId) return []
      const cached = cache.get(attributeId)
      if (cached) return cached
      const values = Array.from(
        new Set(
          attributeValues
            .filter((av) => av.attributeId === attributeId && av.value.trim())
            .map((av) => av.value.trim()),
        ),
      ).sort()
      cache.set(attributeId, values)
      return values
    }
  }, [attributeValues])

  async function loadProjectData(project: ProjectRow) {
    try {
      const [sourceResult, codeResult, memoResult, segmentResult, referenceResult, caseResult, caseSourceResult, attributeResult, attributeValueResult, queryResult] = await Promise.all([
        supabase.from('fieldnote_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_codes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_memos').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_source_segments').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_coded_references').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_cases').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_case_sources').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_attributes').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_attribute_values').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
        supabase.from('fieldnote_queries').select('*').eq('project_id', project.id).order('created_at', { ascending: true }),
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
        attributeValueResult.error ??
        queryResult.error
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
      const normalizedQueries = (queryResult.data ?? []) as NormalizedQueryRow[]

      if (
        normalizedSources.length ||
        normalizedCodes.length ||
        normalizedMemos.length ||
        normalizedSegments.length ||
        normalizedReferences.length ||
        normalizedCases.length ||
        normalizedAttributes.length ||
        normalizedQueries.length
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
          normalizedAttributeValues,
          normalizedQueries
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
    const queryRows = nextProjectData.savedQueries.map((query) => ({
      id: query.id,
      project_id: nextProjectId,
      name: query.name,
      query_type: query.queryType,
      definition: query.definition,
    }))
    const codeRows = nextProjectData.codes.map((code) => ({
      id: code.id,
      project_id: nextProjectId,
      parent_code_id: code.parentCodeId ?? null,
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
      queryRows.length ? supabase.from('fieldnote_queries').upsert(queryRows, { onConflict: 'project_id,id' }) : undefined,
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
    const existingQueryIds = nextProjectData.savedQueries.map((query) => query.id)
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
      existingQueryIds.length
        ? supabase.from('fieldnote_queries').delete().eq('project_id', nextProjectId).not('id', 'in', postgrestInList(existingQueryIds))
        : supabase.from('fieldnote_queries').delete().eq('project_id', nextProjectId),
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
    setLineNumberingMode(project.line_numbering_mode ?? DEFAULT_LINE_NUMBERING_MODE)
    setLineNumberingWidth(project.line_numbering_width ?? DEFAULT_LINE_NUMBERING_WIDTH)
    setActiveView('organize')
    setActiveSourceId(nextProject.activeSourceId)
    setSources(nextProject.sources)
    setCases(nextProject.cases)
    setAttributes(nextProject.attributes)
    setAttributeValues(nextProject.attributeValues)
    setSavedQueries(nextProject.savedQueries)
    setCodes(nextProject.codes)
    setMemos(nextProject.memos)
    setExcerpts(nextProject.excerpts)
    setActiveCodeId(nextProject.codes[0]?.id ?? initialCodes[0].id)
    setActiveMemoId(nextProject.memos[0]?.id ?? initialMemos[0].id)
    setSelectedCodeIds(nextProject.codes[0]?.id ? [nextProject.codes[0].id] : [initialCodes[0].id])
    setQueryText('')
    setQueryCodeId('')
    setQueryCaseId('')
    setQueryAttributes([])
    setQueryName('')
    setActiveSavedQueryId('')
    setAnalyzePanel('query')
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
              line_numbering_mode: lineNumberingMode,
              line_numbering_width: lineNumberingWidth,
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
                    line_numbering_mode: lineNumberingMode,
                    line_numbering_width: lineNumberingWidth,
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
  }, [activeSource.content, activeSource.title, lineNumberingMode, lineNumberingWidth, projectData, projectId, projectMemo.body, projectTitle, session])

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

      if (!excerptMatchesAttributeFilters(queryAttributes, linkedCase?.id, attributeValues)) return false

      return true
    })
  }, [attributeValues, caseBySourceId, codes, excerpts, queryAttributes, queryCaseId, queryCodeId, queryText, sourceById])

  const analyzeMatchingCases = useMemo(() => {
    const matchingCases = analyzeResults.flatMap((excerpt) => {
      const linkedCase = caseBySourceId.get(excerpt.sourceId)
      return linkedCase ? [linkedCase] : []
    })
    return Array.from(new Map(matchingCases.map((item) => [item.id, item])).values())
  }, [analyzeResults, caseBySourceId])

  const activeMatrixAttribute = attributes.find((attribute) => attribute.id === matrixAttributeId) ?? attributes[0]
  const matrixRows = useMemo(() => {
    if (queryCodeId) {
      const selectedCode = codes.find((code) => code.id === queryCodeId)
      return selectedCode ? [selectedCode] : []
    }
    return sortedCodes
  }, [codes, queryCodeId, sortedCodes])
  const matrixColumns = useMemo<MatrixColumn[]>(() => {
    if (matrixColumnMode === 'case') {
      return cases.map((item) => ({
        id: item.id,
        label: item.name,
        caseIds: [item.id],
      }))
    }

    if (!activeMatrixAttribute) return []

    const valueGroups = new Map<string, string[]>()
    attributeValues.forEach((attributeValue) => {
      if (attributeValue.attributeId !== activeMatrixAttribute.id) return
      const value = attributeValue.value.trim()
      if (!value) return
      valueGroups.set(value, [...(valueGroups.get(value) ?? []), attributeValue.caseId])
    })

    return Array.from(valueGroups.entries()).map(([value, caseIds]) => ({
      id: `${activeMatrixAttribute.id}:${value}`,
      label: value,
      caseIds,
    }))
  }, [activeMatrixAttribute, attributeValues, cases, matrixColumnMode])
  const matrixResults = useMemo(() => {
    const caseIdBySourceId = new Map<string, string>()
    cases.forEach((item) => item.sourceIds.forEach((sourceId) => caseIdBySourceId.set(sourceId, item.id)))

    return matrixRows.map((code) => ({
      code,
      cells: matrixColumns.map((column) => {
        const columnCaseIds = new Set(column.caseIds)
        const matches = analyzeResults.filter((excerpt) => {
          const linkedCaseId = caseIdBySourceId.get(excerpt.sourceId)
          return excerpt.codeIds.includes(code.id) && Boolean(linkedCaseId && columnCaseIds.has(linkedCaseId))
        })

        return { column, excerpts: matches }
      }),
    }))
  }, [analyzeResults, cases, matrixColumns, matrixRows])
  const matrixTotalReferences = matrixResults.reduce((total, row) => total + row.cells.reduce((rowTotal, cell) => rowTotal + cell.excerpts.length, 0), 0)
  const wordFrequencyRows = useMemo<WordFrequencyRow[]>(() => {
    const counts = new Map<string, { count: number; excerptIds: Set<string> }>()

    analyzeResults.forEach((excerpt) => {
      const words = excerpt.text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []
      words.forEach((rawWord) => {
        const word = rawWord.replace(/^'+|'+$/g, '')
        if (word.length < 3 || stopWords.has(word)) return
        const current = counts.get(word) ?? { count: 0, excerptIds: new Set<string>() }
        current.count += 1
        current.excerptIds.add(excerpt.id)
        counts.set(word, current)
      })
    })

    return Array.from(counts.entries())
      .map(([word, value]) => ({ word, count: value.count, excerptCount: value.excerptIds.size }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, 60)
  }, [analyzeResults])
  const coOccurrenceRows = useMemo<CoOccurrenceRow[]>(() => {
    const pairMap = new Map<string, CoOccurrenceRow>()

    analyzeResults.forEach((excerpt) => {
      const excerptCodes = excerpt.codeIds
        .map((codeId) => codeById.get(codeId))
        .filter((code): code is Code => Boolean(code))
        .sort((a, b) => a.name.localeCompare(b.name))

      excerptCodes.forEach((firstCode, firstIndex) => {
        excerptCodes.slice(firstIndex + 1).forEach((secondCode) => {
          const ids = [firstCode.id, secondCode.id].sort()
          const key = ids.join('__')
          const existing = pairMap.get(key) ?? { key, codes: [firstCode, secondCode], count: 0, excerpts: [] }
          existing.count += 1
          existing.excerpts = [...existing.excerpts, excerpt]
          pairMap.set(key, existing)
        })
      })
    })

    return Array.from(pairMap.values()).sort((a, b) => b.count - a.count || a.codes.map((code) => code.name).join(' + ').localeCompare(b.codes.map((code) => code.name).join(' + ')))
  }, [analyzeResults, codeById])
  const wordFrequencyViewRows = useMemo<WordFreqRow[]>(
    () => wordFrequencyRows.map((row) => ({ word: row.word, count: row.count, excerptCount: row.excerptCount })),
    [wordFrequencyRows],
  )
  const cooccurrencePairs = useMemo<CooccurPair[]>(
    () =>
      coOccurrenceRows.flatMap((row) => {
        const [a, b] = row.codes
        if (!a || !b) return []
        return [{
          codeAId: a.id,
          codeAName: a.name,
          codeBId: b.id,
          codeBName: b.name,
          count: row.count,
          sampleExcerpt: row.excerpts[0]?.text,
        }]
      }),
    [coOccurrenceRows],
  )
  const matrixCellInputs = useMemo<MatrixCellInput[]>(
    () =>
      matrixResults.flatMap((row) =>
        row.cells.map((cell) => ({
          rowId: row.code.id,
          rowLabel: row.code.name,
          colId: cell.column.id,
          colLabel: cell.column.label,
          count: cell.excerpts.length,
          sampleExcerpt: cell.excerpts[0]?.text,
        })),
      ),
    [matrixResults],
  )

  const crosstabResult = useMemo<CrosstabResult | null>(() => {
    const { attr1Id, attr2Id, topNRows, topNCols } = analyzeView.crosstab
    if (!attr1Id || !attr2Id) return null
    return buildCrosstab({
      excerpts: analyzeResults,
      codes,
      cases,
      attributeValues,
      attr1Id,
      attr2Id,
      topNRows,
      topNCols,
    })
  }, [analyzeResults, codes, cases, attributeValues, analyzeView.crosstab])

  function handleCrosstabCellSelect(codeId: string, v1: string, v2: string) {
    const attr1Id = analyzeView.crosstab.attr1Id
    const attr2Id = analyzeView.crosstab.attr2Id
    if (!attr1Id || !attr2Id) return
    setQueryCodeId(codeId)
    setQueryAttributes((prev) => {
      const filtered = prev.filter(
        (f) => f.attributeId !== attr1Id && f.attributeId !== attr2Id,
      )
      return [
        ...filtered,
        { attributeId: attr1Id, value: v1 },
        { attributeId: attr2Id, value: v2 },
      ]
    })
    setAnalyzePanel('query')
  }

  const analyzePanelTitle =
    analyzePanel === 'matrix'
      ? 'Matrix coding'
      : analyzePanel === 'frequency'
        ? 'Word frequency'
        : analyzePanel === 'cooccurrence'
          ? 'Code co-occurrence'
          : activeSavedQuery?.name ?? 'Coded excerpt query'
  const analyzePanelCount =
    analyzePanel === 'matrix'
      ? `${matrixTotalReferences} matrix references`
      : analyzePanel === 'frequency'
        ? `${wordFrequencyRows.length} terms`
        : analyzePanel === 'cooccurrence'
          ? `${coOccurrenceRows.length} pairs`
          : `${analyzeResults.length} results`

  const activeQueryFilters = [
    queryText.trim() ? `Text contains "${queryText.trim()}"` : '',
    queryCodeId ? `Code: ${codes.find((code) => code.id === queryCodeId)?.name ?? 'Unknown code'}` : '',
    queryCaseId ? `Case: ${cases.find((item) => item.id === queryCaseId)?.name ?? 'Unknown case'}` : '',
    ...queryAttributes
      .filter((f) => f.attributeId && f.value)
      .map((f) => {
        const name = attributes.find((a) => a.id === f.attributeId)?.name ?? 'Unknown attribute'
        return `${name} = ${f.value}`
      }),
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
  const readerWordCount = useMemo(() => {
    const text = activeSource.content || ''
    return text.split(/\s+/).filter(Boolean).length
  }, [activeSource.content])

  const readerRefCount = useMemo(() => {
    return excerpts.filter((e) => e.sourceId === activeSource.id).length
  }, [excerpts, activeSource.id])

  const highlightedTranscriptLines = useMemo(() => {
    return wrapHighlightedTranscript(highlightedTranscript, lineNumberingMode, lineNumberingWidth)
  }, [highlightedTranscript, lineNumberingMode, lineNumberingWidth])

  function addCode() {
    const name = newCodeName.trim()
    if (!name) return

    const addToActiveCodingSet = activeView === 'code'
    const addAsChild = activeView === 'refine'
    const code = buildNewCode(name, addAsChild ? activeCode.id : undefined)

    setCodes((current) => [...current, code])
    if (addToActiveCodingSet) setSelectedCodeIds((current) => [...current, code.id])
    setActiveCodeId(code.id)
    setSelectionHint(
      addToActiveCodingSet
        ? `Created "${name}" and added it to the active coding set.`
        : addAsChild
          ? `Created "${name}" under "${activeCode.name}".`
          : `Created "${name}" in the codebook.`
    )
    setNewCodeName('')
  }

  function updateCode(codeId: string, patch: Partial<Code>) {
    setCodes((current) => current.map((code) => (code.id === codeId ? { ...code, ...patch } : code)))
  }

  function updateCodeParent(codeId: string, parentCodeId: string) {
    const invalidParentIds = new Set([codeId, ...descendantCodeIds(codes, codeId)])
    if (parentCodeId && invalidParentIds.has(parentCodeId)) return
    updateCode(codeId, { parentCodeId: parentCodeId || undefined })
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

    setCodes(remainingCodes.map((code) => (code.parentCodeId === activeCode.id ? { ...code, parentCodeId: activeCode.parentCodeId } : code)))
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
    if (descendantCodeIds(codes, activeCode.id).includes(targetCode.id)) return

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
    setCodes((current) =>
      current
        .filter((code) => code.id !== activeCode.id)
        .map((code) => (code.parentCodeId === activeCode.id ? { ...code, parentCodeId: targetCode.id } : code))
    )
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

  function buildNewCode(name: string, parentCodeId?: string): Code {
    // Bundle palette — 8 OKLCH colors at shared chroma 0.10 with hue varied.
    // Mirrors the --c-* tokens in src/styles/tokens.css.
    const palette = [
      'oklch(0.62 0.10 195)',  // teal
      'oklch(0.66 0.08 220)',  // cyan
      'oklch(0.55 0.10 265)',  // indigo
      'oklch(0.55 0.10 315)',  // plum
      'oklch(0.62 0.10 20)',   // rose
      'oklch(0.72 0.09 75)',   // amber
      'oklch(0.62 0.08 150)',  // moss
      'oklch(0.55 0.04 240)',  // slate
    ]
    return {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name,
      color: palette[codes.length % palette.length],
      description: 'New research code. Add a short meaning once the pattern becomes clear.',
      parentCodeId,
    }
  }

  function selectView(view: WorkspaceView) {
    setActiveView(view)
    setQuickCodeMenu(null)
    if (view === 'refine') setActiveCodeId(activeCodeId || codes[0]?.id || '')
  }

  function selectActiveSource(sourceId: string) {
    setActiveSourceId(sourceId)
    setQuickCodeMenu(null)
  }

  function selectSourceFolder(folder: SourceFolderFilter) {
    setSourceFolderFilter(folder)
    const firstVisibleSource =
      folder === 'Archived'
        ? archivedSources[0]
        : folder === 'All'
          ? activeSources[0]
          : activeSources.find((source) => source.folder === folder)
    if (firstVisibleSource) selectActiveSource(firstVisibleSource.id)
  }

  function applyCodesToText(selectedText: string, codeIds = selectedCodeIds, label = selectedCodeNames) {
    let mergedExistingReference = false

    setExcerpts((current) => {
      const existingReference = current.find((excerpt) => excerpt.sourceId === activeSource.id && excerpt.text === selectedText)
      if (existingReference) {
        mergedExistingReference = true
        return current.map((excerpt) =>
          excerpt.id === existingReference.id
            ? {
                ...excerpt,
                codeIds: Array.from(new Set([...excerpt.codeIds, ...codeIds])),
              }
            : excerpt
        )
      }

      return [
        {
          id: `excerpt-${Date.now()}`,
          codeIds,
          sourceId: activeSource.id,
          sourceTitle: activeSource.title,
          text: selectedText,
          note: '',
        },
        ...current,
      ]
    })
    setSelectionHint(`${mergedExistingReference ? 'Added codes to existing reference' : 'Coded selection'} as ${label}.`)
    setQuickCodeMenu(null)
    setQuickNewCodeName('')
    window.getSelection()?.removeAllRanges()
  }

  function codeSelection(selectedTextOverride?: string) {
    const selectedText = selectedTextOverride?.trim() || window.getSelection()?.toString().trim()

    if (!selectedText || activeView !== 'code') {
      setSelectionHint(activeView === 'code' ? 'No text is selected yet. Drag across a phrase or paragraph first.' : 'Switch to Code mode before coding text.')
      return
    }

    applyCodesToText(selectedText)
  }

  function createQuickCodeAndApply() {
    const name = quickNewCodeName.trim()
    if (!name || !quickCodeMenu) return

    const code = buildNewCode(name)
    const nextCodeIds = Array.from(new Set([...selectedCodeIds, code.id]))
    const nextLabel = [...selectedCodes.map((item) => item.name), code.name].join(', ')

    setCodes((current) => [...current, code])
    setSelectedCodeIds(nextCodeIds)
    setActiveCodeId(code.id)
    applyCodesToText(quickCodeMenu.text, nextCodeIds, nextLabel)
  }

  function captureQuickCodeSelection() {
    if (!quickCodingEnabled || activeView !== 'code') return

    window.requestAnimationFrame(() => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim() ?? ''
      const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null
      const transcriptElement = transcriptRef.current
      const anchorNode = selection?.anchorNode

      if (!selectedText || !range || !transcriptElement || !anchorNode || !transcriptElement.contains(anchorNode)) {
        setQuickCodeMenu(null)
        return
      }

      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) return

      const x = Math.min(window.innerWidth - 220, Math.max(220, rect.left + rect.width / 2))
      const y = Math.max(88, rect.top - 12)
      setQuickNewCodeName('')
      setQuickCodeMenu({ text: selectedText, x, y })
    })
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

  function applyQueryDefinition(definition: QueryDefinition) {
    setQueryText(definition.text)
    setQueryCodeId(definition.codeId)
    setQueryCaseId(definition.caseId)
    setQueryAttributes(definition.attributes)
    setAnalyzeView(definition.analyzeView ?? DEFAULT_ANALYZE_VIEW)
  }

  function saveCurrentQuery() {
    const name = queryName.trim() || activeSavedQuery?.name || 'Untitled query'
    const nextQuery: SavedQuery = {
      id: activeSavedQueryId || `query-${Date.now()}`,
      name,
      queryType: 'coded_excerpt',
      definition: currentQueryDefinition,
    }

    setSavedQueries((current) => {
      const exists = current.some((query) => query.id === nextQuery.id)
      return exists ? current.map((query) => (query.id === nextQuery.id ? nextQuery : query)) : [nextQuery, ...current]
    })
    setActiveSavedQueryId(nextQuery.id)
    setQueryName(nextQuery.name)
  }

  function openSavedQuery(query: SavedQuery) {
    applyQueryDefinition(query.definition)
    setActiveSavedQueryId(query.id)
    setQueryName(query.name)
    setAnalyzePanel('query')
  }

  function deleteSavedQuery(queryId: string) {
    const query = savedQueries.find((item) => item.id === queryId)
    const shouldDelete = window.confirm(`Delete saved query "${query?.name ?? 'Untitled query'}"? This cannot be undone.`)
    if (!shouldDelete) return

    setSavedQueries((current) => current.filter((item) => item.id !== queryId))
    if (activeSavedQueryId === queryId) {
      setActiveSavedQueryId('')
      setQueryName('')
    }
  }

  function clearQueryFilters() {
    applyQueryDefinition(normalizeQueryDefinition())
    setActiveSavedQueryId('')
    setQueryName('')
  }

  function archiveActiveSource() {
    updateSource(activeSource.id, { archived: true })
    const nextSource = activeSources.find((source) => source.id !== activeSource.id) ?? sources.find((source) => source.id !== activeSource.id)
    if (nextSource) selectActiveSource(nextSource.id)
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
    if (nextSource) selectActiveSource(nextSource.id)
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
      selectActiveSource(newSources[0].id)
      setSourceFolderFilter(targetFolder)
      setActiveView('organize')
      setSelectionHint(`${newSources.length} source${newSources.length === 1 ? '' : 's'} imported.`)
      event.target.value = ''
    })
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

  function exportMatrixCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const columnType = matrixColumnMode === 'case' ? 'Case' : activeMatrixAttribute?.name ?? 'Attribute'
    const rows = [
      ['Project', 'Row code', 'Column type', 'Column', 'Count', 'Excerpt sources', 'Excerpts', 'Active filters'],
      ...matrixResults.flatMap((row) =>
        row.cells.map((cell) => [
          projectTitle,
          row.code.name,
          columnType,
          cell.column.label,
          String(cell.excerpts.length),
          cell.excerpts.map((excerpt) => excerpt.sourceTitle).join('; '),
          cell.excerpts.map((excerpt) => excerpt.text).join(' | '),
          activeQueryFilters.join('; '),
        ])
      ),
    ]

    downloadCsv(rows, 'fieldnote-matrix-coding.csv')
  }

  function exportWordFrequencyCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Word', 'Count', 'Excerpt count', 'Active filters'],
      ...wordFrequencyRows.map((row) => [projectTitle, row.word, String(row.count), String(row.excerptCount), activeQueryFilters.join('; ')]),
    ]

    downloadCsv(rows, 'fieldnote-word-frequency.csv')
  }

  function exportCoOccurrenceCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Code 1', 'Code 2', 'Count', 'Excerpt sources', 'Excerpts', 'Active filters'],
      ...coOccurrenceRows.map((row) => [
        projectTitle,
        row.codes[0]?.name ?? '',
        row.codes[1]?.name ?? '',
        String(row.count),
        row.excerpts.map((excerpt) => excerpt.sourceTitle).join('; '),
        row.excerpts.map((excerpt) => excerpt.text).join(' | '),
        activeQueryFilters.join('; '),
      ]),
    ]

    downloadCsv(rows, 'fieldnote-code-cooccurrence.csv')
  }

  function exportActiveAnalysisCsv(event: MouseEvent<HTMLButtonElement>) {
    if (analyzePanel === 'matrix') {
      exportMatrixCsv(event)
      return
    }
    if (analyzePanel === 'frequency') {
      exportWordFrequencyCsv(event)
      return
    }
    if (analyzePanel === 'cooccurrence') {
      exportCoOccurrenceCsv(event)
      return
    }
    if (analyzePanel === 'crosstab') {
      event.preventDefault()
      if (!crosstabResult) return
      const a1 = attributes.find((a) => a.id === analyzeView.crosstab.attr1Id)?.name ?? 'Attribute 1'
      const a2 = attributes.find((a) => a.id === analyzeView.crosstab.attr2Id)?.name ?? 'Attribute 2'
      const rows = crosstabCsvRows(crosstabResult, a1, a2)
      downloadCsv(rows, 'fieldnote-crosstabs.csv')
      return
    }
    exportAnalyzeCsv(event)
  }

  function exportCodebookCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Parent code', 'Code', 'Description', 'References', 'Example excerpt'],
      ...sortedCodes.map((code) => {
        const references = excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id))
        return [projectTitle, code.parentCodeId ? codeById.get(code.parentCodeId)?.name ?? '' : '', code.name, code.description, String(references.length), references[0]?.text ?? '']
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
    return <Landing />
  }

  if (!projectId) {
    return (
      <main className="project-home-shell" data-shell="new">
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
    <>
    <main className="app-shell" data-shell="new">
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
          {projectId && (
            <button
              type="button"
              className="header-icon-button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Project settings"
              title="Project settings"
            >
              <Settings size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <aside
        className={`workspace-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`}
        aria-label="Workspace sidebar"
      >
        <div className="sidebar-brand">
          <div className="sidebar-mark">F</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-eyebrow">Qualitative workspace</span>
            <span className="sidebar-wordmark">Fieldnote</span>
          </div>
        </div>

        <button className="project-switcher project-nav-link" type="button" onClick={returnToProjects} title="Back to project home">
          <span className="project-switcher-chevron" aria-hidden="true">▾</span>
          <span className="project-switcher-name">{projectTitle}</span>
        </button>

        <nav className="mode-switcher" aria-label="Research modes">
          {modeItems.map((mode) => {
            const Icon = mode.icon
            return (
              <button
                key={mode.id}
                className={activeView === mode.id ? 'active' : ''}
                type="button"
                title={`${mode.label} — ${mode.description}`}
                onClick={() => selectView(mode.id)}
              >
                <Icon size={15} className="mode-icon" aria-hidden="true" />
                <span className="mode-label">{mode.label}</span>
                <small className={`mode-badge ${mode.status}`}>
                  {mode.status === 'ready' ? 'Now' : mode.status === 'partial' ? 'MVP' : 'Soon'}
                </small>
              </button>
            )
          })}
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
            savedQueries={savedQueries}
            activeSavedQueryId={activeSavedQueryId}
            analyzePanel={analyzePanel}
            codes={codes}
            excerpts={excerpts}
            onSelectSource={(id) => {
              selectActiveSource(id)
              if (activeView === 'organize' || activeView === 'classify') return
              setActiveView('code')
            }}
            onSelectCode={(id) => {
              setActiveCodeId(id)
              setActiveView('refine')
            }}
            onUseCurrentQuery={() => {
              setAnalyzePanel('query')
              setActiveSavedQueryId('')
              setQueryName('')
            }}
            onOpenSavedQuery={openSavedQuery}
            onOpenMatrix={() => setAnalyzePanel('matrix')}
            onOpenFrequency={() => setAnalyzePanel('frequency')}
            onOpenCoOccurrence={() => setAnalyzePanel('cooccurrence')}
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
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
            <span className="sidebar-collapse-label">{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
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

          <div className="detail-toolbar-tools">
            {activeView !== 'analyze' && (
              <div className="search-box">
                <Search size={17} aria-hidden="true" />
                <input value={searchTerm} placeholder="Find coded work" aria-label="Search coded work" onChange={(event) => setSearchTerm(event.target.value)} />
              </div>
            )}
            {activeView === 'code' && (
              <button type="button" className="primary-button toolbar-code-action" onClick={() => codeSelection()}>
                <Highlighter size={18} aria-hidden="true" />
                Code selection
              </button>
            )}
            <div className="toolbar-status sync-box" aria-live="polite">
              <Cloud size={14} aria-hidden="true" />
              <span>{saveStatus}</span>
            </div>
            {projectId && (
              <button
                type="button"
                className="header-icon-button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Project settings"
                title="Project settings"
              >
                <Settings size={18} aria-hidden="true" />
              </button>
            )}
          </div>
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
                  <button key={source.id} className={source.id === activeSource.id ? 'source-row active' : 'source-row'} type="button" onClick={() => selectActiveSource(source.id)}>
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
            <div className="active-codes-bar">
              <div className="active-codes-bar-text">
                <strong className="active-codes-title">{selectedCodeNames}</strong>
                <p className="active-codes-hint">{selectionHint} Active codes can be combined.</p>
              </div>
              <label className="quick-toggle">
                <input
                  type="checkbox"
                  checked={quickCodingEnabled}
                  onChange={(event) => {
                    setQuickCodingEnabled(event.target.checked)
                    setQuickCodeMenu(null)
                  }}
                />
                Quick menu
              </label>
            </div>

            <div
              className="reader-column"
              style={
                lineNumberingMode === 'fixed-width'
                  ? ({ '--reader-measure': `${lineNumberingWidth}ch` } as CSSProperties)
                  : undefined
              }
            >
              <div className="reader-meta-strip fn-meta">
                <span>{activeSource.caseName || activeSource.kind}</span>
                <span aria-hidden="true">·</span>
                <span>{readerWordCount.toLocaleString()} words</span>
                <span aria-hidden="true">·</span>
                <span>{readerRefCount} codes applied</span>
              </div>

              <div className="transcript" ref={transcriptRef} aria-label="Source text with line numbers" onMouseUp={captureQuickCodeSelection} onKeyUp={captureQuickCodeSelection}>
              {highlightedTranscriptLines.map((line, lineIndex) => (
                <div className="transcript-line" key={`${activeSource.id}-line-${lineIndex}`}>
                  <span className="line-number" aria-hidden="true">
                    {lineIndex + 1}
                  </span>
                  <span className="line-text">
                    {line.length ? (
                      line.map((piece, pieceIndex) =>
                        piece.codes ? (
                          <mark
                            key={`${piece.text}-${lineIndex}-${pieceIndex}`}
                            className="multi-code-mark"
                            style={markBackground(piece.codes)}
                            title={piece.codes.map((code) => code.name).join(', ')}
                          >
                            {piece.text}
                          </mark>
                        ) : (
                          <span key={`${piece.text}-${lineIndex}-${pieceIndex}`}>{piece.text}</span>
                        )
                      )
                    ) : (
                      <br />
                    )}
                  </span>
                </div>
              ))}
            </div>
            </div>
            {quickCodingEnabled && quickCodeMenu && activeView === 'code' && (
              <div className="quick-code-menu" style={{ left: quickCodeMenu.x, top: quickCodeMenu.y }}>
                <div className="quick-code-heading">
                  <strong>Code selection</strong>
                  <button type="button" aria-label="Close quick coding menu" onClick={() => setQuickCodeMenu(null)}>
                    x
                  </button>
                </div>
                <p>{quickCodeMenu.text.length > 110 ? `${quickCodeMenu.text.slice(0, 110)}...` : quickCodeMenu.text}</p>
                <div className="quick-code-new">
                  <input
                    value={quickNewCodeName}
                    placeholder="New code for this passage"
                    aria-label="New quick code"
                    onChange={(event) => setQuickNewCodeName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') createQuickCodeAndApply()
                    }}
                  />
                  <button type="button" onClick={createQuickCodeAndApply} disabled={!quickNewCodeName.trim()}>
                    <Plus size={15} aria-hidden="true" />
                    Add & apply
                  </button>
                </div>
                <div className="quick-code-chips">
                  {sortedCodes.map((code) => (
                    <button
                      key={code.id}
                      className={selectedCodeIds.includes(code.id) ? 'selected' : ''}
                      type="button"
                      onClick={() => toggleSelectedCode(code.id)}
                    >
                      <span style={{ background: code.color }} />
                      {code.name}
                    </button>
                  ))}
                </div>
                <button className="primary-button" type="button" onClick={() => codeSelection(quickCodeMenu.text)}>
                  <Highlighter size={16} aria-hidden="true" />
                  Apply {selectedCodeIds.length} code{selectedCodeIds.length === 1 ? '' : 's'}
                </button>
              </div>
            )}
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

            <div className="code-hierarchy-row">
              <label className="property-field">
                <span>Parent code</span>
                <select value={activeCode.parentCodeId ?? ''} onChange={(event) => updateCodeParent(activeCode.id, event.target.value)}>
                  <option value="">Top-level code</option>
                  {parentCodeOptions.map((code) => (
                    <option key={code.id} value={code.id}>
                      {'-'.repeat(code.depth)} {code.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="code-family-summary">
                <span>{activeCodeParent ? `Under ${activeCodeParent.name}` : 'Top-level'}</span>
                <small>{activeCodeChildren.length} child code{activeCodeChildren.length === 1 ? '' : 's'}</small>
              </div>
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
                  {parentCodeOptions
                    .map((code) => (
                      <option key={code.id} value={code.id}>
                        {'-'.repeat(code.depth)} {code.name}
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
              <span>Code splitting, hierarchy drag-and-drop, and deeper codebook cleanup tools.</span>
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
                  <button type="button" onClick={() => selectActiveSource(source.id)}>
                    <strong>{source.title}</strong>
                    <small>{source.kind}</small>
                  </button>
                  <select
                    value={cases.find((item) => item.sourceIds.includes(source.id))?.id ?? ''}
                    aria-label={`Assigned case for ${source.title}`}
                    onFocus={() => selectActiveSource(source.id)}
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
                <p className="detail-kicker">Analyze</p>
                <h2>{analyzePanelTitle}</h2>
              </div>
              <span className="reference-count">{analyzePanelCount}</span>
            </div>

            <div className="analyze-tabs" role="tablist" aria-label="Analyze views">
              <button className={analyzePanel === 'query' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('query')}>
                <Search size={15} aria-hidden="true" />
                Query results
              </button>
              <button className={analyzePanel === 'matrix' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('matrix')}>
                <Rows3 size={15} aria-hidden="true" />
                Matrix coding
              </button>
              <button className={analyzePanel === 'frequency' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('frequency')}>
                <BookOpenText size={15} aria-hidden="true" />
                Word frequency
              </button>
              <button className={analyzePanel === 'cooccurrence' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('cooccurrence')}>
                <ListTree size={15} aria-hidden="true" />
                Co-occurrence
              </button>
              <button className={analyzePanel === 'crosstab' ? 'active' : ''} type="button" onClick={() => setAnalyzePanel('crosstab')}>
                <Grid3x3 size={15} aria-hidden="true" />
                Crosstabs
              </button>
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
                  {sortedCodes.map((code) => (
                    <option key={code.id} value={code.id}>
                      {'-'.repeat(code.depth)} {code.name}
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
              <div className="property-field property-field-stack">
                <span>Attributes</span>
                {queryAttributes.length === 0 && (
                  <div className="attribute-filter-empty">No attribute filters.</div>
                )}
                {queryAttributes.map((row, index) => {
                  const usedElsewhere = new Set(
                    queryAttributes.filter((_, i) => i !== index).map((r) => r.attributeId).filter(Boolean),
                  )
                  const valueOptions = valuesForAttribute(row.attributeId)
                  return (
                    <div key={index} className="attribute-filter-row">
                      <select
                        value={row.attributeId}
                        onChange={(event) => {
                          const nextId = event.target.value
                          setQueryAttributes((current) =>
                            current.map((r, i) => (i === index ? { attributeId: nextId, value: '' } : r)),
                          )
                        }}
                      >
                        <option value="">— pick attribute —</option>
                        {attributes
                          .filter((a) => a.id === row.attributeId || !usedElsewhere.has(a.id))
                          .map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                      </select>
                      <select
                        value={row.value}
                        disabled={!row.attributeId}
                        onChange={(event) => {
                          const nextValue = event.target.value
                          setQueryAttributes((current) =>
                            current.map((r, i) => (i === index ? { ...r, value: nextValue } : r)),
                          )
                        }}
                      >
                        <option value="">— pick value —</option>
                        {valueOptions.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="attribute-filter-delete"
                        aria-label="Remove this attribute filter"
                        onClick={() => {
                          setQueryAttributes((current) => current.filter((_, i) => i !== index))
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  className="secondary-button attribute-filter-add"
                  disabled={queryAttributes.length >= attributes.length}
                  onClick={() => {
                    setQueryAttributes((current) => [...current, { attributeId: '', value: '' }])
                  }}
                >
                  + Add attribute filter
                </button>
              </div>
              <button
                className="secondary-button query-clear"
                type="button"
                onClick={clearQueryFilters}
              >
                Clear filters
              </button>
            </div>

            <div className="query-save-row">
              <label className="property-field">
                <span>Saved query name</span>
                <input value={queryName} placeholder="Name this analytic question" onChange={(event) => setQueryName(event.target.value)} />
              </label>
              <button className="secondary-button" type="button" onClick={saveCurrentQuery}>
                <Plus size={16} aria-hidden="true" />
                {activeSavedQuery ? 'Update query' : 'Save query'}
              </button>
            </div>

            {analyzePanel === 'query' && (
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
                      <button type="button" onClick={() => selectActiveSource(excerpt.sourceId)}>
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
            )}

            {analyzePanel === 'matrix' && (
              <>
                <div className="matrix-toolbar">
                  <label className="property-field">
                    <span>Columns</span>
                    <select value={matrixColumnMode} onChange={(event) => setMatrixColumnMode(event.target.value as MatrixColumnMode)}>
                      <option value="case">Cases</option>
                      <option value="attribute">Attribute values</option>
                    </select>
                  </label>
                  <label className="property-field">
                    <span>Attribute</span>
                    <select
                      value={activeMatrixAttribute?.id ?? ''}
                      disabled={matrixColumnMode !== 'attribute'}
                      onChange={(event) => setMatrixAttributeId(event.target.value)}
                    >
                      {attributes.map((attribute) => (
                        <option key={attribute.id} value={attribute.id}>
                          {attribute.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <MatrixView
                  rowLabels={matrixRows.map((code) => code.name)}
                  colLabels={matrixColumns.map((column) => column.label)}
                  cells={matrixCellInputs}
                  view={analyzeView.matrix.view}
                  topNRows={analyzeView.matrix.topNRows}
                  topNCols={analyzeView.matrix.topNCols}
                  onViewChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, view: next } }))}
                  onTopNRowsChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, topNRows: next } }))}
                  onTopNColsChange={(next) => setAnalyzeView((s) => ({ ...s, matrix: { ...s.matrix, topNCols: next } }))}
                  onCellSelect={(rowId, colId) => {
                    setQueryCodeId(rowId)
                    if (matrixColumnMode === 'case') setQueryCaseId(colId)
                    else {
                      const value = colId.includes(':') ? colId.split(':').slice(1).join(':') : colId
                      setQueryAttributes([{ attributeId: matrixAttributeId, value }])
                    }
                  }}
                  onExportCsv={() => exportMatrixCsv({ preventDefault: () => {} } as MouseEvent<HTMLButtonElement>)}
                  classifyEmptyMessage={
                    cases.length === 0 && attributes.length === 0
                      ? 'Matrix needs cases or attribute values — go to Classify mode.'
                      : undefined
                  }
                />
              </>
            )}

            {analyzePanel === 'frequency' && (
              <WordFreqView
                rows={wordFrequencyViewRows}
                totalExcerpts={analyzeResults.length}
                view={analyzeView.wordFreq.view}
                topN={analyzeView.wordFreq.topN}
                onViewChange={(next) => setAnalyzeView((s) => ({ ...s, wordFreq: { ...s.wordFreq, view: next } }))}
                onTopNChange={(next) => setAnalyzeView((s) => ({ ...s, wordFreq: { ...s.wordFreq, topN: next } }))}
                onWordSelect={(word) => setQueryText(word)}
                onExportCsv={() => exportWordFrequencyCsv({ preventDefault: () => {} } as MouseEvent<HTMLButtonElement>)}
              />
            )}

            {analyzePanel === 'cooccurrence' && (
              <CooccurrenceView
                pairs={cooccurrencePairs}
                view={analyzeView.cooccur.view}
                topN={analyzeView.cooccur.topN}
                onViewChange={(next) => setAnalyzeView((s) => ({ ...s, cooccur: { ...s.cooccur, view: next } }))}
                onTopNChange={(next) => setAnalyzeView((s) => ({ ...s, cooccur: { ...s.cooccur, topN: next } }))}
                onPairSelect={(a) => setQueryCodeId(a)}
                onCodeSelect={(id) => setQueryCodeId(id)}
                onExportCsv={() => exportCoOccurrenceCsv({ preventDefault: () => {} } as MouseEvent<HTMLButtonElement>)}
              />
            )}
            {analyzePanel === 'crosstab' && (
              <div className="analyze-panel">
                <CrosstabsView
                  attributes={attributes.map((a) => ({ id: a.id, name: a.name }))}
                  attr1Id={analyzeView.crosstab.attr1Id}
                  attr2Id={analyzeView.crosstab.attr2Id}
                  percentMode={analyzeView.crosstab.percentMode}
                  topNRows={analyzeView.crosstab.topNRows}
                  topNCols={analyzeView.crosstab.topNCols}
                  result={crosstabResult}
                  onAttr1Change={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, attr1Id: next } }))}
                  onAttr2Change={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, attr2Id: next } }))}
                  onPercentModeChange={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, percentMode: next } }))}
                  onTopNRowsChange={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, topNRows: next } }))}
                  onTopNColsChange={(next) => setAnalyzeView((s) => ({ ...s, crosstab: { ...s.crosstab, topNCols: next } }))}
                  onCellSelect={handleCrosstabCellSelect}
                  onExportCsv={() => {
                    if (!crosstabResult) return
                    const a1 = attributes.find((a) => a.id === analyzeView.crosstab.attr1Id)?.name ?? 'Attribute 1'
                    const a2 = attributes.find((a) => a.id === analyzeView.crosstab.attr2Id)?.name ?? 'Attribute 2'
                    const rows = crosstabCsvRows(crosstabResult, a1, a2)
                    downloadCsv(rows, 'fieldnote-crosstabs.csv')
                  }}
                />
              </div>
            )}
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Saved analysis presets beyond coded excerpts and matrix drill-down editing.</span>
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
              {sortedCodes.map((code) => {
                const refCount = excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id)).length
                return (
                  <button
                    key={code.id}
                    className={(activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id) ? 'selected' : ''}
                    style={{ marginLeft: activeView === 'refine' ? code.depth * 14 : 0 }}
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
                    <span className="code-pick-dot" style={{ background: code.color }} />
                    <span className="code-pick-name">{code.name}</span>
                    {code.depth > 0 && activeView === 'refine' && <small className="code-pick-child">Child</small>}
                    <span className="code-pick-refs fn-mono">{refCount}</span>
                  </button>
                )
              })}
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
            {activeSavedQuery && (
              <button className="danger-button" type="button" onClick={() => deleteSavedQuery(activeSavedQuery.id)}>
                <Trash2 size={17} aria-hidden="true" />
                Delete saved query
              </button>
            )}
            <button className="secondary-button" type="button" onClick={exportActiveAnalysisCsv}>
              <Download size={17} aria-hidden="true" />
              {analyzePanel === 'matrix'
                ? 'Export matrix CSV'
                : analyzePanel === 'frequency'
                  ? 'Export word CSV'
                  : analyzePanel === 'cooccurrence'
                    ? 'Export pairs CSV'
                    : analyzePanel === 'crosstab'
                      ? 'Export crosstabs CSV'
                      : 'Export query CSV'}
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
    {settingsOpen && (
      <ProjectSettingsModal
        mode={lineNumberingMode}
        width={lineNumberingWidth}
        onModeChange={setLineNumberingMode}
        onWidthChange={setLineNumberingWidth}
        onClose={() => setSettingsOpen(false)}
      />
    )}
    </>
  )
}

function ProjectSettingsModal({
  mode,
  width,
  onModeChange,
  onWidthChange,
  onClose,
}: {
  mode: LineNumberingMode
  width: number
  onModeChange: (next: LineNumberingMode) => void
  onWidthChange: (next: number) => void
  onClose: () => void
}) {
  function commitWidth(raw: string, target: HTMLInputElement) {
    const next = Number(raw)
    if (!Number.isFinite(next)) {
      target.value = String(width)
      return
    }
    const clamped = Math.min(
      LINE_NUMBERING_WIDTH_MAX,
      Math.max(LINE_NUMBERING_WIDTH_MIN, Math.round(next)),
    )
    target.value = String(clamped)
    onWidthChange(clamped)
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="project-settings-title">Project settings</h2>
          <button
            type="button"
            className="header-icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="modal-section">
          <h3>Display</h3>
          <p className="modal-section-help">
            Controls how line numbers are assigned in the source reader.
          </p>

          <label className="modal-field">
            <span>Line numbering</span>
            <select
              value={mode}
              onChange={(event) => onModeChange(event.target.value as LineNumberingMode)}
            >
              <option value="fixed-width">Fixed width (citation-stable)</option>
              <option value="paragraph">Per paragraph</option>
            </select>
          </label>

          <label className="modal-field">
            <span>Line width (characters)</span>
            <input
              key={width}
              type="number"
              min={LINE_NUMBERING_WIDTH_MIN}
              max={LINE_NUMBERING_WIDTH_MAX}
              step={1}
              defaultValue={width}
              disabled={mode !== 'fixed-width'}
              onBlur={(event) => commitWidth(event.target.value, event.target)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitWidth(event.currentTarget.value, event.currentTarget)
              }}
            />
          </label>
        </section>
      </div>
    </div>
  )
}

function ListView({
  activeView,
  activeSourceId,
  activeCodeId,
  sources,
  visibleSources,
  cases,
  savedQueries,
  activeSavedQueryId,
  analyzePanel,
  codes,
  excerpts,
  onSelectSource,
  onSelectCode,
  onUseCurrentQuery,
  onOpenSavedQuery,
  onOpenMatrix,
  onOpenFrequency,
  onOpenCoOccurrence,
}: {
  activeView: WorkspaceView
  activeSourceId: string
  activeCodeId: string
  sources: Source[]
  visibleSources: Source[]
  cases: Case[]
  savedQueries: SavedQuery[]
  activeSavedQueryId: string
  analyzePanel: AnalyzePanel
  codes: Code[]
  excerpts: Excerpt[]
  onSelectSource: (id: string) => void
  onSelectCode: (id: string) => void
  onUseCurrentQuery: () => void
  onOpenSavedQuery: (query: SavedQuery) => void
  onOpenMatrix: () => void
  onOpenFrequency: () => void
  onOpenCoOccurrence: () => void
}) {
  const orderedCodes = buildCodeTree(codes)

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
        orderedCodes.map((code) => (
          <button className={code.id === activeCodeId ? 'list-item active' : 'list-item'} key={code.id} type="button" style={{ paddingLeft: 14 + code.depth * 16 }} onClick={() => onSelectCode(code.id)}>
            <span className="code-dot" style={{ background: code.color }} />
            <div>
              <strong>{code.name}</strong>
              <span>{excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id)).length} direct references</span>
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
          <button
            className={!activeSavedQueryId && analyzePanel === 'query' ? 'list-item active' : 'list-item'}
            type="button"
            onClick={onUseCurrentQuery}
          >
            <Search size={17} aria-hidden="true" />
            <div>
              <strong>Current query</strong>
              <span>Filter coded excerpts</span>
            </div>
          </button>
          {savedQueries.map((query) => (
            <button className={query.id === activeSavedQueryId && analyzePanel === 'query' ? 'list-item active' : 'list-item'} key={query.id} type="button" onClick={() => onOpenSavedQuery(query)}>
              <FileText size={17} aria-hidden="true" />
              <div>
                <strong>{query.name}</strong>
                <span>Saved query</span>
              </div>
            </button>
          ))}
          <button className={analyzePanel === 'matrix' ? 'list-item active' : 'list-item'} type="button" onClick={onOpenMatrix}>
            <Rows3 size={17} aria-hidden="true" />
            <div>
              <strong>Matrix coding</strong>
              <span>Codes by case or attribute</span>
            </div>
          </button>
          <button className={analyzePanel === 'frequency' ? 'list-item active' : 'list-item'} type="button" onClick={onOpenFrequency}>
            <BookOpenText size={17} aria-hidden="true" />
            <div>
              <strong>Word frequency</strong>
              <span>Terms in filtered excerpts</span>
            </div>
          </button>
          <button className={analyzePanel === 'cooccurrence' ? 'list-item active' : 'list-item'} type="button" onClick={onOpenCoOccurrence}>
            <ListTree size={17} aria-hidden="true" />
            <div>
              <strong>Co-occurrence</strong>
              <span>Codes that appear together</span>
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
