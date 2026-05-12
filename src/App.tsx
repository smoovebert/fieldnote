import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import {
  BarChart3,
  Download,
  FileText,
  Folders,
  Highlighter,
  LayoutDashboard,
  ListTree,
  MessageSquareText,
  Plus,
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
import { AnalyzeDetail } from './analyze/AnalyzeDetail'
import { buildCrosstab, crosstabCsvRows, type CrosstabResult } from './analyze/crosstabs'
import {
  buildCoOccurrenceRows,
  buildMatrixColumns,
  buildMatrixResults as buildDerivedMatrixResults,
  buildWordFrequencyRows,
  coOccurrenceRowsToPairs,
  filterAnalyzeExcerpts,
  matchingCasesForExcerpts,
  matrixResultsToCells,
  type MatrixColumnMode,
} from './analyze/derivedResults'
import {
  buildCodedExcerptSnapshot,
  buildCooccurrenceSnapshot,
  buildCrosstabSnapshot,
  buildFrequencySnapshot,
  buildMatrixSnapshot,
} from './analyze/snapshotBuilders'
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
import { ResearchTemplatePicker } from './components/ResearchTemplatePicker'
import type { ResearchTemplate } from './lib/researchTemplates'
import { OverviewInspector } from './modes/overview/OverviewInspector'
import { AccountDeletePanel } from './components/AccountDeletePanel'
import { AppHeader } from './components/AppHeader'
import { ReportDetail } from './modes/report/ReportDetail'
import { ReportInspector } from './modes/report/ReportInspector'
import { ReportSidebar } from './modes/report/ReportSidebar'
import { ScrollAffordance } from './components/ScrollAffordance'
import { RefineDetail } from './modes/refine/RefineDetail'
import { RefineInspector } from './modes/refine/RefineInspector'
import { RefineSidebar } from './modes/refine/RefineSidebar'
import { buildCodeTree } from './lib/codeTree'
import { ClassifyDetail } from './modes/classify/ClassifyDetail'
import { ClassifySidebar } from './modes/classify/ClassifySidebar'
import { AnalyzeSidebar } from './analyze/AnalyzeSidebar'
import { AnalyzeInspector } from './analyze/AnalyzeInspector'
import { OrganizeDetail } from './modes/organize/OrganizeDetail'
import { OrganizeSidebar } from './modes/organize/OrganizeSidebar'
import { OrganizeInspector } from './modes/organize/OrganizeInspector'
import { buildPageHighlights, findExcerptInBody, wrapHighlightedTranscript } from './modes/code/transcript'
import { isPdfSource, parseSourcePages } from './lib/sourcePages'
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
import { createId } from './lib/id'
import { parseCsv } from './lib/csv'
import { readSourceFile } from './lib/sourceImport'
import { buildAttributeImport } from './lib/attributeImport'
import { downloadRows, type RowExportFormat } from './lib/downloadRows'
import {
  analyzeExcerptRows,
  caseExcerptRows,
  caseSheetRows,
  codedExcerptsRows,
  codebookRows,
  coOccurrenceRows as coOccurrenceExportRows,
  matrixRows as matrixExportRows,
  memoRows,
  snapshotRows,
  wordFrequencyRows as wordFrequencyExportRows,
} from './lib/exportRows'
import { SourcesView } from './components/SourcesView'
import { AiSettingsPanel } from './components/AiSettingsPanel'
import { callAi } from './ai/client'
import {
  parseDraftDescriptionResponse,
  parseDraftMemoResponse,
  parseSuggestCodesResponse,
  parseSummarizeSourceResponse,
} from './ai/responseGuards'
import { loadAiSettings } from './lib/aiSettings'
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
  SnapshotResults,
  Source,
} from './lib/types'
import './styles/app-frame.css'
import './styles/app-workspace.css'
import './styles/app-new-shell.css'
import './styles/app-overview.css'
import './styles/app-components.css'
import './styles/app-ai.css'
import './styles/app-overview-rails.css'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'
// AnalyzePanel moved to src/analyze/analyzeViewState.ts

type LineNumberingMode = 'paragraph' | 'fixed-width'

// Synthetic code used as a render-time fallback when the codebook is
// empty (Blank-template projects, fresh backups, etc.). Kept out of
// state so the codebook stays truly empty until the user adds a code;
// the unique `__empty__` id can't collide with any real generated id.
const EMPTY_CODEBOOK_PLACEHOLDER: Code = {
  id: '__empty_codebook__',
  name: 'No codes yet',
  color: 'oklch(0.85 0 0)',
  description: '',
  parentCodeId: undefined,
}

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
  { id: 'refine',   label: 'Refine',   description: 'Clean the codebook and review code excerpts.', status: 'partial', icon: ListTree },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'partial', icon: Tags },
  { id: 'analyze',  label: 'Analyze',  description: 'Run searches, matrices, and comparisons.', status: 'partial', icon: BarChart3 },
  { id: 'report',   label: 'Report',   description: 'Export excerpts, memos, and codebooks.', status: 'partial', icon: FileText },
]

function slugId(value: string, fallback = 'item') {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback
}

// buildCodeTree moved to src/lib/codeTree.ts
// descendantCodeIds moved to src/lib/codeOperations.ts

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const userId = session?.user?.id ?? null
  // Tracks whether the signed-in user is on the free Gemini path
  // (`gemini-free`) vs BYOK. Only used to decide whether to show the
  // "X/N free calls left today" badge in AI preview panels — the
  // server is the source of truth for actual quota enforcement.
  const [isHostedAi, setIsHostedAi] = useState(true)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectTitle, setProjectTitle] = useState('Student Access Study')
  const [description, setDescription] = useState('')
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([])
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [exportFormat, setExportFormat] = useState<RowExportFormat>('csv')
  const [reportIncludes, setReportIncludes] = useState<ReportIncludes>(DEFAULT_REPORT_INCLUDES)
  const [querySnapshots, setQuerySnapshots] = useState<QueryResultSnapshot[]>([])
  const [activeView, setActiveView] = useState<WorkspaceView>('overview')
  const [activeSourceId, setActiveSourceId] = useState(defaultProject.activeSourceId)
  const [activeCodeId, setActiveCodeId] = useState(initialCodes[0].id)
  const [activeMemoId, setActiveMemoId] = useState(initialMemos[0].id)
  const [sources, setSources] = useState(defaultProject.sources)
  const [extraFolders, setExtraFolders] = useState<string[]>([])
  const [cases, setCases] = useState(defaultProject.cases)
  const [attributes, setAttributes] = useState(defaultProject.attributes)
  const [attributeValues, setAttributeValues] = useState(defaultProject.attributeValues)
  const [savedQueries, setSavedQueries] = useState(defaultProject.savedQueries)
  const [codes, setCodes] = useState(defaultProject.codes)
  const [memos, setMemos] = useState(defaultProject.memos)
  const [excerpts, setExcerpts] = useState(defaultProject.excerpts)
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([])
  const [persistActiveCodes, setPersistActiveCodes] = useState(false)
  const [newCodeName, setNewCodeName] = useState('')
  const [newAttributeName, setNewAttributeName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [queryText, setQueryText] = useState('')
  const [queryCodeId, setQueryCodeId] = useState('')
  // Additional codes ANDed onto queryCodeId. Empty for ordinary single-code
  // queries; set by co-occurrence pair drill-down so the result is excerpts
  // coded with both codes. Editable from the Find-excerpts query builder
  // via "Also coded with" chips.
  const [queryAdditionalCodeIds, setQueryAdditionalCodeIds] = useState<string[]>([])
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
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [selectionHint, setSelectionHint] = useState('Select text in the source, then click Code selection.')
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  const [hasLoadedRemoteProject, setHasLoadedRemoteProject] = useState(false)

  const activeSource = sources.find((source) => source.id === activeSourceId) ?? sources[0] ?? defaultProject.sources[0]
  // Render-time placeholder for an empty codebook (Blank template,
  // freshly-imported backup with no codes, etc.). Keeps the dozens of
  // `activeCode.x` dereferences below from crashing on undefined; the
  // placeholder is never written to `codes` state and never persists.
  // Any operation that filters/maps `codes` by this synthetic id is a
  // no-op (the id can't match a real row), so it's safe to leave call
  // sites as-is.
  const activeCode = codes.find((code) => code.id === activeCodeId) ?? codes[0] ?? EMPTY_CODEBOOK_PLACEHOLDER
  const activeMemo = memos.find((memo) => memo.id === activeMemoId) ?? memos[0]
  const selectedCodes = codes.filter((code) => selectedCodeIds.includes(code.id))
  // Empty active set is now allowed (was forced to >=1). Surface a
  // human-readable placeholder so the active-codes bar reads cleanly
  // when no codes are toggled on; the Code-selection action no-ops in
  // that state with a hint, so the user can still use the quick-code
  // menu (which carries its own per-selection chips).
  const selectedCodeNames = selectedCodes.length === 0
    ? 'No active codes'
    : selectedCodes.map((code) => code.name).join(', ')
  const sourceExcerpts = excerpts.filter((excerpt) => excerpt.sourceId === activeSource.id)
  const activeCodeTreeIds = [activeCode.id, ...descendantCodeIds(codes, activeCode.id)]
  const codeExcerpts = excerpts.filter((excerpt) => excerpt.codeIds.some((codeId) => activeCodeTreeIds.includes(codeId)))
  const activeSources = sources.filter((source) => !source.archived)
  const archivedSources = sources.filter((source) => source.archived)
  const sourceFolders = Array.from(new Set(['Internals', 'Externals', ...activeSources.map((source) => source.folder).filter(Boolean), ...extraFolders]))
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
    additionalCodeIds: queryAdditionalCodeIds,
    caseId: queryCaseId,
    attributes: queryAttributes,
    analyzeView: serializeAnalyzeView(analyzeView),
  }
  const activeSavedQuery = savedQueries.find((query) => query.id === activeSavedQueryId)
  const caseGridTemplate = `minmax(170px, 1fr) minmax(160px, 1fr) ${attributes
    .map(() => 'minmax(120px, 0.75fr)')
    .join(' ')} minmax(160px, 1fr) 36px`
  const codeById = useMemo(() => new Map(codes.map((code) => [code.id, code])), [codes])
  const sortedCodes = useMemo(() => buildCodeTree(codes), [codes])
  const activeCodeParent = activeCode.parentCodeId ? codeById.get(activeCode.parentCodeId) : undefined
  const activeCodeChildren = codes.filter((code) => code.parentCodeId === activeCode.id)
  const parentCodeOptions = sortedCodes.filter((code) => code.id !== activeCode.id && !descendantCodeIds(codes, activeCode.id).includes(code.id))
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
    setExtraFolders([])
    setCases(nextProject.cases)
    setAttributes(nextProject.attributes)
    setAttributeValues(nextProject.attributeValues)
    setSavedQueries(nextProject.savedQueries)
    setCodes(nextProject.codes)
    setMemos(nextProject.memos)
    setExcerpts(nextProject.excerpts)
    // Empty codebook is allowed (Blank template, fresh imports). Empty
    // string falls through to EMPTY_CODEBOOK_PLACEHOLDER at render —
    // pointing at a sample-template id from `initialCodes` would have
    // been silently misleading.
    setActiveCodeId(nextProject.codes[0]?.id ?? '')
    setActiveMemoId(nextProject.memos[0]?.id ?? initialMemos[0].id)
    setSelectedCodeIds([])
    setQueryText('')
    setQueryCodeId('')
    setQueryAdditionalCodeIds([])
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
        queryId: (row.query_id as string | null) ?? null,
        capturedAt: row.captured_at as string,
        label: (row.label as string) ?? '',
        note: (row.note as string) ?? '',
        includeInReport: Boolean(row.include_in_report),
        // result_kind defaults to 'coded_excerpt' so older rows that
        // pre-date the multi-panel snapshot column come through with
        // the right discriminant.
        resultKind: ((row.result_kind as string) ?? 'coded_excerpt') as QueryResultSnapshot['resultKind'],
        activeFilters: ((row.config as Record<string, unknown> | null)?.activeFilters as string[] | undefined) ?? [],
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
      await applyProject(nextProject)
    } catch (error) {
      setSaveStatus(errorMessage(error, 'Could not create project.'))
    } finally {
      setIsCreatingProject(false)
    }
  }

  // createProject / createSampleProject removed — both flows now go
  // through the research-template picker (createProjectFromTemplate
  // below), which builds the blank and sample seeds from
  // RESEARCH_TEMPLATES same as the methodology templates.

  // Picker callback — runs the template's seed builder fresh per call so
  // two new projects from the same template don't collide on code ids.
  // The picker closes after the
  // call returns regardless of success; if the create failed, the
  // saveStatus banner shows the error and the user can re-open and
  // retry from a clean modal state.
  async function createProjectFromTemplate(template: ResearchTemplate, title: string) {
    setTemplatePickerOpen(false)
    await createProjectFromSeed(title, template.buildSeed())
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

  // Pull the user's AI provider once per sign-in so AI preview panels
  // know whether to show the hosted-quota badge. Default to hosted on
  // failure or no row — the badge is informational and the server still
  // enforces the cap.
  useEffect(() => {
    let cancelled = false
    if (!userId) {
      queueMicrotask(() => { if (!cancelled) setIsHostedAi(true) })
      return () => { cancelled = true }
    }
    loadAiSettings(userId)
      .then((settings) => { if (!cancelled) setIsHostedAi((settings?.aiProvider ?? 'gemini-free') === 'gemini-free') })
      .catch(() => { if (!cancelled) setIsHostedAi(true) })
    return () => { cancelled = true }
  }, [userId])

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

  // Memoize the projectRow snapshot the autosave hook needs.
  //
  // Why this exists: useAutosave includes projectRow in its effect's
  // dep array (the IDB local-recovery snapshot uses it). The previous
  // inline IIFE here returned a fresh object literal every render, so
  // every save's onSaved -> setProjectRows -> re-render created a new
  // projectRow reference, re-fired the autosave effect, scheduled
  // another 700ms timeout, ran another (no-op-content) save against
  // the same payload, succeeded, called onSaved again — infinite loop
  // visible to the user as a 'Saving...' status that never settles.
  // Memoizing on the actual fields (id/title/updated_at) breaks the
  // loop: when nothing real changed, the same reference comes back and
  // the autosave effect stays quiet.
  const activeProjectRow = projectId ? projectRows.find((p) => p.id === projectId) : null
  // Deps are the individual fields, not the row object itself, so the
  // memo doesn't re-fire when the rest of the row (sources / codes /
  // memos / etc.) changes on save — those don't affect the recovery
  // snapshot's title/updated_at fields and were the source of the
  // 'always saving' loop.
  const autosaveProjectRow = useMemo(() => {
    if (!activeProjectRow) return null
    return {
      id: activeProjectRow.id,
      title: activeProjectRow.title,
      updated_at: activeProjectRow.updated_at ?? null,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectRow?.id, activeProjectRow?.title, activeProjectRow?.updated_at])

  useAutosave({
    enabled: Boolean(session?.user && projectId && hasLoadedRemoteProject),
    projectId,
    payload: persistencePayload,
    supabase,
    userId: session?.user?.id ?? null,
    projectRow: autosaveProjectRow,
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
    return filterAnalyzeExcerpts({
      excerpts,
      codes,
      sources,
      cases,
      attributeValues,
      text: queryText,
      codeId: queryCodeId,
      additionalCodeIds: queryAdditionalCodeIds,
      caseId: queryCaseId,
      attributes: queryAttributes,
    })
  }, [attributeValues, cases, codes, excerpts, queryAdditionalCodeIds, queryAttributes, queryCaseId, queryCodeId, queryText, sources])

  const analyzeMatchingCases = useMemo(() => {
    return matchingCasesForExcerpts(analyzeResults, cases)
  }, [analyzeResults, cases])

  const activeMatrixAttribute = attributes.find((attribute) => attribute.id === matrixAttributeId) ?? attributes[0]
  const matrixRows = useMemo(() => {
    if (queryCodeId) {
      const selectedCode = codes.find((code) => code.id === queryCodeId)
      return selectedCode ? [selectedCode] : []
    }
    return sortedCodes
  }, [codes, queryCodeId, sortedCodes])
  const matrixColumns = useMemo(() => {
    return buildMatrixColumns({
      mode: matrixColumnMode,
      cases,
      activeAttribute: activeMatrixAttribute,
      attributeValues,
    })
  }, [activeMatrixAttribute, attributeValues, cases, matrixColumnMode])
  const matrixResults = useMemo(() => {
    return buildDerivedMatrixResults({
      rows: matrixRows,
      columns: matrixColumns,
      cases,
      excerpts: analyzeResults,
    })
  }, [analyzeResults, cases, matrixColumns, matrixRows])
  const matrixTotalReferences = matrixResults.reduce((total, row) => total + row.cells.reduce((rowTotal, cell) => rowTotal + cell.excerpts.length, 0), 0)
  const wordFrequencyRows = useMemo(() => buildWordFrequencyRows(analyzeResults), [analyzeResults])
  const coOccurrenceRows = useMemo(() => buildCoOccurrenceRows(analyzeResults, codes), [analyzeResults, codes])
  const wordFrequencyViewRows = useMemo(
    () => wordFrequencyRows.map((row) => ({ word: row.word, count: row.count, excerptCount: row.excerptCount })),
    [wordFrequencyRows],
  )
  const cooccurrencePairs = useMemo(() => coOccurrenceRowsToPairs(coOccurrenceRows), [coOccurrenceRows])
  const matrixCellInputs = useMemo(() => matrixResultsToCells(matrixResults), [matrixResults])

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

  // Pair drill-down: lands on excerpts coded with both codes via the
  // additionalCodeIds AND filter. Single-code drill-down (from the
  // co-occurrence per-code list) clears any leftover additional codes
  // so the result is just "excerpts coded with X".
  function handlePairSelect(codeId: string, alsoCodedWith?: string) {
    setQueryCodeId(codeId)
    if (alsoCodedWith && alsoCodedWith !== codeId) {
      setQueryAdditionalCodeIds([alsoCodedWith])
    } else {
      setQueryAdditionalCodeIds([])
    }
    setAnalyzePanel('query')
  }

  const analyzePanelCount =
    analyzePanel === 'matrix'
      ? `${matrixTotalReferences} matrix excerpts`
      : analyzePanel === 'frequency'
        ? `${wordFrequencyRows.length} terms`
        : analyzePanel === 'cooccurrence'
          ? `${coOccurrenceRows.length} pairs`
          : `${analyzeResults.length} results`

  const activeQueryFilters = [
    queryText.trim() ? `Text contains "${queryText.trim()}"` : '',
    queryCodeId ? `Code: ${codes.find((code) => code.id === queryCodeId)?.name ?? 'Unknown code'}` : '',
    ...queryAdditionalCodeIds.map((id) => `Also coded with: ${codes.find((c) => c.id === id)?.name ?? 'Unknown code'}`),
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
        // Whitespace-flexible match: a multi-line selection brings DOM
        // line-wrap '\n' characters along that the source body doesn't
        // have, so a strict indexOf misses. The shared helper does an
        // exact-first / regex-fallback match and returns the slice
        // bounds in the actual body so the displayed mark covers
        // exactly what's in the source.
        const span = findExcerptInBody(piece.text, excerpt.text)
        if (!span) return [piece]

        return [
          { text: piece.text.slice(0, span.start) },
          { text: piece.text.slice(span.start, span.end), codes: excerptCodes },
          { text: piece.text.slice(span.end) },
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

  // For PDF sources, recompute the highlight overlay per page using the
  // page parser. Returns null for non-PDF sources so the reader keeps
  // its existing line-numbered render path. We rebuild excerpts and
  // codes are dependencies so the highlight stays current as either
  // changes, mirroring the whole-doc highlightedTranscript memo above.
  const highlightedPages = useMemo(() => {
    if (!isPdfSource(activeSource.content)) return null
    const pages = parseSourcePages(activeSource.content)
    return pages.map((p) => ({
      pageNumber: p.pageNumber,
      body: buildPageHighlights(p.body, sourceExcerpts, codes),
    }))
  }, [activeSource.content, sourceExcerpts, codes])

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
      `Delete "${activeCode.name}"? It will be removed from ${references} excerpt${references === 1 ? '' : 's'}.`
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

  function deleteCodes(codeIds: string[]) {
    if (codeIds.length === 0) return
    const remainingAfter = codes.length - codeIds.length
    if (remainingAfter <= 0) {
      setSelectionHint('Keep at least one code in the codebook.')
      return
    }
    const refCount = excerpts.filter((e) => e.codeIds.some((id) => codeIds.includes(id))).length
    const ok = window.confirm(
      `Delete ${codeIds.length} code${codeIds.length === 1 ? '' : 's'}? They will be removed from ${refCount} excerpt${refCount === 1 ? '' : 's'}, and any children re-parent up.`
    )
    if (!ok) return

    // Iterate libDeleteCode — children re-parent up on each pass, so
    // any order produces the same final state.
    let acc = { codes, excerpts, memos }
    for (const id of codeIds) {
      acc = libDeleteCode({ codes: acc.codes, excerpts: acc.excerpts, memos: acc.memos, codeId: id })
    }
    setCodes(acc.codes)
    setExcerpts(acc.excerpts)
    setMemos(acc.memos)
    setSelectedCodeIds((current) => current.filter((id) => !codeIds.includes(id)))
    if (codeIds.includes(activeCode.id)) {
      setActiveCodeId(acc.codes[0]?.id ?? '')
    }
    setSelectionHint(`Deleted ${codeIds.length} code${codeIds.length === 1 ? '' : 's'}.`)
  }

  function mergeActiveCodeIntoTarget(targetCodeId: string) {
    const targetCode = codes.find((code) => code.id === targetCodeId)
    if (!activeCode || !targetCode || activeCode.id === targetCode.id) return
    if (descendantCodeIds(codes, activeCode.id).includes(targetCode.id)) return

    const references = excerpts.filter((excerpt) => excerpt.codeIds.includes(activeCode.id)).length
    if (!offerBackupBeforeRisky(
      `Merge "${activeCode.name}" into "${targetCode.name}"? ${references} excerpt${references === 1 ? '' : 's'} will move to "${targetCode.name}", and "${activeCode.name}" will be removed from the codebook.`
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

  // Toggle a code in/out of the active-coding set. Empty is allowed —
  // when zero codes are selected, the Code-selection action no-ops with
  // a hint so the user can clear the active set without losing the
  // ability to use the quick-code menu (which carries its own per-
  // selection code chips and isn't bound by selectedCodeIds).
  function toggleSelectedCode(codeId: string) {
    setSelectedCodeIds((current) =>
      current.includes(codeId)
        ? current.filter((id) => id !== codeId)
        : [...current, codeId],
    )
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
    setSelectionHint(`Split ${excerptIds.length} excerpt${excerptIds.length === 1 ? '' : 's'} into new code "${trimmed}".`)
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
      id: createId('code', name),
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

  // pageInfo is supplied by the Code-mode reader for PDF sources only.
  // For non-PDF sources (and for legacy callers) it's omitted; the new
  // excerpt persists with pageNumber/charOffset undefined and the
  // citation falls through to source title alone.
  function applyCodesToText(
    selectedText: string,
    codeIds = selectedCodeIds,
    label = selectedCodeNames,
    pageInfo?: { pageNumber: number; charOffset: number },
  ) {
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
          id: createId('excerpt'),
          codeIds,
          sourceId: activeSource.id,
          sourceTitle: activeSource.title,
          text: selectedText,
          note: '',
          ...(pageInfo ? { pageNumber: pageInfo.pageNumber, charOffset: pageInfo.charOffset } : {}),
        },
        ...current,
      ]
    })
    setSelectionHint(`${mergedExistingReference ? 'Added codes to existing excerpt' : 'Coded selection'} as ${label}.`)
    window.getSelection()?.removeAllRanges()
    if (!persistActiveCodes) setSelectedCodeIds([])
  }

  // pageInfo comes from the Code-mode reader for PDF sources only. The
  // toolbar button calls codeSelection() with no override; the reader
  // computes pageInfo from the live selection just before invoking
  // codeSelection so cross-page selections can be rejected before any
  // excerpt is created.
  function codeSelection(selectedTextOverride?: string, pageInfo?: { pageNumber: number; charOffset: number }) {
    const selectedText = selectedTextOverride?.trim() || window.getSelection()?.toString().trim()

    if (!selectedText || activeView !== 'code') {
      setSelectionHint(activeView === 'code' ? 'No text is selected yet. Drag across a phrase or paragraph first.' : 'Switch to Code mode before coding text.')
      return
    }

    // Active set may now legitimately be empty; the toolbar Code-
    // selection button still routes here, so guard the no-op case
    // with a hint instead of creating a code-less excerpt.
    if (selectedCodeIds.length === 0) {
      setSelectionHint('No active codes — pick at least one code to apply, or use the quick-code menu.')
      return
    }

    applyCodesToText(selectedText, undefined, undefined, pageInfo)
  }

  async function handleSuggestCodes(selectedText: string) {
    const result = await callAi({ kind: 'suggest_codes', inputText: selectedText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const parsed = parseSuggestCodesResponse(result.response)
    if (!parsed.ok) return { ok: false as const, message: parsed.message }
    return { ok: true as const, suggestions: parsed.response.suggestions }
  }

  async function handleDraftDescription(codeName: string, references: Array<{ sourceTitle: string; text: string }>) {
    const refLines = references.map((r) => `[${r.sourceTitle}] ${r.text}`).join('\n')
    const inputText = `Code name: ${codeName}\n\nExcerpts:\n${refLines}`
    const result = await callAi({ kind: 'draft_description', inputText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const parsed = parseDraftDescriptionResponse(result.response)
    if (!parsed.ok) return { ok: false as const, message: parsed.message }
    return { ok: true as const, description: parsed.response.description }
  }

  async function handleSummarizeSource(source: { title: string; content: string }) {
    const inputText = `Source: ${source.title}\n\n${source.content}`
    const result = await callAi({ kind: 'summarize_source', inputText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const parsed = parseSummarizeSourceResponse(result.response)
    if (!parsed.ok) return { ok: false as const, message: parsed.message }
    return { ok: true as const, summary: parsed.response.summary }
  }

  async function handleDraftProjectMemo() {
    const lines: string[] = []
    for (const snap of querySnapshots) {
      // The AI memo prompt expects excerpts; non-excerpt panel snapshots
      // (matrix / frequency / etc.) don't carry excerpts to summarize,
      // so we skip them here. They're still surfaced in the Report.
      if (snap.results.kind !== 'coded_excerpt') continue
      const queryName = snap.queryId
        ? (savedQueries.find((q) => q.id === snap.queryId)?.name ?? 'Saved query')
        : 'Saved query'
      lines.push(`Snapshot: "${snap.label || queryName}" (${snap.results.excerpts.length} excerpts)`)
      for (const e of snap.results.excerpts.slice(0, 5)) {
        lines.push(`- ${e.sourceTitle}: ${e.text.slice(0, 200)}`)
      }
      lines.push('')
    }
    const inputText = lines.join('\n')
    const result = await callAi({ kind: 'draft_memo', inputText, projectId: projectId ?? null })
    if (!result.ok) return { ok: false as const, message: result.message }
    const parsed = parseDraftMemoResponse(result.response)
    if (!parsed.ok) return { ok: false as const, message: parsed.message }
    return { ok: true as const, memo: parsed.response.memo }
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
    setExtraFolders((current) => current.map((folder) => (folder === oldName ? newName : folder)))
  }

  function deleteFolder(name: string) {
    if (name === 'Internals') return
    const affected = sources.filter((source) => source.folder === name).length
    const message = affected === 0
      ? `Delete the empty folder "${name}"?`
      : `Delete "${name}"? Its ${affected} source${affected === 1 ? '' : 's'} will move to Internals.`
    if (!window.confirm(message)) return
    setSources((current) => current.map((source) => (source.folder === name ? { ...source, folder: 'Internals' } : source)))
    setExtraFolders((current) => current.filter((folder) => folder !== name))
  }

  function createFolder(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const existing = new Set([...sources.map((source) => source.folder), ...extraFolders])
    if (existing.has(trimmed)) return
    setExtraFolders((current) => [...current, trimmed])
  }

  function updateProjectTitle(title: string) {
    setProjectTitle(title)
  }

  function createCaseFromSource() {
    // Prompt for the case name explicitly. Falling back silently to
    // the source title (the prior behavior) led to cases named after
    // filenames like "Interview-03.txt" — confusing in the case
    // list later. Pre-fill the prompt with the source's existing
    // caseName, or the source title as a sensible default.
    const suggested = activeSource.caseName?.trim() || activeSource.title
    const raw = window.prompt('Name this case (e.g. "Participant One")', suggested)
    if (raw == null) return
    const caseName = raw.trim()
    if (!caseName) {
      setSelectionHint('Case name is required.')
      return
    }

    const existingCase = cases.find((item) => item.name.toLowerCase() === caseName.toLowerCase())

    if (existingCase) {
      setCases((current) =>
        current.map((item) =>
          item.id === existingCase.id ? { ...item, sourceIds: Array.from(new Set([...item.sourceIds, activeSource.id])) } : item
        )
      )
      updateSource(activeSource.id, { caseName: existingCase.name })
      setSelectionHint(`Added "${activeSource.title}" to case "${existingCase.name}".`)
      return
    }

    const newCase: Case = {
      id: createId('case', caseName),
      name: caseName,
      description: '',
      sourceIds: [activeSource.id],
    }
    setCases((current) => [...current, newCase])
    updateSource(activeSource.id, { caseName: newCase.name })
    setSelectionHint(`Created case "${newCase.name}".`)
  }

  function createCasesFromSources() {
    const nextCasesByName = new Map(cases.map((item) => [item.name.toLowerCase(), item]))
    sources.forEach((source) => {
      const caseName = source.caseName?.trim() || source.title
      const key = caseName.toLowerCase()
      const existingCase = nextCasesByName.get(key) ?? {
        id: createId('case', caseName),
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

    setAttributes((current) => [...current, { id: createId('attribute', name), name, valueType: 'text' }])
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

  async function importAttributesFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    let rows: string[][]
    try {
      const lower = file.name.toLowerCase()
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        // SheetJS sheet_to_json with header:1 returns array-of-arrays
        // in the same shape as parseCsv, so the rest of the import
        // logic stays unchanged. raw:false coerces dates/numbers to
        // their displayed string form (matches what a human sees in
        // the spreadsheet).
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          setSelectionHint('Spreadsheet has no sheets.')
          return
        }
        const sheet = workbook.Sheets[firstSheetName]
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
        rows = aoa
          .map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
          .filter((row) => row.some((cell) => cell.trim() !== ''))
      } else {
        rows = parseCsv(await file.text())
      }
    } catch (error) {
      setSelectionHint(`Could not read file: ${error instanceof Error ? error.message : String(error)}`)
      return
    }

    const result = buildAttributeImport({ rows, attributes, cases, attributeValues, createId })
    if (!result.ok) {
      setSelectionHint(result.message)
      return
    }

    setAttributes(result.attributes)
    setCases(result.cases)
    setAttributeValues(result.attributeValues)
    setSelectionHint(result.summary)
  }

  function applyQueryDefinition(definition: QueryDefinition) {
    setQueryText(definition.text)
    setQueryCodeId(definition.codeId)
    setQueryAdditionalCodeIds(definition.additionalCodeIds ?? [])
    setQueryCaseId(definition.caseId)
    setQueryAttributes(definition.attributes)
    setAnalyzeView(definition.analyzeView ?? DEFAULT_ANALYZE_VIEW)
  }

  function saveCurrentQuery() {
    const name = queryName.trim() || activeSavedQuery?.name || 'Untitled query'
    const nextQuery: SavedQuery = {
      id: activeSavedQueryId || createId('query', name),
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

  // Shared persistence path. Each panel has its own builder that produces
  // the right `results` payload + `activeFilters` for the audit trail;
  // this helper just inserts the row, threads the response back into
  // local state, and returns the persisted snapshot (or null on failure).
  type PersistInput = {
    queryId: string | null
    label: string
    includeInReport: boolean
    kind: QueryResultSnapshot['resultKind']
    definition: QueryDefinition
    results: SnapshotResults
    activeFilters: string[]
  }
  async function persistSnapshot(input: PersistInput): Promise<QueryResultSnapshot | null> {
    if (!projectId) {
      setSelectionHint('Open a project before capturing a snapshot.')
      return null
    }
    const payload = {
      project_id: projectId,
      query_id: input.queryId,
      label: input.label.trim(),
      include_in_report: input.includeInReport,
      result_kind: input.kind,
      config: { activeFilters: input.activeFilters },
      definition: input.definition,
      results: input.results,
    }
    setSaveStatus('Capturing snapshot...')
    const { data, error } = await supabase
      .from('fieldnote_query_results')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      setSaveStatus(errorMessage(error, 'Could not capture snapshot.'))
      return null
    }
    const row = data as Record<string, unknown>
    const snapshot: QueryResultSnapshot = {
      id: row.id as string,
      projectId: row.project_id as string,
      queryId: (row.query_id as string | null) ?? null,
      capturedAt: row.captured_at as string,
      label: (row.label as string) ?? '',
      note: (row.note as string) ?? '',
      includeInReport: Boolean(row.include_in_report),
      resultKind: ((row.result_kind as string) ?? 'coded_excerpt') as QueryResultSnapshot['resultKind'],
      activeFilters: input.activeFilters,
      definition: row.definition as QueryResultSnapshot['definition'],
      results: row.results as QueryResultSnapshot['results'],
    }
    setQuerySnapshots((current) => [snapshot, ...current])
    setSaveStatus('Snapshot captured.')
    return snapshot
  }

  function buildCodedExcerptResults(): SnapshotResults {
    return buildCodedExcerptSnapshot(analyzeResults)
  }

  function buildMatrixResults(): SnapshotResults {
    return buildMatrixSnapshot({
      columnMode: matrixColumnMode,
      attributeName: matrixColumnMode === 'attribute' ? activeMatrixAttribute?.name ?? null : null,
      columns: matrixColumns,
      rows: matrixResults,
    })
  }

  function buildFrequencyResults(): SnapshotResults {
    return buildFrequencySnapshot(wordFrequencyRows, analyzeView.wordFreq.topN)
  }

  function buildCooccurrenceResults(): SnapshotResults {
    return buildCooccurrenceSnapshot(cooccurrencePairs, analyzeView.cooccur.topN)
  }

  function buildCrosstabResults(): SnapshotResults | null {
    return buildCrosstabSnapshot({ result: crosstabResult, attributes, view: analyzeView.crosstab })
  }

  async function captureQuerySnapshot() {
    if (analyzePanel !== 'query') {
      setSelectionHint('The pin button is only for Find-excerpts. Use Send to Report on other panels.')
      return
    }
    if (!activeSavedQueryId || !activeSavedQuery) {
      setSelectionHint('Save the query first, then pin a snapshot.')
      return
    }
    const label = window.prompt(`Optional label for this snapshot (e.g., "Before recoding pass 2"):`, '') ?? ''
    await persistSnapshot({
      queryId: activeSavedQueryId,
      label,
      includeInReport: false,
      kind: 'coded_excerpt',
      definition: currentQueryDefinition,
      results: buildCodedExcerptResults(),
      activeFilters: activeQueryFilters,
    })
  }

  // "Send to report" — pin a snapshot with include_in_report = true, then
  // jump to Report mode so the researcher sees the section they just
  // promoted. The label is auto-derived so they don't have to type one.
  async function sendActiveAnalysisToReport() {
    if (!projectId) {
      setSelectionHint('Open a project before sending an analysis to the Report.')
      return
    }
    const today = new Date().toLocaleDateString()
    let kind: QueryResultSnapshot['resultKind'] = 'coded_excerpt'
    let queryId: string | null = null
    let label = ''
    let results: SnapshotResults | null = null
    let definition: QueryDefinition = currentQueryDefinition
    if (analyzePanel === 'query') {
      if (!activeSavedQueryId || !activeSavedQuery) {
        setSelectionHint('Save the Find-excerpts query first, then send to Report.')
        return
      }
      kind = 'coded_excerpt'
      queryId = activeSavedQueryId
      label = `${activeSavedQuery.name} on ${today}`
      results = buildCodedExcerptResults()
    } else if (analyzePanel === 'matrix') {
      kind = 'matrix'
      label = `Matrix (${matrixColumnMode === 'case' ? 'by case' : `by ${activeMatrixAttribute?.name ?? 'attribute'}`}) on ${today}`
      results = buildMatrixResults()
      definition = { codeId: '', caseId: '', text: '', attributes: [] }
    } else if (analyzePanel === 'frequency') {
      kind = 'frequency'
      label = `Word frequency (top ${analyzeView.wordFreq.topN}) on ${today}`
      results = buildFrequencyResults()
      definition = { codeId: '', caseId: '', text: '', attributes: [] }
    } else if (analyzePanel === 'cooccurrence') {
      kind = 'cooccurrence'
      label = `Code co-occurrence (top ${analyzeView.cooccur.topN}) on ${today}`
      results = buildCooccurrenceResults()
      definition = { codeId: '', caseId: '', text: '', attributes: [] }
    } else if (analyzePanel === 'crosstab') {
      results = buildCrosstabResults()
      if (!results) {
        setSelectionHint('Pick both attributes for the crosstab before sending to Report.')
        return
      }
      kind = 'crosstab'
      label = `Crosstab on ${today}`
      definition = { codeId: '', caseId: '', text: '', attributes: [] }
    }
    if (!results) return
    const snapshot = await persistSnapshot({
      queryId,
      label,
      includeInReport: true,
      kind,
      definition,
      results,
      activeFilters: activeQueryFilters,
    })
    if (snapshot) {
      setActiveView('report')
      setSaveStatus('Snapshot sent to Report.')
    }
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

  async function updateSnapshotInclude(snapshotId: string, includeInReport: boolean) {
    setQuerySnapshots((current) =>
      current.map((s) => (s.id === snapshotId ? { ...s, includeInReport } : s)),
    )
    const { error } = await supabase
      .from('fieldnote_query_results')
      .update({ include_in_report: includeInReport })
      .eq('id', snapshotId)
    if (error) {
      setSaveStatus(errorMessage(error, 'Could not update snapshot.'))
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
    const queryName = snap.queryId
      ? (savedQueries.find((q) => q.id === snap.queryId)?.name ?? 'Saved query')
      : 'Analysis'
    const dateLabel = new Date(snap.capturedAt).toISOString().slice(0, 10)
    const rows = snapshotRows({ projectTitle, queryName, snapshot: snap, codes })
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

    const shouldDelete = window.confirm('Delete this excerpt? This removes the excerpt from all codes.')
    if (!shouldDelete) return

    setExcerpts((current) => libDeleteExcerpt(current, id))
  }

  function removeCodeFromExcerpt(excerptId: string, codeId: string) {
    const excerpt = excerpts.find((item) => item.id === excerptId)
    const code = codes.find((item) => item.id === codeId)
    if (!excerpt || !code) return

    const shouldRemove = window.confirm(
      excerpt.codeIds.length === 1
        ? `Remove "${code.name}"? This excerpt has no other codes, so the excerpt will be deleted.`
        : `Remove "${code.name}" from this excerpt?`
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
      newExcerptId: createId('excerpt'),
    })
    if (!result.ok) {
      if (result.reason === 'selection-not-in-text') {
        setSelectionHint(
          selectedText
            ? 'The selected text must be inside the excerpt you are splitting.'
            : 'Select part of the excerpt text first, then click Split.',
        )
      } else if (result.reason === 'selection-is-whole-text') {
        setSelectionHint('Split needs a smaller selection, not the whole excerpt.')
      }
      return
    }
    setExcerpts(result.excerpts)
    window.getSelection()?.removeAllRanges()
    setSelectionHint('Split the selected text into a new excerpt.')
  }

  function updateProjectMemo(body: string) {
    const existing = memos.find((memo) => memo.linkedType === 'project')
    if (existing) {
      updateMemo(existing.id, { body })
      return
    }
    const memo: Memo = {
      id: createId('memo', 'project'),
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
      id: createId('memo', railMemoTitle),
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
          id: createId('source', file.name.replace(/\.[^.]+$/, '') || `import-${index + 1}`),
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

    const rows = codedExcerptsRows({ projectTitle, excerpts, sources, cases, codes })

    downloadInFormat(rows, 'fieldnote-coded-excerpts', 'Coded excerpts')
  }

  function exportCaseSheetCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = caseSheetRows({ projectTitle, cases, sources, attributes, attributeValues })

    downloadInFormat(rows, 'fieldnote-case-sheet', 'Case sheet')
  }

  function exportCaseExcerptCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = caseExcerptRows({ projectTitle, excerpts, cases, codes, attributes, attributeValues })

    downloadInFormat(rows, 'fieldnote-coded-excerpts-by-case', 'Excerpts by case')
  }

  function exportAnalyzeCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = analyzeExcerptRows({ projectTitle, excerpts: analyzeResults, cases, codes, activeFilters: activeQueryFilters })

    downloadInFormat(rows, 'fieldnote-query-results', 'Query results')
  }

  function exportMatrixCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const columnType = matrixColumnMode === 'case' ? 'Case' : activeMatrixAttribute?.name ?? 'Attribute'
    const rows = matrixExportRows({ projectTitle, rows: matrixResults, columnType, activeFilters: activeQueryFilters })

    downloadInFormat(rows, 'fieldnote-matrix-coding', 'Matrix coding')
  }

  function exportWordFrequencyCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = wordFrequencyExportRows({ projectTitle, rows: wordFrequencyRows, activeFilters: activeQueryFilters })

    downloadInFormat(rows, 'fieldnote-word-frequency', 'Word frequency')
  }

  function exportCoOccurrenceCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = coOccurrenceExportRows({ projectTitle, rows: coOccurrenceRows, activeFilters: activeQueryFilters })

    downloadInFormat(rows, 'fieldnote-code-cooccurrence', 'Co-occurrence')
  }

  function exportCrosstabCsv() {
    if (!crosstabResult) return
    const a1 = attributes.find((a) => a.id === analyzeView.crosstab.attr1Id)?.name ?? 'Attribute 1'
    const a2 = attributes.find((a) => a.id === analyzeView.crosstab.attr2Id)?.name ?? 'Attribute 2'
    const rows = crosstabCsvRows(crosstabResult, a1, a2)
    downloadInFormat(rows, 'fieldnote-crosstabs', 'Crosstabs')
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
      exportCrosstabCsv()
      return
    }
    exportAnalyzeCsv(event)
  }

  function exportCodebookCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = codebookRows({ projectTitle, sortedCodes, excerpts })

    downloadInFormat(rows, 'fieldnote-codebook', 'Codebook')
  }

  function exportMemosCsv(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()

    const rows = memoRows({ projectTitle, memos, sources, codes })

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
   * Confirm a destructive action and auto-download a defensive backup.
   *
   * Why one confirm, not two: Chromium-based browsers (including Arc)
   * surface a "Prevent this page from creating additional dialogs"
   * checkbox after a few rapid window.confirm calls. The previous
   * version of this helper showed two confirms back-to-back (offer
   * backup → proceed-without-backup), which combined with the
   * destructive action's own confirm produced three dialogs in a row
   * and tripped that suppression. Once tripped, every subsequent
   * window.confirm returns false silently — meaning every destructive
   * flow aborted with no feedback to the user. Single confirm + an
   * unconditional best-effort backup avoids the trap and still gives
   * the safety net.
   */
  function offerBackupBeforeRisky(actionDescription: string): boolean {
    if (!projectId) return true // no project to back up
    const proceed = window.confirm(
      `${actionDescription}\n\nThis is destructive and cannot be undone. A .fieldnote.json backup of the current project will be downloaded automatically before continuing.`,
    )
    if (!proceed) return false
    try {
      exportProjectBackup()
    } catch (err) {
      // Backup failure shouldn't block the user — they already accepted
      // the action. Log so it's visible if Stacey reports a missing
      // backup later.
      console.warn('Pre-action backup failed:', err)
    }
    return true
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
    downloadRows(rows, baseName, exportFormat, sheetName)
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
      <AppHeader
        activeView={activeView}
        projectId={projectId}
        saveStatus={saveStatus}
        accountEmail={session.user.email}
        modeItems={modeItems}
        sources={sources}
        codes={codes}
        excerpts={excerpts}
        cases={cases}
        memos={memos}
        onSelectView={selectView}
        onSelectSource={selectActiveSource}
        onSelectCode={setActiveCodeId}
        onSelectMemo={setActiveMemoId}
        onOpenAiSettings={() => setAiSettingsOpen(true)}
        onOpenAccountDelete={() => setAccountDeleteOpen(true)}
        onSignOut={signOut}
      />

      <aside
        className="workspace-sidebar"
        aria-label="Workspace sidebar"
      >
        {activeView === 'overview' && (
          <OverviewSidebar
            activeProjectId={projectId}
            projects={projectRows}
            isCreatingProject={isCreatingProject}
            onSelectProject={(project) => void applyProject(project)}
            onOpenNewProject={() => setTemplatePickerOpen(true)}
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
            onCreateFolder={createFolder}
            extraFolders={extraFolders}
          />
        )}

        {activeView !== 'organize' && activeView !== 'overview' && (
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
              newCodeName={newCodeName}
              onNewCodeNameChange={setNewCodeName}
              onAddCode={addCode}
              onDeleteCodes={deleteCodes}
            />
          )}
          <ScrollAffordance />
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
            <p>Pick a methodology-shaped starter codebook, open the sample to explore the app, or start from a blank canvas.</p>
            <div className="overview-empty-options">
              <button
                type="button"
                className="primary-button overview-empty-cta"
                onClick={() => setTemplatePickerOpen(true)}
                disabled={isCreatingProject}
              >
                <Plus size={16} aria-hidden="true" />
                New project…
              </button>
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
            isHostedAi={isHostedAi}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
            cases={cases}
            attributes={attributes}
            onNavigate={setActiveView}
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
            highlightedPages={highlightedPages}
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
            isHostedAi={isHostedAi}
            persistActiveCodes={persistActiveCodes}
            setPersistActiveCodes={setPersistActiveCodes}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
          />
        )}

        {projectId && activeView === 'refine' && (
          <RefineDetail
            activeCode={activeCode}
            codes={codes}
            codeExcerpts={codeExcerpts}
            allExcerpts={excerpts}
            parentCodeOptions={parentCodeOptions}
            updateExcerptNote={updateExcerptNote}
            deleteExcerpt={deleteExcerpt}
            removeCodeFromExcerpt={removeCodeFromExcerpt}
            splitExcerpt={splitExcerpt}
            splitCodeInto={splitCodeInto}
            onSelectCode={(id) => setActiveCodeId(id)}
            retagOrphan={retagOrphan}
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
            importAttributesFile={importAttributesFile}
            selectActiveSource={selectActiveSource}
            assignSourceToCase={assignSourceToCase}
            updateCase={updateCase}
            updateAttributeValue={updateAttributeValue}
            deleteCase={deleteCase}
          />
        )}

        {projectId && activeView === 'analyze' && (
          <AnalyzeDetail
            analyzePanel={analyzePanel}
            setAnalyzePanel={setAnalyzePanel}
            analyzePanelCount={analyzePanelCount}
            queryText={queryText}
            setQueryText={setQueryText}
            queryCodeId={queryCodeId}
            setQueryCodeId={setQueryCodeId}
            sortedCodes={sortedCodes}
            queryAdditionalCodeIds={queryAdditionalCodeIds}
            setQueryAdditionalCodeIds={setQueryAdditionalCodeIds}
            codes={codes}
            queryCaseId={queryCaseId}
            setQueryCaseId={setQueryCaseId}
            cases={cases}
            queryAttributes={queryAttributes}
            setQueryAttributes={setQueryAttributes}
            attributes={attributes}
            valuesForAttribute={valuesForAttribute}
            clearQueryFilters={clearQueryFilters}
            queryName={queryName}
            setQueryName={setQueryName}
            saveCurrentQuery={saveCurrentQuery}
            activeSavedQuery={activeSavedQuery}
            captureQuerySnapshot={captureQuerySnapshot}
            analyzeResults={analyzeResults}
            updateExcerptNote={updateExcerptNote}
            selectActiveSource={selectActiveSource}
            matrixColumnMode={matrixColumnMode}
            setMatrixColumnMode={setMatrixColumnMode}
            activeMatrixAttribute={activeMatrixAttribute}
            setMatrixAttributeId={setMatrixAttributeId}
            matrixRows={matrixRows}
            matrixColumns={matrixColumns}
            matrixCellInputs={matrixCellInputs}
            analyzeView={analyzeView}
            setAnalyzeView={setAnalyzeView}
            handleMatrixCellSelect={handleMatrixCellSelect}
            exportMatrixCsv={exportMatrixCsv}
            wordFrequencyViewRows={wordFrequencyViewRows}
            handleWordSelect={handleWordSelect}
            exportWordFrequencyCsv={exportWordFrequencyCsv}
            cooccurrencePairs={cooccurrencePairs}
            handlePairSelect={handlePairSelect}
            exportCoOccurrenceCsv={exportCoOccurrenceCsv}
            crosstabResult={crosstabResult}
            handleCrosstabCellSelect={handleCrosstabCellSelect}
            exportCrosstabCsv={exportCrosstabCsv}
          />
        )}

        {projectId && activeView === 'report' && <ReportDetail model={reportModel} />}
      </section>

      {activeView !== 'classify' && <aside className="properties-view">
        {activeView === 'overview' && (
          <OverviewInspector
            lineNumberingMode={lineNumberingMode}
            lineNumberingWidth={lineNumberingWidth}
            onOpenProjectSettings={() => setSettingsOpen(true)}
          />
        )}
        {activeView === 'organize' && (
          <OrganizeInspector
            key={activeSource.id}
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
            isHostedAi={isHostedAi}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
          />
        )}

        {activeView === 'code' && (
          <CodePickerPanel
            variant="code"
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
        {activeView === 'refine' && (
          <RefineInspector
            activeCode={activeCode}
            codes={codes}
            allExcerpts={excerpts}
            codeExcerpts={codeExcerpts}
            parentCodeOptions={parentCodeOptions}
            activeCodeParent={activeCodeParent}
            activeCodeChildren={activeCodeChildren}
            updateCode={updateCode}
            updateCodeParent={updateCodeParent}
            mergeActiveCodeIntoTarget={mergeActiveCodeIntoTarget}
            deleteActiveCode={deleteActiveCode}
            onSelectCode={(id) => setActiveCodeId(id)}
            onDraftDescription={handleDraftDescription}
            isHostedAi={isHostedAi}
            onOpenAiSettings={() => setAiSettingsOpen(true)}
          />
        )}

        {(activeView === 'organize' || activeView === 'code' || activeView === 'refine') && (
          <section className="panel" id="memo">
            <div className="panel-heading">
              <MessageSquareText size={18} aria-hidden="true" />
              <h2>{railMemoTitle}</h2>
            </div>
            <textarea value={contextualMemo?.body ?? ''} placeholder={`Add notes for ${railMemoTitle.toLowerCase()}`} onChange={(event) => updateRailMemo(event.target.value)} aria-label={railMemoTitle} />
            {railMemo && projectMemo && railMemo.id !== projectMemo.id && <p className="memo-link-note">Linked to this {railMemo.linkedType}.</p>}
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
            onUpdateSnapshotInclude={(id, include) => void updateSnapshotInclude(id, include)}
            onSendActiveAnalysisToReport={() => void sendActiveAnalysisToReport()}
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

        {activeView === 'code' && (
          <section className="panel">
          <div className="panel-heading">
            <Highlighter size={18} aria-hidden="true" />
            <h2>Excerpts</h2>
          </div>
          <ReferenceList excerpts={visibleExcerpts} codes={codes} onNoteChange={updateExcerptNote} onDelete={deleteExcerpt} onRemoveCode={removeCodeFromExcerpt} compact />
          </section>
        )}
        <ScrollAffordance />
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
    {accountDeleteOpen && session?.user?.email && (
      <AccountDeletePanel
        accountEmail={session.user.email}
        onClose={() => setAccountDeleteOpen(false)}
        onDeleted={() => {
          setAccountDeleteOpen(false)
          // Tear down local state — the server-side cascade has already
          // dropped every owned row, but the in-memory React state still
          // holds the last project's data. Resetting puts the user back
          // at the public landing once setSession(null) fires.
          setProjectId(null)
          setProjectRows([])
          setHasLoadedRemoteProject(false)
          setSession(null)
        }}
      />
    )}
    {templatePickerOpen && (
      <ResearchTemplatePicker
        busy={isCreatingProject}
        onCreate={(template, title) => void createProjectFromTemplate(template, title)}
        onClose={() => setTemplatePickerOpen(false)}
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
  newCodeName,
  onNewCodeNameChange,
  onAddCode,
  onDeleteCodes,
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
  newCodeName: string
  onNewCodeNameChange: (next: string) => void
  onDeleteCodes: (codeIds: string[]) => void
  onAddCode: () => void
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
          newCodeName={newCodeName}
          onNewCodeNameChange={onNewCodeNameChange}
          onAddCode={onAddCode}
          onDeleteCodes={onDeleteCodes}
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
