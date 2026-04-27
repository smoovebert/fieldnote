import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import {
  BarChart3,
  BookOpenText,
  Cloud,
  Database,
  Download,
  FilePlus2,
  FileText,
  FolderOpen,
  GitBranch,
  Highlighter,
  Home,
  Layers3,
  ListTree,
  LogIn,
  LogOut,
  MessageSquareText,
  Network,
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

type WorkspaceView = 'sources' | 'codes' | 'memos' | 'relationships'

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
  const [activeView, setActiveView] = useState<WorkspaceView>('sources')
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
    activeView === 'sources'
      ? memos.find((memo) => memo.linkedType === 'source' && memo.linkedId === activeSource.id)
      : activeView === 'codes'
        ? memos.find((memo) => memo.linkedType === 'code' && memo.linkedId === activeCode.id)
        : activeView === 'memos'
          ? activeMemo
          : projectMemo
  const railMemo = contextualMemo ?? projectMemo
  const railMemoTitle =
    activeView === 'sources'
      ? `${activeSource.title} memo`
      : activeView === 'codes'
        ? `${activeCode.name} memo`
        : activeView === 'memos'
          ? activeMemo.title
          : 'Project memo'
  const projectData = useMemo<ProjectData>(
    () => ({ activeSourceId, sources, codes, memos, excerpts }),
    [activeSourceId, codes, excerpts, memos, sources]
  )

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
        setSaveStatus('Sign in to sync.')
      })
      return
    }

    let isCurrent = true
    hasLoadedRemoteProject.current = false
    queueMicrotask(() => setSaveStatus('Loading your project...'))

    async function loadProject() {
      const userId = session?.user.id
      if (!userId) return

      const { data: existingProject, error: loadError } = await supabase
        .from('fieldnote_projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (loadError) throw loadError
      if (existingProject) return existingProject as ProjectRow

      const { data: createdProject, error: createError } = await supabase
        .from('fieldnote_projects')
        .insert({
          owner_id: userId,
          title: 'Student Access Study',
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

      if (createError) throw createError
      return createdProject as ProjectRow
    }

    loadProject()
      .then((project) => {
        if (!isCurrent || !project) return
        const nextProject = normalizeProject(project)

        setProjectId(project.id)
        setActiveSourceId(nextProject.activeSourceId)
        setSources(nextProject.sources)
        setCodes(nextProject.codes)
        setMemos(nextProject.memos)
        setExcerpts(nextProject.excerpts)
        setActiveCodeId(nextProject.codes[0]?.id ?? initialCodes[0].id)
        setActiveMemoId(nextProject.memos[0]?.id ?? initialMemos[0].id)
        setSelectedCodeIds(nextProject.codes[0]?.id ? [nextProject.codes[0].id] : [initialCodes[0].id])
        hasLoadedRemoteProject.current = true
        setSaveStatus('Synced with Supabase.')
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
          setSaveStatus('Saved to Supabase.')
        } catch (error) {
          setSaveStatus(error instanceof Error ? error.message : 'Save failed.')
        }
      }

      void saveProject()
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [activeSource.content, activeSource.title, projectData, projectId, projectMemo.body, session])

  const visibleExcerpts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const list = activeView === 'codes' ? codeExcerpts : activeView === 'sources' ? sourceExcerpts : excerpts
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
    setActiveView('codes')
    setNewCodeName('')
  }

  function addMemo(linkedType: Memo['linkedType'] = activeView === 'codes' ? 'code' : activeView === 'sources' ? 'source' : 'project') {
    const memo: Memo = {
      id: `memo-${Date.now()}`,
      title: linkedType === 'code' ? `${activeCode.name} memo` : linkedType === 'source' ? `${activeSource.title} memo` : 'New project memo',
      linkedType,
      linkedId: linkedType === 'code' ? activeCode.id : linkedType === 'source' ? activeSource.id : undefined,
      body: '',
    }

    setMemos((current) => [memo, ...current])
    setActiveMemoId(memo.id)
    setActiveView('memos')
  }

  function toggleSelectedCode(codeId: string) {
    setSelectedCodeIds((current) => {
      if (current.includes(codeId)) return current.length === 1 ? current : current.filter((id) => id !== codeId)
      return [...current, codeId]
    })
  }

  function selectView(view: WorkspaceView) {
    setActiveView(view)
    if (view === 'codes') setActiveCodeId(codes[0]?.id ?? '')
    if (view === 'memos') setActiveMemoId(memos[0]?.id ?? '')
  }

  function codeSelection() {
    const selectedText = window.getSelection()?.toString().trim()

    if (!selectedText || activeView !== 'sources') {
      setSelectionHint(activeView === 'sources' ? 'No text is selected yet. Drag across a phrase or paragraph first.' : 'Open a source before coding text.')
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

    const linkedType: Memo['linkedType'] = activeView === 'sources' ? 'source' : activeView === 'codes' ? 'code' : 'project'
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
      setActiveView('sources')
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
          <div className="user-box">
            <span>{session.user.email}</span>
            <button type="button" onClick={signOut}>
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="ribbon" aria-label="Command ribbon">
        <nav className="ribbon-tabs" aria-label="Ribbon tabs">
          {[
            ['Home', Home],
            ['Create', Plus],
            ['Data', Database],
            ['Query', Search],
            ['Share', Download],
          ].map(([label, Icon], index) => (
            <button className={index === 0 ? 'active' : ''} type="button" key={String(label)}>
              <Icon size={16} aria-hidden="true" />
              {String(label)}
            </button>
          ))}
        </nav>

        <div className="ribbon-groups">
          <div className="ribbon-group">
            <label className="ribbon-command primary-command">
              <FilePlus2 size={18} aria-hidden="true" />
              <span>Import</span>
              <input type="file" accept=".txt,.md,.csv" onChange={importTranscript} />
            </label>
            <button className="ribbon-command" type="button" onClick={exportCsv}>
              <Download size={18} aria-hidden="true" />
              <span>Export</span>
            </button>
          </div>

          <div className="ribbon-group">
            <button className="ribbon-command" type="button" onClick={codeSelection}>
              <Highlighter size={18} aria-hidden="true" />
              <span>Code</span>
            </button>
            <button className="ribbon-command" type="button" onClick={() => addMemo()}>
              <MessageSquareText size={18} aria-hidden="true" />
              <span>Memo</span>
            </button>
            <button className="ribbon-command" type="button">
              <Sparkles size={18} aria-hidden="true" />
              <span>Suggest</span>
            </button>
          </div>

          <div className="ribbon-group">
            <button className="ribbon-command" type="button" onClick={() => selectView('codes')}>
              <Rows3 size={18} aria-hidden="true" />
              <span>Matrix</span>
            </button>
            <button className="ribbon-command" type="button">
              <BarChart3 size={18} aria-hidden="true" />
              <span>Chart</span>
            </button>
            <button className="ribbon-command" type="button" onClick={() => selectView('relationships')}>
              <Network size={18} aria-hidden="true" />
              <span>Map</span>
            </button>
          </div>
        </div>
      </section>

      <aside className="navigation-view" aria-label="Navigation view">
        <div className="folder-pane">
          <div className="pane-title">
            <ListTree size={16} aria-hidden="true" />
            <span>Navigation View</span>
          </div>
          <button className={activeView === 'sources' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectView('sources')}>
            <FolderOpen size={16} aria-hidden="true" />
            Internals
          </button>
          <button className={activeView === 'memos' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectView('memos')}>
            <MessageSquareText size={16} aria-hidden="true" />
            Memos
          </button>
          <button className={activeView === 'codes' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectView('codes')}>
            <Tags size={16} aria-hidden="true" />
            Codes
          </button>
          <button className={activeView === 'relationships' ? 'folder-row active' : 'folder-row'} type="button" onClick={() => selectView('relationships')}>
            <GitBranch size={16} aria-hidden="true" />
            Relationships
          </button>
        </div>

        <nav className="section-switcher" aria-label="Project areas">
          {[
            ['sources', BookOpenText, 'Sources'],
            ['codes', Layers3, 'Codes'],
            ['memos', MessageSquareText, 'Memos'],
            ['relationships', Sparkles, 'Maps'],
          ].map(([view, Icon, label]) => (
            <button key={String(view)} className={activeView === view ? 'active' : ''} type="button" onClick={() => selectView(view as WorkspaceView)}>
              <Icon size={18} aria-hidden="true" />
              {String(label)}
            </button>
          ))}
        </nav>
      </aside>

      <section className="list-view" aria-label="List view">
        <ListView
          activeView={activeView}
          activeSourceId={activeSource.id}
          activeCodeId={activeCode.id}
          activeMemoId={activeMemo.id}
          sources={sources}
          codes={codes}
          memos={memos}
          excerpts={excerpts}
          onSelectSource={(id) => {
            setActiveSourceId(id)
            setActiveView('sources')
          }}
          onSelectCode={(id) => {
            setActiveCodeId(id)
            setActiveView('codes')
          }}
          onSelectMemo={(id) => {
            setActiveMemoId(id)
            setActiveView('memos')
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
              activeMemo={activeMemo}
              onSourceTitleChange={(title) => updateSource(activeSource.id, { title })}
              onCodeNameChange={(name) => setCodes((current) => current.map((code) => (code.id === activeCode.id ? { ...code, name } : code)))}
              onMemoTitleChange={(title) => updateMemo(activeMemo.id, { title })}
            />
          </div>

          <div className="search-box">
            <Search size={17} aria-hidden="true" />
            <input value={searchTerm} placeholder="Find coded work" aria-label="Search coded work" onChange={(event) => setSearchTerm(event.target.value)} />
          </div>
        </header>

        {activeView === 'sources' && (
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

        {activeView === 'codes' && (
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

        {activeView === 'memos' && (
          <article className="detail-card">
            <p className="detail-kicker">Linked memo</p>
            <textarea className="memo-editor" value={activeMemo.body} aria-label="Memo body" onChange={(event) => updateMemo(activeMemo.id, { body: event.target.value })} />
          </article>
        )}

        {activeView === 'relationships' && (
          <article className="detail-card relationship-map">
            <p className="detail-kicker">Relationship map</p>
            <div className="map-node source-node">{activeSource.title}</div>
            <div className="map-line" />
            <div className="map-node code-node">{activeCode.name}</div>
            <p className="map-caption">Relationships are tracked as a workspace mode now. The next pass can make these editable links between cases, sources, and codes.</p>
          </article>
        )}
      </section>

      <aside className="properties-view">
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

        <section className="panel">
          <div className="panel-heading">
            <Database size={18} aria-hidden="true" />
            <h2>Item Properties</h2>
          </div>
          <dl className="properties-list">
            <div>
              <dt>Project</dt>
              <dd>Student Access Study</dd>
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

        <section className="panel">
          <div className="panel-heading">
            <Highlighter size={18} aria-hidden="true" />
            <h2>Coded excerpts</h2>
          </div>
          <ReferenceList excerpts={visibleExcerpts} codes={codes} onNoteChange={updateExcerptNote} compact />
        </section>
      </aside>
    </main>
  )
}

function ListView({
  activeView,
  activeSourceId,
  activeCodeId,
  activeMemoId,
  sources,
  codes,
  memos,
  excerpts,
  onSelectSource,
  onSelectCode,
  onSelectMemo,
}: {
  activeView: WorkspaceView
  activeSourceId: string
  activeCodeId: string
  activeMemoId: string
  sources: Source[]
  codes: Code[]
  memos: Memo[]
  excerpts: Excerpt[]
  onSelectSource: (id: string) => void
  onSelectCode: (id: string) => void
  onSelectMemo: (id: string) => void
}) {
  return (
    <>
      <div className="pane-title">
        <FileText size={16} aria-hidden="true" />
        <span>List View</span>
      </div>
      {activeView === 'sources' &&
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
      {activeView === 'codes' &&
        codes.map((code) => (
          <button className={code.id === activeCodeId ? 'list-item active' : 'list-item'} key={code.id} type="button" onClick={() => onSelectCode(code.id)}>
            <span className="code-dot" style={{ background: code.color }} />
            <div>
              <strong>{code.name}</strong>
              <span>{excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id)).length} references</span>
            </div>
          </button>
        ))}
      {activeView === 'memos' &&
        memos.map((memo) => (
          <button className={memo.id === activeMemoId ? 'list-item active' : 'list-item'} key={memo.id} type="button" onClick={() => onSelectMemo(memo.id)}>
            <MessageSquareText size={17} aria-hidden="true" />
            <div>
              <strong>{memo.title}</strong>
              <span>{memo.linkedType} memo</span>
            </div>
          </button>
        ))}
      {activeView === 'relationships' && (
        <article className="empty-list-state">
          <GitBranch size={20} aria-hidden="true" />
          <strong>No relationships yet</strong>
          <span>Use this area for future case, code, and source links.</span>
        </article>
      )}
    </>
  )
}

function DetailTitle({
  activeView,
  activeSource,
  activeCode,
  activeMemo,
  onSourceTitleChange,
  onCodeNameChange,
  onMemoTitleChange,
}: {
  activeView: WorkspaceView
  activeSource: Source
  activeCode: Code
  activeMemo: Memo
  onSourceTitleChange: (title: string) => void
  onCodeNameChange: (name: string) => void
  onMemoTitleChange: (title: string) => void
}) {
  if (activeView === 'codes') {
    return <input className="title-input" value={activeCode.name} aria-label="Code name" onChange={(event) => onCodeNameChange(event.target.value)} />
  }
  if (activeView === 'memos') {
    return <input className="title-input" value={activeMemo.title} aria-label="Memo title" onChange={(event) => onMemoTitleChange(event.target.value)} />
  }
  if (activeView === 'relationships') {
    return <h2 className="static-detail-title">Relationships</h2>
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
