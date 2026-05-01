import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import {
  BarChart3,
  BookOpenText,
  Cloud,
  Download,
  FileText,
  Folders,
  Grid3x3,
  Highlighter,
  LayoutDashboard,
  ListTree,
  LogOut,
  MessageSquareText,
  Plus,
  Rows3,
  Search,
  Tags,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { loadProject, saveProject, type SavePayload } from './persistence/io'
import { useAutosave } from './persistence/useAutosave'
import {
  DEFAULT_ANALYZE_VIEW,
  serialize as serializeAnalyzeView,
  type AnalyzePanel,
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
import { applyReportIncludes, buildReport, DEFAULT_REPORT_INCLUDES, type ReportIncludes } from './report/buildReport'
import { exportReportPdf } from './report/exportPdf'
import { exportReportDocx } from './report/exportDocx'
import { OverviewMode } from './modes/overview/OverviewMode'
import { OverviewSidebar } from './modes/overview/OverviewSidebar'
import { OverviewInspector } from './modes/overview/OverviewInspector'
import { HeaderSearch } from './components/HeaderSearch'
import { ReportDetail } from './modes/report/ReportDetail'
import { ReportInspector } from './modes/report/ReportInspector'
import { ReportSidebar } from './modes/report/ReportSidebar'
import { RefineDetail } from './modes/refine/RefineDetail'
import { RefineSidebar } from './modes/refine/RefineSidebar'
import { buildCodeTree } from './lib/codeTree'
import { ClassifyDetail } from './modes/classify/ClassifyDetail'
import { ClassifySidebar } from './modes/classify/ClassifySidebar'
import { AnalyzeSidebar } from './analyze/AnalyzeSidebar'
import { AnalyzeInspector } from './analyze/AnalyzeInspector'
import { OrganizeDetail } from './modes/organize/OrganizeDetail'
import { OrganizeSidebar } from './modes/organize/OrganizeSidebar'
import { OrganizeInspector } from './modes/organize/OrganizeInspector'
import { wrapHighlightedTranscript } from './modes/code/transcript'
import { CodeDetail } from './modes/code/CodeDetail'
import { CodePickerPanel } from './components/CodePickerPanel'
import { ReferenceList } from './ReferenceList'
import { Landing } from './Landing'
import { deleteCode as libDeleteCode, descendantCodeIds, mergeCodeInto as libMergeCodeInto } from './lib/codeOperations'
import {
  deleteExcerpt as libDeleteExcerpt,
  removeCodeFromExcerpt as libRemoveCodeFromExcerpt,
  splitExcerpt as libSplitExcerpt,
} from './lib/excerptOperations'
import { deleteCase as libDeleteCase } from './lib/caseOperations'
import { deleteSource as libDeleteSource } from './lib/sourceOperations'
import { SourcesView } from './components/SourcesView'
import { AiSettingsPanel } from './components/AiSettingsPanel'
import { callAi } from './ai/client'
import { BACKUP_MIME, backupFilename, buildBackup, validateBackup } from './lib/backup'
import { deleteRecoverySnapshot, isLocalAheadOfRemote, readRecoverySnapshot } from './lib/localRecovery'
import type {
  Attribute,
  AttributeValue,
  Case,
  Code,
  Excerpt,
  Memo,
  ProjectData,
  ProjectRow,
  QueryResultSnapshot,
  SavedQuery,
  Source,
} from './lib/types'
import './App.css'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
// AnalyzePanel moved to src/analyze/analyzeViewState.ts
type MatrixColumnMode = 'case' | 'attribute'

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

type LineNumberingMode = 'paragraph' | 'fixed-width'

const DEFAULT_LINE_NUMBERING_MODE: LineNumberingMode = 'fixed-width'
const DEFAULT_LINE_NUMBERING_WIDTH = 80
const LINE_NUMBERING_WIDTH_MIN = 40
const LINE_NUMBERING_WIDTH_MAX = 160

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
    body: '',
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
  description: '',
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
  { id: 'overview', label: 'Overview', description: 'Project summary, project memo, and quick stats.', status: 'ready', icon: LayoutDashboard },
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

/**
 * Minimal RFC 4180-style CSV parser. Handles quoted fields, embedded commas,
 * embedded newlines, and "" escapes. Returns an array of rows (each a string[]).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1 }
        else { inQuotes = false }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { row.push(cell); cell = ''; continue }
    if (ch === '\r') continue
    if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += ch
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}




// buildCodeTree moved to src/lib/codeTree.ts
// descendantCodeIds moved to src/lib/codeOperations.ts

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

/**
 * Render a small slice of HTML to plain text that preserves block structure.
 * Headings get a bare line, bullets become "• item", tables become tab-
 * separated rows, and inline marks (bold/italic/links) flatten cleanly.
 * Implemented via a detached DOM + innerText so we don't reinvent rendering
 * rules. Input HTML is sanitized via DOMPurify before parsing.
 */
async function structuredTextFromHtml(html: string): Promise<string> {
  const DOMPurify = (await import('dompurify')).default
  const safe = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  const root = document.createElement('div')
  // safe HTML is already cleaned by DOMPurify; assign via DOMParser to keep
  // structure without a re-eval.
  const parsed = new DOMParser().parseFromString(`<div>${safe}</div>`, 'text/html')
  const inner = parsed.body.firstChild
  if (inner) root.appendChild(inner)

  root.querySelectorAll('ul > li').forEach((li) => {
    li.insertBefore(document.createTextNode('• '), li.firstChild)
  })
  root.querySelectorAll('ol > li').forEach((li, index) => {
    li.insertBefore(document.createTextNode(`${index + 1}. `), li.firstChild)
  })

  // innerText respects display: block boundaries with newlines, but a detached
  // element isn't laid out — append transiently off-screen to read it.
  document.body.appendChild(root)
  root.style.position = 'fixed'
  root.style.left = '-99999px'
  root.style.top = '0'
  root.style.whiteSpace = 'pre-wrap'
  const text = root.innerText
  document.body.removeChild(root)
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

async function readSourceFile(file: File): Promise<Pick<Source, 'content' | 'kind'>> {
  const lowered = file.name.toLowerCase()
  if (lowered.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser')
    const html = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })
    const content = await structuredTextFromHtml(html.value)
    return { content, kind: 'Transcript' }
  }

  if (lowered.endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist')
    // The default workerSrc points at a node-style URL that doesn't resolve in
    // bundled browsers. Vite + ?url gives us a stable asset URL.
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    const data = new Uint8Array(await file.arrayBuffer())
    const doc = await pdfjs.getDocument({ data }).promise
    const pages: string[] = []
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      pages.push(`--- Page ${pageNum} ---\n\n${text}`)
    }
    return { content: pages.join('\n\n'), kind: 'Document' }
  }

  return {
    content: await file.text(),
    kind: lowered.endsWith('.csv') ? 'Document' : 'Transcript',
  }
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const userId = session?.user?.id ?? null
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState('Student Access Study')
  const [description, setDescription] = useState('')
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([])
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')
  const [reportIncludes, setReportIncludes] = useState<ReportIncludes>(DEFAULT_REPORT_INCLUDES)
  const [querySnapshots, setQuerySnapshots] = useState<QueryResultSnapshot[]>([])
  const [activeView, setActiveView] = useState<WorkspaceView>('overview')
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

  const [lineNumberingMode, setLineNumberingMode] = useState<LineNumberingMode>(DEFAULT_LINE_NUMBERING_MODE)
  const [lineNumberingWidth, setLineNumberingWidth] = useState(DEFAULT_LINE_NUMBERING_WIDTH)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [selectionHint, setSelectionHint] = useState('Select text in the source, then click Code selection.')
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  const [hasLoadedRemoteProject, setHasLoadedRemoteProject] = useState(false)

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
    () => ({ description, activeSourceId, sources, cases, attributes, attributeValues, savedQueries, codes, memos, excerpts }),
    [description, activeSourceId, attributeValues, attributes, cases, codes, excerpts, memos, savedQueries, sources]
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
  const attributeValuesByAttribute = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const attributeValue of attributeValues) {
      const trimmed = attributeValue.value.trim()
      if (!trimmed) continue
      const existing = map.get(attributeValue.attributeId) ?? []
      if (!existing.includes(trimmed)) existing.push(trimmed)
      map.set(attributeValue.attributeId, existing)
    }
    for (const values of map.values()) values.sort()
    return map
  }, [attributeValues])
  const valuesForAttribute = useCallback((attributeId: string): string[] => {
    if (!attributeId) return []
    return attributeValuesByAttribute.get(attributeId) ?? []
  }, [attributeValuesByAttribute])

  const applyProject = useCallback(async (project: ProjectRow) => {
    setSaveStatus('Opening project...')
    const nextProject = await loadProject(project, supabase)

    setProjectId(project.id)
    setProjectTitle(project.title || 'Untitled project')
    setDescription(project.description ?? '')
    setLineNumberingMode((project.line_numbering_mode ?? DEFAULT_LINE_NUMBERING_MODE) as LineNumberingMode)
    setLineNumberingWidth(project.line_numbering_width ?? DEFAULT_LINE_NUMBERING_WIDTH)
    setActiveView('overview')
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
    setHasLoadedRemoteProject(true)
    setSaveStatus('Project open.')

    // Local-recovery prompt: if IndexedDB holds a snapshot newer than what
    // we just loaded from Supabase, the user has unsynced work from a prior
    // session (network loss, tab crash, browser update). Offer to restore.
    if (userId) {
      try {
        const snap = await readRecoverySnapshot(userId, project.id)
        if (snap && isLocalAheadOfRemote(snap, project.updated_at ?? null)) {
          const ageMin = Math.max(1, Math.round((Date.now() - Date.parse(snap.capturedAt)) / 60_000))
          const restore = window.confirm(
            `A local recovery copy of "${snap.projectTitle}" is newer than the remote version (saved ~${ageMin} min ago). Restore the local copy? Click Cancel to keep the remote version (the local copy will be discarded on the next save).`,
          )
          if (restore) {
            setActiveSourceId(snap.data.activeSourceId)
            setSources(snap.data.sources)
            setCases(snap.data.cases)
            setAttributes(snap.data.attributes)
            setAttributeValues(snap.data.attributeValues)
            setSavedQueries(snap.data.savedQueries)
            setCodes(snap.data.codes)
            setMemos(snap.data.memos)
            setExcerpts(snap.data.excerpts)
            setDescription(snap.data.description ?? '')
            setSaveStatus('Local copy restored. Next save will sync to Supabase.')
          } else {
            await deleteRecoverySnapshot(userId, project.id)
          }
        }
      } catch (error) {
        console.warn('Recovery snapshot check failed:', error)
      }
    }

    // Snapshots are independent of the JSON-on-project model: live in their own table.
    const { data: snaps, error: snapsError } = await supabase
      .from('fieldnote_query_results')
      .select('*')
      .eq('project_id', project.id)
      .order('captured_at', { ascending: false })
    if (snapsError) {
      console.warn('Could not load query snapshots:', snapsError)
      setQuerySnapshots([])
    } else {
      setQuerySnapshots((snaps ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        projectId: row.project_id as string,
        queryId: row.query_id as string,
        capturedAt: row.captured_at as string,
        label: (row.label as string) ?? '',
        note: (row.note as string) ?? '',
        resultKind: 'coded_excerpt',
        definition: row.definition as QueryResultSnapshot['definition'],
        results: row.results as QueryResultSnapshot['results'],
      })))
    }
  }, [userId])

  async function createProjectFromSeed(
    title: string,
    seed: ProjectData,
    settings?: { lineNumberingMode?: LineNumberingMode; lineNumberingWidth?: number; description?: string },
  ) {
    if (!session?.user || isCreatingProject) return
    setIsCreatingProject(true)
    setSaveStatus('Creating project...')

    const lnMode = settings?.lineNumberingMode ?? DEFAULT_LINE_NUMBERING_MODE
    const lnWidth = settings?.lineNumberingWidth ?? DEFAULT_LINE_NUMBERING_WIDTH
    const desc = settings?.description ?? seed.description ?? ''

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
          description: desc,
          active_source_id: seed.activeSourceId,
          source_title: seed.sources[0]?.title ?? '',
          transcript: seed.sources[0]?.content ?? '',
          memo: seed.memos[0]?.body ?? '',
          sources: seed.sources,
          codes: seed.codes,
          memos: seed.memos,
          excerpts: seed.excerpts,
          line_numbering_mode: lnMode,
          line_numbering_width: lnWidth,
        })
        .select('*')
        .single()

      if (error) throw error
      const nextProject = createdProject as ProjectRow
      await saveProject(nextProject.id, {
        title,
        description: desc,
        active_source_id: seed.activeSourceId,
        source_title: seed.sources[0]?.title ?? '',
        transcript: seed.sources[0]?.content ?? '',
        memo: seed.memos[0]?.body ?? '',
        sources: seed.sources,
        codes: seed.codes,
        memos: seed.memos,
        excerpts: seed.excerpts,
        cases: seed.cases,
        attributes: seed.attributes,
        attributeValues: seed.attributeValues,
        savedQueries: seed.savedQueries,
        line_numbering_mode: lnMode,
        line_numbering_width: lnWidth,
        projectData: { ...seed, description: desc },
      }, supabase)
      setProjectRows((current) => [nextProject, ...current])
      setNewProjectTitle('')
      await applyProject(nextProject)
    } catch (error) {
      setSaveStatus(errorMessage(error, 'Could not create project.'))
    } finally {
      setIsCreatingProject(false)
    }
  }

  async function createProject() {
    const title = newProjectTitle.trim() || 'Untitled research project'
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
    await createProjectFromSeed(title, blankSeed)
  }

  async function createSampleProject() {
    await createProjectFromSeed('Sample project', defaultProject)
  }

  async function deleteProject(projectIdToDelete: string) {
    const target = projectRows.find((row) => row.id === projectIdToDelete)
    const label = target?.title || 'this project'
    // Backup-first opportunity only applies to the active project (we can only
    // export what's currently loaded). For other projects, skip straight to confirm.
    if (projectIdToDelete === projectId) {
      if (!offerBackupBeforeRisky(`Delete "${label}"? Permanently removes the project and all its sources, codes, memos, excerpts, cases, attribute values, and saved queries.`)) return
    } else {
      const confirmed = window.confirm(
        `Delete "${label}"? This permanently removes the project and all its sources, codes, memos, excerpts, cases, and saved queries. This cannot be undone.`,
      )
      if (!confirmed) return
    }

    setSaveStatus('Deleting project...')
    try {
      const { error } = await supabase.from('fieldnote_projects').delete().eq('id', projectIdToDelete)
      if (error) throw error

      const remaining = projectRows.filter((row) => row.id !== projectIdToDelete)
      setProjectRows(remaining)

      if (projectIdToDelete === projectId) {
        if (remaining.length > 0) {
          await applyProject(remaining[0])
        } else {
          setHasLoadedRemoteProject(false)
          setProjectId(null)
          setDescription('')
          setSaveStatus('Create your first project.')
        }
      } else {
        setSaveStatus('Project deleted.')
      }
    } catch (error) {
      setSaveStatus(errorMessage(error as Error, 'Could not delete project.'))
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
    if (!userId) {
      queueMicrotask(() => {
        setHasLoadedRemoteProject(false)
        setProjectId(null)
        setDescription('')
        setProjectRows([])
        setSaveStatus('Sign in to sync.')
      })
      return
    }

    let isCurrent = true
    queueMicrotask(() => {
      setHasLoadedRemoteProject(false)
      setProjectId(null)
      setDescription('')
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
        if (projects.length > 0) {
          void applyProject(projects[0])
        } else {
          setSaveStatus('Create your first project.')
        }
      })
      .catch((error: Error) => {
        if (!isCurrent) return
        setSaveStatus(errorMessage(error, 'Could not load projects.'))
      })

    return () => {
      isCurrent = false
    }
  }, [userId, applyProject])

  const persistencePayload = useMemo<SavePayload | null>(() => {
    if (!projectId) return null
    return {
      title: projectTitle,
      description,
      active_source_id: activeSourceId,
      source_title: activeSource?.title ?? '',
      transcript: activeSource?.content ?? '',
      memo: projectMemo?.body ?? '',
      sources,
      codes,
      memos,
      excerpts,
      cases,
      attributes,
      attributeValues,
      savedQueries,
      line_numbering_mode: lineNumberingMode,
      line_numbering_width: lineNumberingWidth,
      projectData,
    }
  }, [projectId, projectTitle, description, activeSourceId, activeSource, projectMemo, sources, codes, memos, excerpts, cases, attributes, attributeValues, savedQueries, lineNumberingMode, lineNumberingWidth, projectData])

  useAutosave({
    enabled: Boolean(session?.user && projectId && hasLoadedRemoteProject),
    projectId,
    payload: persistencePayload,
    supabase,
    userId: session?.user?.id ?? null,
    projectRow: projectId
      ? (() => {
          const row = projectRows.find((p) => p.id === projectId)
          return row ? { id: row.id, title: row.title, updated_at: row.updated_at ?? null } : null
        })()
      : null,
    setSaveStatus,
    onSaved: (savedPayload) => {
      setProjectRows((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                title: savedPayload.title,
                active_source_id: savedPayload.active_source_id,
                source_title: savedPayload.source_title,
                transcript: savedPayload.transcript,
                memo: savedPayload.memo,
                sources: savedPayload.sources,
                codes: savedPayload.codes,
                memos: savedPayload.memos,
                excerpts: savedPayload.excerpts,
                line_numbering_mode: savedPayload.line_numbering_mode,
                line_numbering_width: savedPayload.line_numbering_width,
              }
            : project
        )
      )
      // The IDB recovery snapshot is now written eagerly inside useAutosave
      // (writeRecoveryDraft before the network attempt; markRecoverySnapshotSynced
      // after success). Keeping it here would double-write; the hook owns it.
    },
  })

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

  const reportModelFull = useMemo(
    () =>
      buildReport({
        projectTitle,
        sources,
        codes,
        excerpts,
        cases,
        attributes,
        attributeValues,
        memos,
        savedQueries,
        snapshots: querySnapshots,
      }),
    [projectTitle, sources, codes, excerpts, cases, attributes, attributeValues, memos, savedQueries, querySnapshots],
  )
  const reportModel = useMemo(
    () => applyReportIncludes(reportModelFull, reportIncludes),
    [reportModelFull, reportIncludes],
  )

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

  // Drill-down handlers — every number opens evidence. Each one merges
  // the clicked dimension into the query state, clears conflicting
  // filters in that dimension only, and jumps to the Find-excerpts view
  // so the user lands on the actual excerpts behind the number.
  function handleMatrixCellSelect(codeId: string, colId: string) {
    setQueryCodeId(codeId)
    if (matrixColumnMode === 'case') {
      setQueryCaseId(colId)
    } else if (matrixAttributeId) {
      const value = colId.includes(':') ? colId.split(':').slice(1).join(':') : colId
      setQueryAttributes((prev) => {
        const filtered = prev.filter((f) => f.attributeId !== matrixAttributeId)
        return [...filtered, { attributeId: matrixAttributeId, value }]
      })
    }
    setAnalyzePanel('query')
  }

  function handleWordSelect(word: string) {
    setQueryText(word)
    setAnalyzePanel('query')
  }

  // Pair drill-down: the query model carries a single "with this code"
  // filter, so we land on excerpts coded with the first code in the
  // pair. The user can refine to the intersection from the result list.
  // True multi-code AND filtering is a follow-up that needs a query-
  // schema change; tracked in the Analyze workbench plan.
  function handlePairSelect(codeId: string) {
    setQueryCodeId(codeId)
    setAnalyzePanel('query')
  }

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

    if (codes.filter((c) => c.id !== activeCode.id).length === 0) {
      setSelectionHint('Keep at least one code in the codebook.')
      return
    }

    const next = libDeleteCode({ codes, excerpts, memos, codeId: activeCode.id })
    setCodes(next.codes)
    setExcerpts(next.excerpts)
    setMemos(next.memos)
    setSelectedCodeIds((current) => {
      const filtered = current.filter((codeId) => codeId !== activeCode.id)
      return filtered.length ? filtered : [next.codes[0].id]
    })
    setActiveCodeId(next.codes[0].id)
  }

  function mergeActiveCodeIntoTarget(targetCodeId: string) {
    const targetCode = codes.find((code) => code.id === targetCodeId)
    if (!activeCode || !targetCode || activeCode.id === targetCode.id) return
    if (descendantCodeIds(codes, activeCode.id).includes(targetCode.id)) return

    const references = excerpts.filter((excerpt) => excerpt.codeIds.includes(activeCode.id)).length
    if (!offerBackupBeforeRisky(
      `Merge "${activeCode.name}" into "${targetCode.name}"? ${references} coded reference${references === 1 ? '' : 's'} will move to "${targetCode.name}", and "${activeCode.name}" will be removed from the codebook.`
    )) return

    const next = libMergeCodeInto({
      codes,
      excerpts,
      memos,
      fromCodeId: activeCode.id,
      intoCodeId: targetCode.id,
    })
    setCodes(next.codes)
    setExcerpts(next.excerpts)
    setMemos(next.memos)
    setSelectedCodeIds((current) =>
      Array.from(new Set(current.map((codeId) => (codeId === activeCode.id ? targetCode.id : codeId)))),
    )
    setActiveCodeId(targetCode.id)
    setSelectionHint(`Merged "${activeCode.name}" into "${targetCode.name}".`)
  }

  function toggleSelectedCode(codeId: string) {
    setSelectedCodeIds((current) => {
      if (current.includes(codeId)) return current.length === 1 ? current : current.filter((id) => id !== codeId)
      return [...current, codeId]
    })
  }

  function splitCodeInto(sourceCodeId: string, excerptIds: string[], newCodeName: string, parentCodeId?: string) {
    const trimmed = newCodeName.trim()
    if (!trimmed || excerptIds.length === 0) return
    const newCode = buildNewCode(trimmed, parentCodeId)
    setCodes((current) => [...current, newCode])
    setExcerpts((current) =>
      current.map((excerpt) => {
        if (!excerptIds.includes(excerpt.id)) return excerpt
        const nextCodeIds = Array.from(new Set([
          ...excerpt.codeIds.filter((id) => id !== sourceCodeId),
          newCode.id,
        ]))
        return { ...excerpt, codeIds: nextCodeIds }
      }),
    )
    setSelectionHint(`Split ${excerptIds.length} reference${excerptIds.length === 1 ? '' : 's'} into new code "${trimmed}".`)
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
    if (view === 'refine') setActiveCodeId(activeCodeId || codes[0]?.id || '')
  }

  function selectActiveSource(sourceId: string) {
    setActiveSourceId(sourceId)
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

  async function handleSuggestCodes(selectedText: string) {
    const result = await callAi({ kind: 'suggest_codes', inputText: selectedText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const response = result.response as { suggestions: Array<{ name: string; description: string }> }
    return { ok: true as const, suggestions: response.suggestions }
  }

  async function handleDraftDescription(codeName: string, references: Array<{ sourceTitle: string; text: string }>) {
    const refLines = references.map((r) => `[${r.sourceTitle}] ${r.text}`).join('\n')
    const inputText = `Code name: ${codeName}\n\nReferences:\n${refLines}`
    const result = await callAi({ kind: 'draft_description', inputText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const response = result.response as { description: string }
    return { ok: true as const, description: response.description }
  }

  async function handleSummarizeSource(source: { title: string; content: string }) {
    const inputText = `Source: ${source.title}\n\n${source.content}`
    const result = await callAi({ kind: 'summarize_source', inputText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const response = result.response as { summary: string }
    return { ok: true as const, summary: response.summary }
  }

  async function handleDraftProjectMemo() {
    const lines: string[] = []
    for (const snap of querySnapshots) {
      const queryName = savedQueries.find((q) => q.id === snap.queryId)?.name ?? 'Saved query'
      lines.push(`Snapshot: "${snap.label || queryName}" (${snap.results.excerpts.length} excerpts)`)
      for (const e of snap.results.excerpts.slice(0, 5)) {
        lines.push(`- ${e.sourceTitle}: ${e.text.slice(0, 200)}`)
      }
      lines.push('')
    }
    const inputText = lines.join('\n')
    const result = await callAi({ kind: 'draft_memo', inputText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const response = result.response as { memo: string }
    return { ok: true as const, memo: response.memo }
  }

  function updateSource(sourceId: string, patch: Partial<Source>) {
    setSources((current) => current.map((source) => (source.id === sourceId ? { ...source, ...patch } : source)))
    if (patch.title) {
      setExcerpts((current) => current.map((excerpt) => (excerpt.sourceId === sourceId ? { ...excerpt, sourceTitle: patch.title ?? excerpt.sourceTitle } : excerpt)))
    }
  }

  function renameFolder(oldName: string, newName: string) {
    if (oldName === 'Internals' || !newName.trim()) return
    if (newName === oldName) return
    setSources((current) => current.map((source) => (source.folder === oldName ? { ...source, folder: newName } : source)))
  }

  function deleteFolder(name: string) {
    if (name === 'Internals') return
    const affected = sources.filter((source) => source.folder === name).length
    const message = affected === 0
      ? `Delete the empty folder "${name}"?`
      : `Delete "${name}"? Its ${affected} source${affected === 1 ? '' : 's'} will move to Internals.`
    if (!window.confirm(message)) return
    setSources((current) => current.map((source) => (source.folder === name ? { ...source, folder: 'Internals' } : source)))
  }

  function updateProjectTitle(title: string) {
    setProjectTitle(title)
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
    const next = libDeleteCase({ cases, attributeValues, sources, caseId })
    setCases(next.cases)
    setAttributeValues(next.attributeValues)
    setSources(next.sources)
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

  function importAttributesCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    file.text().then((text) => {
      const rows = parseCsv(text)
      if (rows.length < 2) {
        setSelectionHint('CSV needs a header row plus at least one case row.')
        return
      }
      const header = rows[0]
      const attrNames = header.slice(1).map((h) => h.trim()).filter(Boolean)
      if (attrNames.length === 0) {
        setSelectionHint('CSV needs at least one attribute column after the case-name column.')
        return
      }

      const findOrCreateAttribute = (currentAttrs: Attribute[], name: string, freshIds: Map<string, string>) => {
        const trimmed = name.trim()
        if (!trimmed) return null
        const existing = currentAttrs.find((a) => a.name.toLowerCase() === trimmed.toLowerCase())
        if (existing) return existing.id
        const cached = freshIds.get(trimmed.toLowerCase())
        if (cached) return cached
        const id = `attribute-${Date.now()}-${freshIds.size}`
        freshIds.set(trimmed.toLowerCase(), id)
        return id
      }

      const newAttrIds = new Map<string, string>()
      const attrIdByHeaderIndex: Array<string | null> = attrNames.map((name) =>
        findOrCreateAttribute(attributes, name, newAttrIds),
      )

      const newAttrs: Attribute[] = []
      newAttrIds.forEach((id, lowerName) => {
        const original = attrNames.find((n) => n.toLowerCase() === lowerName)!
        newAttrs.push({ id, name: original, valueType: 'text' })
      })

      let updated = 0
      let skipped = 0
      const updatesByPair = new Map<string, string>() // `${caseId}::${attributeId}` -> value

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const caseName = row[0]?.trim()
        if (!caseName) {
          skipped += 1
          continue
        }
        const matchedCase = cases.find((c) => c.name.trim().toLowerCase() === caseName.toLowerCase())
        if (!matchedCase) {
          skipped += 1
          continue
        }
        for (let col = 0; col < attrNames.length; col++) {
          const attrId = attrIdByHeaderIndex[col]
          if (!attrId) continue
          const value = (row[col + 1] ?? '').trim()
          if (!value) continue
          updatesByPair.set(`${matchedCase.id}::${attrId}`, value)
          updated += 1
        }
      }

      if (newAttrs.length) {
        setAttributes((current) => [...current, ...newAttrs])
      }
      if (updatesByPair.size) {
        setAttributeValues((current) => {
          const next = current.map((v) => {
            const key = `${v.caseId}::${v.attributeId}`
            if (updatesByPair.has(key)) {
              const value = updatesByPair.get(key)!
              updatesByPair.delete(key)
              return { ...v, value }
            }
            return v
          })
          updatesByPair.forEach((value, key) => {
            const [caseId, attributeId] = key.split('::')
            next.push({ caseId, attributeId, value })
          })
          return next
        })
      }

      const summary = `Imported ${updated} attribute value${updated === 1 ? '' : 's'}` +
        (newAttrs.length ? `, created ${newAttrs.length} new attribute${newAttrs.length === 1 ? '' : 's'}` : '') +
        (skipped > 0 ? `, skipped ${skipped} row${skipped === 1 ? '' : 's'} (no matching case)` : '') +
        '.'
      setSelectionHint(summary)
    }).catch((error) => {
      setSelectionHint(`Could not read CSV: ${error instanceof Error ? error.message : String(error)}`)
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

  async function captureQuerySnapshot() {
    if (!projectId || !activeSavedQueryId || !activeSavedQuery) {
      setSelectionHint('Save the query first, then pin a snapshot.')
      return
    }
    if (analyzePanel !== 'query') {
      setSelectionHint('Snapshots can only be pinned from the Query results panel right now.')
      return
    }
    const label = window.prompt(`Optional label for this snapshot (e.g., "Before recoding pass 2"):`, '') ?? ''
    const payload = {
      project_id: projectId,
      query_id: activeSavedQueryId,
      label: label.trim(),
      result_kind: 'coded_excerpt' as const,
      definition: currentQueryDefinition,
      results: {
        excerpts: analyzeResults.map((excerpt) => ({
          id: excerpt.id,
          sourceId: excerpt.sourceId,
          sourceTitle: excerpt.sourceTitle,
          codeIds: excerpt.codeIds,
          text: excerpt.text,
          note: excerpt.note,
        })),
      },
    }
    setSaveStatus('Capturing snapshot...')
    const { data, error } = await supabase
      .from('fieldnote_query_results')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      setSaveStatus(errorMessage(error, 'Could not capture snapshot.'))
      return
    }
    const row = data as Record<string, unknown>
    const snapshot: QueryResultSnapshot = {
      id: row.id as string,
      projectId: row.project_id as string,
      queryId: row.query_id as string,
      capturedAt: row.captured_at as string,
      label: (row.label as string) ?? '',
      note: (row.note as string) ?? '',
      resultKind: 'coded_excerpt',
      definition: row.definition as QueryResultSnapshot['definition'],
      results: row.results as QueryResultSnapshot['results'],
    }
    setQuerySnapshots((current) => [snapshot, ...current])
    setSaveStatus(`Snapshot captured (${payload.results.excerpts.length} excerpts).`)
  }

  // Update the interpretation note attached to a snapshot. Optimistic
  // local update + best-effort remote write — if the network drops, the
  // snapshot list still reflects the user's edit and the next save retry
  // catches up.
  async function updateSnapshotNote(snapshotId: string, note: string) {
    setQuerySnapshots((current) =>
      current.map((s) => (s.id === snapshotId ? { ...s, note } : s)),
    )
    const { error } = await supabase
      .from('fieldnote_query_results')
      .update({ note })
      .eq('id', snapshotId)
    if (error) {
      setSaveStatus(errorMessage(error, 'Could not save snapshot note.'))
    }
  }

  async function deleteQuerySnapshot(snapshotId: string) {
    const snap = querySnapshots.find((s) => s.id === snapshotId)
    const label = snap?.label || (snap ? new Date(snap.capturedAt).toLocaleString() : 'this snapshot')
    if (!window.confirm(`Delete snapshot "${label}"? This cannot be undone.`)) return
    const { error } = await supabase
      .from('fieldnote_query_results')
      .delete()
      .eq('id', snapshotId)
    if (error) {
      setSaveStatus(errorMessage(error, 'Could not delete snapshot.'))
      return
    }
    setQuerySnapshots((current) => current.filter((s) => s.id !== snapshotId))
  }

  function downloadSnapshotCsv(snapshotId: string) {
    const snap = querySnapshots.find((s) => s.id === snapshotId)
    if (!snap) return
    const queryName = savedQueries.find((q) => q.id === snap.queryId)?.name ?? 'Saved query'
    const dateLabel = new Date(snap.capturedAt).toISOString().slice(0, 10)
    const rows: string[][] = [
      ['Project', 'Saved query', 'Snapshot label', 'Captured at', 'Source', 'Codes', 'Excerpt', 'Note'],
      ...snap.results.excerpts.map((excerpt) => {
        const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))
        return [
          projectTitle,
          queryName,
          snap.label,
          snap.capturedAt,
          excerpt.sourceTitle,
          excerptCodes.map((code) => code.name).join('; '),
          excerpt.text,
          excerpt.note,
        ]
      }),
    ]
    downloadInFormat(rows, `fieldnote-snapshot-${slugId(queryName)}-${dateLabel}`, 'Snapshot')
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
  }

  function deleteActiveSource() {
    const shouldDelete = window.confirm(`Delete "${activeSource.title}" and its linked excerpts and source memos? This cannot be undone.`)
    if (!shouldDelete) return

    const next = libDeleteSource({ sources, excerpts, memos, sourceId: activeSource.id })
    setSources(next.sources)
    setExcerpts(next.excerpts)
    setMemos(next.memos)
    const nextSource = sources.find((source) => source.id !== activeSource.id)
    if (nextSource) selectActiveSource(nextSource.id)
  }

  function updateMemo(memoId: string, patch: Partial<Memo>) {
    setMemos((current) => current.map((memo) => (memo.id === memoId ? { ...memo, ...patch } : memo)))
  }

  function updateExcerptNote(id: string, note: string) {
    setExcerpts((current) => current.map((excerpt) => (excerpt.id === id ? { ...excerpt, note } : excerpt)))
  }

  function retagOrphan(excerptId: string, codeId: string) {
    setExcerpts((current) =>
      current.map((excerpt) =>
        excerpt.id === excerptId ? { ...excerpt, codeIds: [codeId] } : excerpt,
      ),
    )
  }

  function deleteExcerpt(id: string) {
    const excerpt = excerpts.find((item) => item.id === id)
    if (!excerpt) return

    const shouldDelete = window.confirm('Delete this coded reference? This removes the excerpt from all codes.')
    if (!shouldDelete) return

    setExcerpts((current) => libDeleteExcerpt(current, id))
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

    setExcerpts((current) => libRemoveCodeFromExcerpt({ excerpts: current, excerptId, codeId }))
  }

  function splitExcerpt(excerptId: string) {
    const selectedText = window.getSelection()?.toString().trim() ?? ''
    const result = libSplitExcerpt({
      excerpts,
      excerptId,
      selectedText,
      newExcerptId: `excerpt-${Date.now()}`,
    })
    if (!result.ok) {
      if (result.reason === 'selection-not-in-text') {
        setSelectionHint(
          selectedText
            ? 'The selected text must be inside the coded reference you are splitting.'
            : 'Select part of the coded reference text first, then click Split.',
        )
      } else if (result.reason === 'selection-is-whole-text') {
        setSelectionHint('Split needs a smaller selection, not the whole coded reference.')
      }
      return
    }
    setExcerpts(result.excerpts)
    window.getSelection()?.removeAllRanges()
    setSelectionHint('Split the selected text into a new coded reference.')
  }

  function updateProjectMemo(body: string) {
    const existing = memos.find((memo) => memo.linkedType === 'project')
    if (existing) {
      updateMemo(existing.id, { body })
      return
    }
    const memo: Memo = {
      id: `memo-${Date.now()}`,
      title: 'Project memo',
      linkedType: 'project',
      body,
    }
    setMemos((current) => [memo, ...current])
    setActiveMemoId(memo.id)
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

    Promise.all(
      files.map(async (file, index) => {
        const sourceFile = await readSourceFile(file)
        return {
          id: `source-${Date.now()}-${index}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          kind: sourceFile.kind,
          folder: 'Internals',
          content: sourceFile.content || '[No readable text found in this file.]',
          importedAt: new Date().toISOString(),
        }
      })
    ).then((newSources) => {
      setSources((current) => [...newSources, ...current])
      selectActiveSource(newSources[0].id)
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

    downloadInFormat(rows, 'fieldnote-coded-excerpts', 'Coded excerpts')
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

    downloadInFormat(rows, 'fieldnote-case-sheet', 'Case sheet')
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

    downloadInFormat(rows, 'fieldnote-coded-excerpts-by-case', 'Excerpts by case')
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

    downloadInFormat(rows, 'fieldnote-query-results', 'Query results')
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

    downloadInFormat(rows, 'fieldnote-matrix-coding', 'Matrix coding')
  }

  function exportWordFrequencyCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = [
      ['Project', 'Word', 'Count', 'Excerpt count', 'Active filters'],
      ...wordFrequencyRows.map((row) => [projectTitle, row.word, String(row.count), String(row.excerptCount), activeQueryFilters.join('; ')]),
    ]

    downloadInFormat(rows, 'fieldnote-word-frequency', 'Word frequency')
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

    downloadInFormat(rows, 'fieldnote-code-cooccurrence', 'Co-occurrence')
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
      downloadInFormat(rows, 'fieldnote-crosstabs', 'Crosstabs')
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

    downloadInFormat(rows, 'fieldnote-codebook', 'Codebook')
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

    downloadInFormat(rows, 'fieldnote-memos', 'Memos')
  }

  async function downloadReportPdf() {
    try {
      await exportReportPdf(reportModel, projectTitle)
      setSaveStatus('PDF exported.')
    } catch (error) {
      console.error('Could not export PDF:', error)
      setSaveStatus(errorMessage(error, 'Could not export PDF.'))
    }
  }

  async function downloadReportDocx() {
    try {
      await exportReportDocx(reportModel, projectTitle)
      setSaveStatus('Word report exported.')
    } catch (error) {
      console.error('Could not export Word report:', error)
      setSaveStatus(errorMessage(error, 'Could not export Word report.'))
    }
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

  async function downloadXlsx(rows: string[][], filename: string, sheetName = 'Sheet1') {
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
    XLSX.writeFile(book, filename)
  }

  async function importProjectBackup(file: File) {
    if (!session?.user) return
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch (error) {
      setSaveStatus(`Could not read backup: ${error instanceof Error ? error.message : 'invalid JSON'}.`)
      return
    }
    const validation = validateBackup(parsed)
    if (!validation.ok) {
      setSaveStatus(`Backup invalid: ${validation.error}`)
      return
    }
    const { backup } = validation
    const seed: ProjectData = {
      activeSourceId: backup.project.activeSourceId || backup.sources[0]?.id || '',
      description: backup.project.description ?? '',
      sources: backup.sources,
      cases: backup.cases,
      attributes: backup.attributes,
      attributeValues: backup.attributeValues,
      savedQueries: backup.savedQueries,
      codes: backup.codes,
      memos: backup.memos,
      excerpts: backup.excerpts,
    }
    const restoredTitle = `${backup.project.title} (restored)`
    await createProjectFromSeed(restoredTitle, seed, {
      lineNumberingMode: backup.project.lineNumberingMode,
      lineNumberingWidth: backup.project.lineNumberingWidth,
      description: backup.project.description,
    })
  }

  /**
   * Offer the user a chance to download a `.fieldnote.json` backup
   * before a risky/destructive action. Two-step:
   *   1) "Download a backup first?" [OK = download, then proceed]
   *      [Cancel = skip and go to step 2]
   *   2) "Proceed without a backup?" [OK = proceed] [Cancel = abort]
   * Returns true when the caller should proceed, false when the user
   * cancelled outright.
   */
  function offerBackupBeforeRisky(actionDescription: string): boolean {
    if (!projectId) return true // no project to back up
    const wantsBackup = window.confirm(
      `${actionDescription}\n\nThis is destructive. Download a .fieldnote.json backup first? (Strongly recommended.)\n\nOK = download backup, then continue. Cancel = skip the backup.`,
    )
    if (wantsBackup) {
      exportProjectBackup()
      return true
    }
    return window.confirm(`Proceed without a backup? OK = continue. Cancel = abort the whole operation.`)
  }

  function exportProjectBackup() {
    if (!projectId) return
    const projectRow = projectRows.find((row) => row.id === projectId)
    if (!projectRow) return
    const backup = buildBackup({ projectRow, data: projectData })
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: BACKUP_MIME })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = backupFilename(projectRow.title)
    link.click()
    URL.revokeObjectURL(url)
    setSaveStatus('Backup downloaded.')
  }

  function downloadInFormat(rows: string[][], baseName: string, sheetName?: string) {
    if (exportFormat === 'xlsx') {
      void downloadXlsx(rows, `${baseName}.xlsx`, sheetName ?? 'Sheet1')
    } else {
      downloadCsv(rows, `${baseName}.csv`)
    }
  }

  if (!session) {
    return <Landing />
  }

  return (
    <>
    <div className="screen-too-narrow" role="alert">
      <div className="screen-too-narrow-card">
        <h1>Fieldnote needs a wider screen</h1>
        <p>Qualitative coding works best on a laptop or desktop. Open this page in a browser window at least 1024 pixels wide.</p>
      </div>
    </div>
    <main className="app-shell" data-shell="new" data-view={activeView}>
      <header className="app-header">
        <div className="app-header-left">
          <div className="brand-block">
            <div className="brand-mark">F</div>
            <div>
              <p className="eyebrow">Qualitative workspace</p>
              <h1>Fieldnote</h1>
            </div>
          </div>

        </div>

        <nav className="app-header-modes" aria-label="Research modes">
          {modeItems.map((mode) => {
            const Icon = mode.icon
            const isDisabled = !projectId && mode.id !== 'overview'
            return (
              <button
                key={mode.id}
                className={activeView === mode.id ? 'active' : ''}
                type="button"
                title={`${mode.label} — ${mode.description}`}
                disabled={isDisabled}
                onClick={() => selectView(mode.id)}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{mode.label}</span>
              </button>
            )
          })}
        </nav>

        {projectId && (
          <HeaderSearch
            sources={sources}
            codes={codes}
            excerpts={excerpts}
            cases={cases}
            memos={memos}
            onOpenSource={(id) => { selectActiveSource(id); setActiveView('code') }}
            onOpenCode={(id) => { setActiveCodeId(id); setActiveView('refine') }}
            onOpenCase={(id) => {
              const targetCase = cases.find((c) => c.id === id)
              if (targetCase?.sourceIds[0]) selectActiveSource(targetCase.sourceIds[0])
              setActiveView('classify')
            }}
            onOpenMemo={(id) => { setActiveMemoId(id) }}
            onOpenExcerpt={(sourceId) => { selectActiveSource(sourceId); setActiveView('code') }}
          />
        )}

        <div className="header-tools">
          <div
            className={`sync-box toolbar-status${/save failed|could not|error|invalid/i.test(saveStatus) ? ' is-error' : ''}${saveStatus === 'Saving...' ? ' is-saving' : ''}`}
            aria-live="polite"
          >
            <Cloud size={14} aria-hidden="true" />
            <span>{saveStatus}</span>
          </div>
          {projectId && (
            <button
              type="button"
              className="header-icon-button"
              onClick={signOut}
              aria-label="Sign out"
              title={`Sign out (${session.user.email})`}
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <aside
        className="workspace-sidebar"
        aria-label="Workspace sidebar"
      >
        {activeView === 'overview' && (
          <OverviewSidebar
            activeProjectId={projectId}
            projects={projectRows}
            newProjectTitle={newProjectTitle}
            isCreatingProject={isCreatingProject}
            onSelectProject={(project) => void applyProject(project)}
            onNewProjectTitleChange={setNewProjectTitle}
            onCreateProject={() => void createProject()}
            onCreateSampleProject={() => void createSampleProject()}
            onDeleteProject={(id) => void deleteProject(id)}
            onImportBackup={(file) => void importProjectBackup(file)}
          />
        )}
        {activeView === 'organize' && (
          <OrganizeSidebar
            activeSources={activeSources}
            archivedSources={archivedSources}
            activeSourceId={activeSourceId}
            onSelectSource={(id) => {
              selectActiveSource(id)
            }}
            importTranscript={importTranscript}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
          />
        )}

        {activeView !== 'organize' && (
        <section className="list-view" aria-label="Objects">
          {activeView === 'report' && (
            <ReportSidebar
              reportIncludes={reportIncludes}
              onReportIncludesChange={setReportIncludes}
              exportFormat={exportFormat}
              onExportFormatChange={setExportFormat}
              exportCsv={exportCsv}
              exportCodebookCsv={exportCodebookCsv}
              exportCaseSheetCsv={exportCaseSheetCsv}
              exportCaseExcerptCsv={exportCaseExcerptCsv}
              exportAnalyzeCsv={exportAnalyzeCsv}
              exportMemosCsv={exportMemosCsv}
            />
          )}
          {activeView !== 'report' && (
            <ListView
              activeView={activeView}
              activeSourceId={activeSource.id}
              activeCodeId={activeCode.id}
              sources={activeSources}
              cases={cases}
              savedQueries={savedQueries}
              activeSavedQueryId={activeSavedQueryId}
              analyzePanel={analyzePanel}
              codes={codes}
              excerpts={excerpts}
              onSelectSource={(id) => {
                selectActiveSource(id)
                if (activeView === 'classify') return
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
              onOpenCrosstab={() => setAnalyzePanel('crosstab')}
              onReparentCode={updateCodeParent}
            />
          )}
        </section>
        )}

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
            {activeView === 'report' && (
              <>
                <button
                  type="button"
                  className="primary-button toolbar-code-action"
                  onClick={() => void downloadReportPdf()}
                >
                  <Download size={18} aria-hidden="true" />
                  Export PDF
                </button>
                <button
                  type="button"
                  className="primary-button toolbar-code-action"
                  onClick={() => void downloadReportDocx()}
                >
                  <FileText size={18} aria-hidden="true" />
                  Export Word
                </button>
              </>
            )}
          </div>
        </header>

        {!projectId && projectRows.length === 0 && (
          <article className="overview-empty-state">
            <h2>Welcome to Fieldnote</h2>
            <p>Explore the sample, or start fresh.</p>
            <div className="overview-empty-options">
              <section className="overview-empty-option">
                <h3>Try a sample project</h3>
                <p>A small set of seeded interviews, codes, and a memo so you can poke around.</p>
                <button type="button" onClick={() => void createSampleProject()} disabled={isCreatingProject}>
                  Open sample project
                </button>
              </section>
              <section className="overview-empty-option">
                <h3>Create a blank project</h3>
                <p>An empty project. Import your own sources to begin.</p>
                <div className="overview-empty-create">
                  <input
                    value={newProjectTitle}
                    placeholder="Project title"
                    aria-label="Project title"
                    onChange={(event) => setNewProjectTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void createProject()
                    }}
                  />
                  <button type="button" onClick={() => void createProject()} disabled={isCreatingProject}>
                    <Plus size={16} aria-hidden="true" />
                    Create blank project
                  </button>
                </div>
              </section>
            </div>
          </article>
        )}

        {projectId && activeView === 'overview' && (
          <OverviewMode
            title={projectTitle}
            description={description}
            sources={sources}
            codes={codes}
            excerpts={excerpts}
            projectMemo={memos.find((memo) => memo.linkedType === 'project')}
            userId={session?.user?.id ?? null}
            projectId={projectId}
            snapshotsCount={querySnapshots.length}
            onExportBackup={exportProjectBackup}
            onTitleChange={setProjectTitle}
            onDescriptionChange={setDescription}
            onProjectMemoChange={updateProjectMemo}
            onDraftProjectMemo={handleDraftProjectMemo}
            onRestoreVersion={(version) => {
              setActiveSourceId(version.data.activeSourceId)
              setSources(version.data.sources)
              setCases(version.data.cases)
              setAttributes(version.data.attributes)
              setAttributeValues(version.data.attributeValues)
              setSavedQueries(version.data.savedQueries)
              setCodes(version.data.codes)
              setMemos(version.data.memos)
              setExcerpts(version.data.excerpts)
              setDescription(version.data.description ?? '')
              setSaveStatus(`Restored local version from ${version.dateUtc}. Saving to Supabase...`)
            }}
          />
        )}

        {projectId && activeView === 'organize' && (
          <OrganizeDetail
            sources={activeSources}
            activeSource={activeSource}
            excerpts={excerpts}
            memos={memos}
            importTranscript={importTranscript}
            selectActiveSource={selectActiveSource}
          />
        )}

        {projectId && activeView === 'code' && (
          <CodeDetail
            key={activeSource.id}
            activeSource={activeSource}
            selectedCodeNames={selectedCodeNames}
            selectedCodes={selectedCodes}
            selectedCodeIds={selectedCodeIds}
            sortedCodes={sortedCodes}
            highlightedTranscriptLines={highlightedTranscriptLines}
            readerWordCount={readerWordCount}
            readerRefCount={readerRefCount}
            lineNumberingMode={lineNumberingMode}
            lineNumberingWidth={lineNumberingWidth}
            selectionHint={selectionHint}
            setCodes={setCodes}
            setSelectedCodeIds={setSelectedCodeIds}
            setActiveCodeId={setActiveCodeId}
            setSelectionHint={setSelectionHint}
            toggleSelectedCode={toggleSelectedCode}
            codeSelection={codeSelection}
            applyCodesToText={applyCodesToText}
            buildNewCode={buildNewCode}
            onSuggestCodes={handleSuggestCodes}
          />
        )}

        {projectId && activeView === 'refine' && (
          <RefineDetail
            activeCode={activeCode}
            codes={codes}
            codeExcerpts={codeExcerpts}
            allExcerpts={excerpts}
            parentCodeOptions={parentCodeOptions}
            activeCodeParent={activeCodeParent}
            activeCodeChildren={activeCodeChildren}
            updateCode={updateCode}
            updateCodeParent={updateCodeParent}
            mergeActiveCodeIntoTarget={mergeActiveCodeIntoTarget}
            deleteActiveCode={deleteActiveCode}
            updateExcerptNote={updateExcerptNote}
            deleteExcerpt={deleteExcerpt}
            removeCodeFromExcerpt={removeCodeFromExcerpt}
            splitExcerpt={splitExcerpt}
            splitCodeInto={splitCodeInto}
            onSelectCode={(id) => setActiveCodeId(id)}
            retagOrphan={retagOrphan}
            onDraftDescription={handleDraftDescription}
          />
        )}

        {projectId && activeView === 'classify' && (
          <ClassifyDetail
            cases={cases}
            sources={sources}
            activeSource={activeSource}
            attributes={attributes}
            attributeValues={attributeValues}
            newAttributeName={newAttributeName}
            caseGridTemplate={caseGridTemplate}
            setNewAttributeName={setNewAttributeName}
            createCasesFromSources={createCasesFromSources}
            addAttribute={addAttribute}
            importAttributesCsv={importAttributesCsv}
            selectActiveSource={selectActiveSource}
            assignSourceToCase={assignSourceToCase}
            updateCase={updateCase}
            updateAttributeValue={updateAttributeValue}
            deleteCase={deleteCase}
          />
        )}

        {projectId && activeView === 'analyze' && (
          <article className="detail-card analyze-surface">
            <div className="analyze-tabbar">
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
              <span className="reference-count">{analyzePanelCount}</span>
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
              {activeSavedQuery && analyzePanel === 'query' && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void captureQuerySnapshot()}
                  title="Pin the current results as a point-in-time snapshot"
                >
                  Pin result
                </button>
              )}
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
                  onCellSelect={handleMatrixCellSelect}
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
                onWordSelect={handleWordSelect}
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
                onPairSelect={handlePairSelect}
                onCodeSelect={handlePairSelect}
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
                    downloadInFormat(rows, 'fieldnote-crosstabs', 'Crosstabs')
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

        {projectId && activeView === 'report' && <ReportDetail model={reportModel} />}
      </section>

      {activeView !== 'classify' && <aside className="properties-view">
        {activeView === 'overview' && (
          <OverviewInspector
            userId={session?.user?.id ?? null}
            lineNumberingMode={lineNumberingMode}
            lineNumberingWidth={lineNumberingWidth}
            onOpenProjectSettings={() => setSettingsOpen(true)}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
          />
        )}
        {activeView === 'organize' && (
          <OrganizeInspector
            activeSource={activeSource}
            sourceFolders={sourceFolders}
            cases={cases}
            sourceExcerpts={sourceExcerpts}
            activeSourceWords={activeSourceWords}
            activeSourceMemo={activeSourceMemo}
            updateSource={updateSource}
            assignSourceToCase={assignSourceToCase}
            createCaseFromSource={createCaseFromSource}
            setActiveView={setActiveView}
            archiveActiveSource={archiveActiveSource}
            restoreActiveSource={restoreActiveSource}
            deleteActiveSource={deleteActiveSource}
            onSummarizeSource={handleSummarizeSource}
          />
        )}

        {(activeView === 'code' || activeView === 'refine') && (
          <CodePickerPanel
            variant={activeView === 'code' ? 'code' : 'refine'}
            sortedCodes={sortedCodes}
            excerpts={excerpts}
            selectedCodeIds={selectedCodeIds}
            activeCodeId={activeCode.id}
            newCodeName={newCodeName}
            onSelectCode={setActiveCodeId}
            onToggleSelectedCode={toggleSelectedCode}
            onNewCodeNameChange={setNewCodeName}
            onAddCode={addCode}
          />
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
          <AnalyzeInspector
            analyzePanel={analyzePanel}
            analyzeResults={analyzeResults}
            analyzeMatchingCases={analyzeMatchingCases}
            activeQueryFilters={activeQueryFilters}
            activeSavedQuery={activeSavedQuery ?? null}
            querySnapshots={querySnapshots}
            exportFormat={exportFormat}
            onDeleteSavedQuery={deleteSavedQuery}
            onDownloadSnapshotCsv={downloadSnapshotCsv}
            onDeleteSnapshot={(id) => void deleteQuerySnapshot(id)}
            onUpdateSnapshotNote={(id, note) => void updateSnapshotNote(id, note)}
            onExportActiveAnalysisCsv={exportActiveAnalysisCsv}
          />
        )}

        {activeView === 'report' && (
          <ReportInspector
            projectTitle={projectTitle}
            sourceCount={activeSources.length}
            codeCount={codes.length}
            excerptCount={excerpts.length}
            caseCount={cases.length}
            attributeCount={attributes.length}
          />
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
      </aside>}
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
    {aiSettingsOpen && session?.user && (
      <AiSettingsPanel userId={session.user.id} onClose={() => setAiSettingsOpen(false)} />
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
  onOpenCrosstab,
  onReparentCode,
}: {
  activeView: WorkspaceView
  activeSourceId: string
  activeCodeId: string
  sources: Source[]
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
  onOpenCrosstab: () => void
  onReparentCode: (codeId: string, parentCodeId: string) => void
}) {
  return (
    <>
      <div className="pane-title">
        <FileText size={16} aria-hidden="true" />
        <span>{activeView === 'code' ? 'Sources' : activeView === 'refine' ? 'Codebook' : activeView === 'classify' ? 'Classifications' : activeView === 'analyze' ? 'Questions' : 'Exports'}</span>
      </div>
      {activeView === 'code' && (
        <SourcesView
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
        />
      )}
      {activeView === 'refine' && (
        <RefineSidebar
          codes={codes}
          excerpts={excerpts}
          activeCodeId={activeCodeId}
          onSelectCode={onSelectCode}
          onReparentCode={onReparentCode}
        />
      )}
      {activeView === 'classify' && (
        <ClassifySidebar
          cases={cases}
          sources={sources}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
        />
      )}
      {activeView === 'analyze' && (
        <AnalyzeSidebar
          analyzePanel={analyzePanel}
          savedQueries={savedQueries}
          activeSavedQueryId={activeSavedQueryId}
          onUseCurrentQuery={onUseCurrentQuery}
          onOpenSavedQuery={onOpenSavedQuery}
          onOpenMatrix={onOpenMatrix}
          onOpenFrequency={onOpenFrequency}
          onOpenCoOccurrence={onOpenCoOccurrence}
          onOpenCrosstab={onOpenCrosstab}
        />
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
  if (activeView === 'organize' || activeView === 'overview') {
    return <input className="title-input" value={projectTitle} aria-label="Project title" onChange={(event) => onProjectTitleChange(event.target.value)} />
  }
  return <input className="title-input" value={activeSource.title} aria-label="Source title" onChange={(event) => onSourceTitleChange(event.target.value)} />
}

export default App
