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
  codes: initialCodes,
  memos: initialMemos,
  excerpts: initialExcerpts,
}

const modeItems: Array<{ id: WorkspaceView; label: string; description: string; status: 'ready' | 'partial' | 'soon' }> = [
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.', status: 'ready' },
  { id: 'code', label: 'Code', description: 'Close-read sources and code selected passages.', status: 'ready' },
  { id: 'refine', label: 'Refine', description: 'Clean the codebook and review code references.', status: 'partial' },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.', status: 'soon' },
  { id: 'analyze', label: 'Analyze', description: 'Run searches, matrices, and comparisons.', status: 'partial' },
  { id: 'report', label: 'Report', description: 'Export excerpts, memos, and codebooks.', status: 'partial' },
]

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
    codes: project.codes?.length ? project.codes : defaultProject.codes,
    memos,
    excerpts: (project.excerpts ?? []).map((excerpt) => ({
      ...excerpt,
      sourceId: excerpt.sourceId || sources.find((source) => source.title === excerpt.sourceTitle)?.id || sources[0].id,
    })),
  }
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
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
  const [codes, setCodes] = useState(defaultProject.codes)
  const [memos, setMemos] = useState(defaultProject.memos)
  const [excerpts, setExcerpts] = useState(defaultProject.excerpts)
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([initialCodes[0].id])
  const [newCodeName, setNewCodeName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
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
    () => ({ activeSourceId, sources, codes, memos, excerpts }),
    [activeSourceId, codes, excerpts, memos, sources]
  )

  function applyProject(project: ProjectRow) {
    const nextProject = normalizeProject(project)

    setProjectId(project.id)
    setProjectTitle(project.title || 'Untitled project')
    setActiveView('organize')
    setActiveSourceId(nextProject.activeSourceId)
    setSources(nextProject.sources)
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
      setProjectRows((current) => [nextProject, ...current])
      setNewProjectTitle('')
      applyProject(nextProject)
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
            .eq('id', projectId)

          if (error) throw error
          setProjectRows((current) =>
            current.map((project) =>
              project.id === projectId
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

    const palette = ['#d9892b', '#2f7ebc', '#9b5a9f', '#5c8f42', '#c45173']
    const code: Code = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name,
      color: palette[codes.length % palette.length],
      description: 'New research code. Add a short meaning once the pattern becomes clear.',
    }

    setCodes((current) => [...current, code])
    setSelectedCodeIds((current) => [...current, code.id])
    setActiveCodeId(code.id)
    setSelectionHint(`Created "${name}" and added it to the active coding set.`)
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
    updateSource(activeSource.id, { caseName: activeSource.caseName?.trim() || activeSource.title })
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
      files.map(
        (file, index) =>
          new Promise<Source>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                id: `source-${Date.now()}-${index}`,
                title: file.name.replace(/\.[^.]+$/, ''),
                kind: file.name.toLowerCase().endsWith('.csv') ? 'Document' : 'Transcript',
                folder: targetFolder,
                content: String(reader.result ?? ''),
                importedAt: new Date().toISOString(),
              })
            }
            reader.readAsText(file)
          })
      )
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
        const excerptCodes = codes.filter((code) => excerpt.codeIds.includes(code.id))
        return [
          projectTitle,
          excerpt.sourceTitle,
          source?.folder ?? '',
          source?.caseName ?? '',
          excerptCodes.map((code) => code.name).join('; '),
          excerptCodes.map((code) => code.description).join('; '),
          excerpt.text,
          excerpt.note,
        ]
      }),
    ]

    downloadCsv(rows, 'fieldnote-coded-excerpts.csv')
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
          <div className="project-home-copy">
            <p className="eyebrow">Project Home</p>
            <h2>Choose a study before you organize, code, refine, or analyze.</h2>
            <p>Each project keeps its own sources, codebook, memos, excerpts, and later its own cases and reports.</p>
          </div>

          <section className="project-create-card">
            <div>
              <h2>New project</h2>
              <p>Start a separate workspace for another study, class, grant, dissertation, or paper.</p>
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
          </section>

          <section className="project-list-card">
            <div className="project-list-heading">
              <h2>Projects</h2>
              <button type="button" onClick={() => void loadProjectRows()}>
                Refresh
              </button>
            </div>

            {projectRows.length ? (
              <div className="project-list">
                {projectRows.map((project) => (
                  <button key={project.id} className="project-tile" type="button" onClick={() => applyProject(project)}>
                    <span className="project-tile-icon">
                      <FolderOpen size={19} aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{project.title || 'Untitled project'}</strong>
                      <small>
                        {(project.sources?.length ?? 0) || 1} sources - {(project.codes?.length ?? 0) || defaultProject.codes.length} codes -{' '}
                        {(project.excerpts?.length ?? 0) || 0} references
                      </small>
                    </span>
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

        <button className="project-switcher" type="button" onClick={returnToProjects} title="Back to project home">
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

      <aside className="workspace-sidebar" aria-label="Workspace sidebar">
        {activeView === 'organize' && (
          <section className="folder-pane" aria-label="Source folders">
            <div className="pane-title">
              <ListTree size={16} aria-hidden="true" />
              <span>Source folders</span>
            </div>
              <label className="folder-row import-row">
                <FilePlus2 size={16} aria-hidden="true" />
                Import sources
                <input type="file" accept=".txt,.md,.csv" multiple onChange={importTranscript} />
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
            codes={codes}
            excerpts={excerpts}
            onSelectSource={(id) => {
              setActiveSourceId(id)
              if (activeView === 'organize') return
              setActiveView('code')
            }}
            onSelectCode={(id) => {
              setActiveCodeId(id)
              setActiveView('refine')
            }}
          />
        </section>
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

          <div className="search-box">
            <Search size={17} aria-hidden="true" />
            <input value={searchTerm} placeholder="Find coded work" aria-label="Search coded work" onChange={(event) => setSearchTerm(event.target.value)} />
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
                <input type="file" accept=".txt,.md,.csv" multiple onChange={importTranscript} />
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

            <div className="reference-toolbar">
              <p className="detail-kicker">References</p>
              <button className="danger-text-button" type="button" onClick={deleteActiveCode}>
                <Trash2 size={15} aria-hidden="true" />
                Delete code
              </button>
            </div>

            <ReferenceList excerpts={codeExcerpts} codes={codes} onNoteChange={updateExcerptNote} onDelete={deleteExcerpt} onRemoveCode={removeCodeFromExcerpt} />
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Parent/child codes, merge, split, and codebook cleanup tools.</span>
            </div>
          </article>
        )}

        {activeView === 'classify' && (
          <article className="detail-card mode-placeholder">
            <p className="detail-kicker">Cases and attributes</p>
            <h2>Classify is reserved for the next MVP pass</h2>
            <p>Source-level case names already exist in Organize. This mode will turn those into a real case table with attributes.</p>
            <div className="placeholder-list">
              <span>Case table</span>
              <span>Attribute columns</span>
              <span>Source-to-case review</span>
            </div>
          </article>
        )}

        {activeView === 'analyze' && (
          <article className="detail-card analyze-surface">
            <p className="detail-kicker">Query results</p>
            <div className="search-box wide">
              <Search size={17} aria-hidden="true" />
              <input value={searchTerm} placeholder="Search coded excerpts" aria-label="Search coded excerpts" onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
            <ReferenceList excerpts={visibleExcerpts} codes={codes} onNoteChange={updateExcerptNote} onDelete={deleteExcerpt} onRemoveCode={removeCodeFromExcerpt} />
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
            <div className="coming-soon-strip">
              <strong>Coming soon</strong>
              <span>Memo export, report preview, and formatted Word/PDF outputs.</span>
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
              <input value={activeSource.caseName ?? ''} placeholder="No case assigned" onChange={(event) => updateSource(activeSource.id, { caseName: event.target.value })} />
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

        {activeView === 'code' && (
          <section className="panel" id="codes">
            <div className="panel-heading">
              <Tags size={18} aria-hidden="true" />
              <h2>Active Codes</h2>
            </div>
            <div className="code-picker">
              {codes.map((code) => (
                <button key={code.id} className={selectedCodeIds.includes(code.id) ? 'selected' : ''} type="button" aria-pressed={selectedCodeIds.includes(code.id)} onClick={() => toggleSelectedCode(code.id)}>
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
            </dl>
          </section>
        )}

        {(activeView === 'code' || activeView === 'refine' || activeView === 'analyze') && (
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
        <article className="empty-list-state">
          <Database size={20} aria-hidden="true" />
          <strong>Cases coming next</strong>
          <span>Participants, attributes, and classification sheets will live here.</span>
        </article>
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
  compact = false,
}: {
  excerpts: Excerpt[]
  codes: Code[]
  onNoteChange: (id: string, note: string) => void
  onDelete: (id: string) => void
  onRemoveCode: (excerptId: string, codeId: string) => void
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
