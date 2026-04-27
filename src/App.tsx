import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import {
  BookOpenText,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  FolderOpen,
  Highlighter,
  ListTree,
  LogIn,
  LogOut,
  MessageSquareText,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Tags,
  UserPlus,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type WorkspaceView = 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

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
  folder: 'Internals' | 'Externals'
  content: string
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

const modeItems: Array<{ id: WorkspaceView; label: string; description: string }> = [
  { id: 'organize', label: 'Organize', description: 'Import, prepare, and arrange sources.' },
  { id: 'code', label: 'Code', description: 'Close-read sources and code selected passages.' },
  { id: 'refine', label: 'Refine', description: 'Clean the codebook and review code references.' },
  { id: 'classify', label: 'Classify', description: 'Create cases, attributes, and metadata.' },
  { id: 'analyze', label: 'Analyze', description: 'Run searches, matrices, and comparisons.' },
  { id: 'report', label: 'Report', description: 'Export excerpts, memos, and codebooks.' },
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

  const activeSource = sources.find((source) => source.id === activeSourceId) ?? sources[0]
  const activeCode = codes.find((code) => code.id === activeCodeId) ?? codes[0]
  const activeMemo = memos.find((memo) => memo.id === activeMemoId) ?? memos[0]
  const selectedCodes = codes.filter((code) => selectedCodeIds.includes(code.id))
  const selectedCodeNames = selectedCodes.map((code) => code.name).join(', ')
  const sourceExcerpts = excerpts.filter((excerpt) => excerpt.sourceId === activeSource.id)
  const codeExcerpts = excerpts.filter((excerpt) => excerpt.codeIds.includes(activeCode.id))
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
      const { data: createdProject, error } = await supabase
        .from('fieldnote_projects')
        .insert({
          owner_id: session.user.id,
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
      setSaveStatus(error instanceof Error ? error.message : 'Could not create project.')
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
        setSaveStatus(error.message)
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
          setSaveStatus(error instanceof Error ? error.message : 'Save failed.')
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
    setActiveView('refine')
    setNewCodeName('')
  }

  function addMemo(linkedType: Memo['linkedType'] = activeView === 'refine' ? 'code' : activeView === 'code' ? 'source' : 'project') {
    const memo: Memo = {
      id: `memo-${Date.now()}`,
      title: linkedType === 'code' ? `${activeCode.name} memo` : linkedType === 'source' ? `${activeSource.title} memo` : 'New project memo',
      linkedType,
      linkedId: linkedType === 'code' ? activeCode.id : linkedType === 'source' ? activeSource.id : undefined,
      body: '',
    }

    setMemos((current) => [memo, ...current])
    setActiveMemoId(memo.id)
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

  function codeSelection() {
    const selectedText = window.getSelection()?.toString().trim()

    if (!selectedText || activeView !== 'code') {
      setSelectionHint(activeView === 'code' ? 'No text is selected yet. Drag across a phrase or paragraph first.' : 'Switch to Code mode before coding text.')
      return
    }

    setExcerpts((current) => [
      {
        id: `excerpt-${Date.now()}`,
        codeIds: selectedCodes.map((code) => code.id),
        sourceId: activeSource.id,
        sourceTitle: activeSource.title,
        text: selectedText,
        note: '',
      },
      ...current,
    ])
    setSelectionHint(`Coded selection as ${selectedCodeNames}.`)
    window.getSelection()?.removeAllRanges()
  }

  function updateSource(sourceId: string, patch: Partial<Source>) {
    setSources((current) => current.map((source) => (source.id === sourceId ? { ...source, ...patch } : source)))
    if (patch.title) {
      setExcerpts((current) => current.map((excerpt) => (excerpt.sourceId === sourceId ? { ...excerpt, sourceTitle: patch.title ?? excerpt.sourceTitle } : excerpt)))
    }
  }

  function updateMemo(memoId: string, patch: Partial<Memo>) {
    setMemos((current) => current.map((memo) => (memo.id === memoId ? { ...memo, ...patch } : memo)))
  }

  function updateExcerptNote(id: string, note: string) {
    setExcerpts((current) => current.map((excerpt) => (excerpt.id === id ? { ...excerpt, note } : excerpt)))
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
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const source: Source = {
        id: `source-${Date.now()}`,
        title: file.name.replace(/\.[^.]+$/, ''),
        kind: 'Transcript',
        folder: 'Internals',
        content: String(reader.result ?? ''),
      }
      setSources((current) => [source, ...current])
      setActiveSourceId(source.id)
      setActiveView('organize')
      setSelectionHint('Source imported. Select a passage to begin coding.')
      event.target.value = ''
    }
    reader.readAsText(file)
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
      ['Source', 'Codes', 'Excerpt', 'Note'],
      ...excerpts.map((excerpt) => [
        excerpt.sourceTitle,
        codes
          .filter((code) => excerpt.codeIds.includes(code.id))
          .map((code) => code.name)
          .join('; '),
        excerpt.text,
        excerpt.note,
      ]),
    ]

    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'fieldnote-coded-excerpts.csv'
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
              {mode.label}
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

      <aside className="navigation-view" aria-label="Navigation view">
        <div className="folder-pane">
          <div className="pane-title">
            <ListTree size={16} aria-hidden="true" />
            <span>{modeItems.find((mode) => mode.id === activeView)?.label} Mode</span>
          </div>
          {activeView === 'organize' && (
            <>
              <label className="folder-row import-row">
                <FilePlus2 size={16} aria-hidden="true" />
                Import source
                <input type="file" accept=".txt,.md,.csv" onChange={importTranscript} />
              </label>
              <button className="folder-row active" type="button">
                <FolderOpen size={16} aria-hidden="true" />
                Internals
              </button>
            </>
          )}
          {activeView === 'code' && (
            <>
              <button className="folder-row active" type="button">
                <BookOpenText size={16} aria-hidden="true" />
                Open source
              </button>
              <button className="folder-row" type="button" onClick={() => addMemo('source')}>
                <MessageSquareText size={16} aria-hidden="true" />
                Source memo
              </button>
            </>
          )}
          {activeView === 'refine' && (
            <>
              <button className="folder-row active" type="button">
                <Tags size={16} aria-hidden="true" />
                Codebook
              </button>
              <button className="folder-row" type="button" onClick={() => addMemo('code')}>
                <MessageSquareText size={16} aria-hidden="true" />
                Code memo
              </button>
            </>
          )}
          {activeView === 'classify' && (
            <button className="folder-row active" type="button">
              <Database size={16} aria-hidden="true" />
              Cases and attributes
            </button>
          )}
          {activeView === 'analyze' && (
            <>
              <button className="folder-row active" type="button">
                <Search size={16} aria-hidden="true" />
                Text search
              </button>
              <button className="folder-row" type="button">
                <Rows3 size={16} aria-hidden="true" />
                Matrix coding
              </button>
            </>
          )}
          {activeView === 'report' && (
            <>
              <button className="folder-row active" type="button" onClick={exportCsv}>
                <Download size={16} aria-hidden="true" />
                Coded excerpts
              </button>
              <button className="folder-row" type="button">
                <FileText size={16} aria-hidden="true" />
                Codebook
              </button>
            </>
          )}
        </div>
      </aside>

      <section className="list-view" aria-label="List view">
        <ListView
          activeView={activeView}
          activeSourceId={activeSource.id}
          activeCodeId={activeCode.id}
          sources={sources}
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

      <section className="detail-view" id="sources">
        <header className="detail-toolbar">
          <div>
            <p className="eyebrow">Detail View</p>
            <DetailTitle
              activeView={activeView}
              activeSource={activeSource}
              activeCode={activeCode}
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
            <p className="detail-kicker">Sources</p>
            <div className="source-table">
              {sources.map((source) => (
                <button key={source.id} className={source.id === activeSource.id ? 'source-row active' : 'source-row'} type="button" onClick={() => setActiveSourceId(source.id)}>
                  <span>{source.title}</span>
                  <small>{source.kind}</small>
                  <small>{excerpts.filter((excerpt) => excerpt.sourceId === source.id).length} references</small>
                </button>
              ))}
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
          <article className="detail-card">
            <p className="detail-kicker">Node references</p>
            <textarea
              className="code-description"
              value={activeCode.description}
              aria-label="Code description"
              onChange={(event) => setCodes((current) => current.map((code) => (code.id === activeCode.id ? { ...code, description: event.target.value } : code)))}
            />
            <ReferenceList excerpts={codeExcerpts} codes={codes} onNoteChange={updateExcerptNote} />
          </article>
        )}

        {activeView === 'classify' && (
          <article className="detail-card mode-placeholder">
            <p className="detail-kicker">Cases and attributes</p>
            <h2>Classify sources into cases</h2>
            <p>Use this mode to create participants, assign sources to cases, and add attributes like cohort, role, site, or demographic fields.</p>
          </article>
        )}

        {activeView === 'analyze' && (
          <article className="detail-card analyze-surface">
            <p className="detail-kicker">Query results</p>
            <div className="search-box wide">
              <Search size={17} aria-hidden="true" />
              <input value={searchTerm} placeholder="Search coded excerpts" aria-label="Search coded excerpts" onChange={(event) => setSearchTerm(event.target.value)} />
            </div>
            <ReferenceList excerpts={visibleExcerpts} codes={codes} onNoteChange={updateExcerptNote} />
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
            <button className="report-card" type="button">
              <FileText size={20} aria-hidden="true" />
              <span>
                <strong>Codebook</strong>
                <small>Code names, descriptions, counts, and examples. Not implemented yet.</small>
              </span>
            </button>
          </article>
        )}
      </section>

      <aside className="properties-view">
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

        <section className="panel">
          <div className="panel-heading">
            <Database size={18} aria-hidden="true" />
            <h2>Item Properties</h2>
          </div>
          <dl className="properties-list">
            <div>
              <dt>Project</dt>
              <dd>{projectTitle}</dd>
            </div>
            <div>
              <dt>Sources</dt>
              <dd>{sources.length}</dd>
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

        <section className="panel" id="memo">
          <div className="panel-heading">
            <MessageSquareText size={18} aria-hidden="true" />
            <h2>{railMemoTitle}</h2>
          </div>
          <textarea value={contextualMemo?.body ?? ''} placeholder={`Add notes for ${railMemoTitle.toLowerCase()}`} onChange={(event) => updateRailMemo(event.target.value)} aria-label={railMemoTitle} />
          {railMemo.id !== projectMemo.id && <p className="memo-link-note">Linked to this {railMemo.linkedType}.</p>}
        </section>

        {activeView === 'analyze' && (
          <section className="panel" id="assistant">
          <div className="panel-heading">
            <Sparkles size={18} aria-hidden="true" />
            <h2>AI draft</h2>
          </div>
          <p className="ai-note">Early theme: participants describe access as emotional labor, not just administrative difficulty.</p>
          <div className="theme-pair">
            {codes.slice(0, 2).map((code) => (
              <span key={code.id} style={{ borderColor: code.color }}>
                {code.name}
              </span>
            ))}
          </div>
          <button type="button" className="secondary-button">
            Suggest child codes
          </button>
          </section>
        )}

        {(activeView === 'code' || activeView === 'refine' || activeView === 'analyze') && (
          <section className="panel">
          <div className="panel-heading">
            <Highlighter size={18} aria-hidden="true" />
            <h2>Coded excerpts</h2>
          </div>
          <ReferenceList excerpts={visibleExcerpts} codes={codes} onNoteChange={updateExcerptNote} compact />
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
  codes,
  excerpts,
  onSelectSource,
  onSelectCode,
}: {
  activeView: WorkspaceView
  activeSourceId: string
  activeCodeId: string
  sources: Source[]
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
        sources.map((source) => (
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
        <>
          <button className="list-item active" type="button">
            <Download size={17} aria-hidden="true" />
            <div>
              <strong>Coded excerpts</strong>
              <span>CSV export available</span>
            </div>
          </button>
          <button className="list-item" type="button">
            <FileText size={17} aria-hidden="true" />
            <div>
              <strong>Codebook</strong>
              <span>Not implemented yet</span>
            </div>
          </button>
        </>
      )}
    </>
  )
}

function DetailTitle({
  activeView,
  activeSource,
  activeCode,
  onSourceTitleChange,
  onCodeNameChange,
}: {
  activeView: WorkspaceView
  activeSource: Source
  activeCode: Code
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
    return <input className="title-input" value={activeSource.title} aria-label="Source title" onChange={(event) => onSourceTitleChange(event.target.value)} />
  }
  return <input className="title-input" value={activeSource.title} aria-label="Source title" onChange={(event) => onSourceTitleChange(event.target.value)} />
}

function ReferenceList({
  excerpts,
  codes,
  onNoteChange,
  compact = false,
}: {
  excerpts: Excerpt[]
  codes: Code[]
  onNoteChange: (id: string, note: string) => void
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
              <div className="code-stack" aria-hidden="true">
                {excerptCodes.map((code) => (
                  <span key={code.id} style={{ background: code.color }} />
                ))}
              </div>
              <strong>{excerptCodes.map((code) => code.name).join(', ') || 'Unknown code'}</strong>
              <small>{excerpt.sourceTitle}</small>
            </div>
            <p>{excerpt.text}</p>
            <input value={excerpt.note} placeholder="Add note" aria-label="Reference note" onChange={(event) => onNoteChange(excerpt.id, event.target.value)} />
          </article>
        )
      })}
    </div>
  )
}

export default App
