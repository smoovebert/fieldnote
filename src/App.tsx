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
  ListTree,
  Layers3,
  LogIn,
  LogOut,
  MessageSquareText,
  Network,
  Rows3,
  Plus,
  Search,
  Sparkles,
  Tags,
  UserPlus,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type Code = {
  id: string
  name: string
  color: string
  description: string
}

type Excerpt = {
  id: string
  codeIds: string[]
  sourceTitle: string
  text: string
  note: string
}

type ProjectData = {
  sourceTitle: string
  transcript: string
  memo: string
  codes: Code[]
  excerpts: Excerpt[]
}

type ProjectRow = {
  id: string
  title: string
  source_title: string
  transcript: string
  memo: string
  codes: Code[]
  excerpts: Excerpt[]
}

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

const sampleTranscript = `Interviewer: Can you tell me what made the application process difficult?

Participant: It was not just one thing. The form asked for documents I did not have anymore, and every office told me to call someone else. After a while it felt like the system was testing whether I would give up.

Interviewer: What helped you keep going?

Participant: The campus advisor. She explained the steps in plain language and wrote down what to bring next time. That made me feel like I was not doing something wrong.

Interviewer: Did the process affect how you thought about the university?

Participant: Yes. I wanted to trust it, but the process made the university feel far away from people like me. Once I met someone who listened, it changed. But it should not depend on finding one helpful person.`

const initialExcerpts: Excerpt[] = [
  {
    id: 'excerpt-1',
    codeIds: ['access', 'trust'],
    sourceTitle: 'Interview 03',
    text: 'every office told me to call someone else. After a while it felt like the system was testing whether I would give up.',
    note: 'Strong quote for bureaucratic exhaustion.',
  },
  {
    id: 'excerpt-2',
    codeIds: ['trust', 'identity'],
    sourceTitle: 'Interview 03',
    text: 'Once I met someone who listened, it changed. But it should not depend on finding one helpful person.',
    note: 'Useful for the contrast between institution and individual care.',
  },
]

const defaultProject: ProjectData = {
  sourceTitle: 'Interview 03',
  transcript: sampleTranscript,
  memo: 'The clearest early pattern is not simple dissatisfaction. Participants describe systems that feel illegible until a specific person translates them.',
  codes: initialCodes,
  excerpts: initialExcerpts,
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authStatus, setAuthStatus] = useState('Sign in to sync your research workspace.')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [sourceTitle, setSourceTitle] = useState(defaultProject.sourceTitle)
  const [transcript, setTranscript] = useState(defaultProject.transcript)
  const [codes, setCodes] = useState(defaultProject.codes)
  const [excerpts, setExcerpts] = useState(defaultProject.excerpts)
  const [selectedCodeIds, setSelectedCodeIds] = useState<string[]>([initialCodes[0].id])
  const [newCodeName, setNewCodeName] = useState('')
  const [memo, setMemo] = useState(defaultProject.memo)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectionHint, setSelectionHint] = useState('Select text in the transcript, then click Code selection.')
  const [saveStatus, setSaveStatus] = useState('Sign in to sync.')
  const hasLoadedRemoteProject = useRef(false)

  const selectedCodes = codes.filter((code) => selectedCodeIds.includes(code.id))
  const selectedCodeNames = selectedCodes.map((code) => code.name).join(', ')
  const accessCode = codes.find((code) => code.id === 'access')
  const trustCode = codes.find((code) => code.id === 'trust')
  const projectData = useMemo<ProjectData>(
    () => ({ sourceTitle, transcript, memo, codes, excerpts }),
    [codes, excerpts, memo, sourceTitle, transcript]
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
          source_title: defaultProject.sourceTitle,
          transcript: defaultProject.transcript,
          memo: defaultProject.memo,
          codes: defaultProject.codes,
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

        setProjectId(project.id)
        setSourceTitle(project.source_title || defaultProject.sourceTitle)
        setTranscript(project.transcript || '')
        setMemo(project.memo || '')
        setCodes(project.codes?.length ? project.codes : defaultProject.codes)
        setExcerpts(project.excerpts ?? [])
        setSelectedCodeIds(project.codes?.[0]?.id ? [project.codes[0].id] : [initialCodes[0].id])
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
              source_title: projectData.sourceTitle,
              transcript: projectData.transcript,
              memo: projectData.memo,
              codes: projectData.codes,
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
  }, [projectData, projectId, session])

  const visibleExcerpts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return excerpts

    return excerpts.filter((excerpt) => {
      const excerptCodes = codes.filter((item) => excerpt.codeIds.includes(item.id)).map((code) => code.name)
      return [excerpt.text, excerpt.note, excerpt.sourceTitle, ...excerptCodes]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [codes, excerpts, searchTerm])

  const highlightedTranscript = useMemo(() => {
    let pieces: Array<{ text: string; codes?: Code[] }> = [{ text: transcript }]

    excerpts.forEach((excerpt) => {
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
  }, [codes, excerpts, transcript])

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
    setNewCodeName('')
  }

  function toggleSelectedCode(codeId: string) {
    setSelectedCodeIds((current) => {
      if (current.includes(codeId)) {
        return current.length === 1 ? current : current.filter((id) => id !== codeId)
      }

      return [...current, codeId]
    })
  }

  function codeSelection() {
    const selectedText = window.getSelection()?.toString().trim()

    if (!selectedText) {
      setSelectionHint('No text is selected yet. Drag across a phrase or paragraph first.')
      return
    }

    setExcerpts((current) => [
      {
        id: `excerpt-${Date.now()}`,
        codeIds: selectedCodes.map((code) => code.id),
        sourceTitle,
        text: selectedText,
        note: '',
      },
      ...current,
    ])
    setSelectionHint(`Coded selection as ${selectedCodeNames}.`)
    window.getSelection()?.removeAllRanges()
  }

  function updateExcerptNote(id: string, note: string) {
    setExcerpts((current) => current.map((excerpt) => (excerpt.id === id ? { ...excerpt, note } : excerpt)))
  }

  function importTranscript(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setTranscript(String(reader.result ?? ''))
      setSourceTitle(file.name.replace(/\.[^.]+$/, ''))
      setSelectionHint('Transcript imported. Select a passage to begin coding.')
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
      authMode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)

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

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n')
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

          <button
            className="auth-switch"
            type="button"
            onClick={() => setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
          >
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
          <button className="active" type="button">
            <Home size={16} aria-hidden="true" />
            Home
          </button>
          <button type="button">
            <Plus size={16} aria-hidden="true" />
            Create
          </button>
          <button type="button">
            <Database size={16} aria-hidden="true" />
            Data
          </button>
          <button type="button">
            <Search size={16} aria-hidden="true" />
            Query
          </button>
          <button type="button">
            <Download size={16} aria-hidden="true" />
            Share
          </button>
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
            <button className="ribbon-command" type="button">
              <MessageSquareText size={18} aria-hidden="true" />
              <span>Memo</span>
            </button>
            <button className="ribbon-command" type="button">
              <Sparkles size={18} aria-hidden="true" />
              <span>Suggest</span>
            </button>
          </div>

          <div className="ribbon-group">
            <button className="ribbon-command" type="button">
              <Rows3 size={18} aria-hidden="true" />
              <span>Matrix</span>
            </button>
            <button className="ribbon-command" type="button">
              <BarChart3 size={18} aria-hidden="true" />
              <span>Chart</span>
            </button>
            <button className="ribbon-command" type="button">
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
          <button className="folder-row active" type="button">
            <FolderOpen size={16} aria-hidden="true" />
            Internals
          </button>
          <button className="folder-row" type="button">
            <MessageSquareText size={16} aria-hidden="true" />
            Memos
          </button>
          <button className="folder-row" type="button">
            <Tags size={16} aria-hidden="true" />
            Codes
          </button>
          <button className="folder-row" type="button">
            <GitBranch size={16} aria-hidden="true" />
            Relationships
          </button>
        </div>

        <nav className="section-switcher" aria-label="Project areas">
          <a className="active" href="#sources">
            <BookOpenText size={18} aria-hidden="true" />
            Sources
          </a>
          <a href="#codes">
            <Layers3 size={18} aria-hidden="true" />
            Codes
          </a>
          <a href="#memo">
            <MessageSquareText size={18} aria-hidden="true" />
            Memos
          </a>
          <a href="#assistant">
            <Sparkles size={18} aria-hidden="true" />
            AI draft
          </a>
        </nav>
      </aside>

      <section className="list-view" aria-label="List view">
        <div className="pane-title">
          <FileText size={16} aria-hidden="true" />
          <span>List View</span>
        </div>
        <article className="list-item active">
          <FileText size={17} aria-hidden="true" />
          <div>
            <strong>{sourceTitle}</strong>
            <span>Transcript - {excerpts.length} references</span>
          </div>
        </article>
        <article className="list-item">
          <MessageSquareText size={17} aria-hidden="true" />
          <div>
            <strong>Project memo</strong>
            <span>Analytic notes</span>
          </div>
        </article>
        {codes.map((code) => (
          <article className="list-item" key={code.id}>
            <span className="code-dot" style={{ background: code.color }} />
            <div>
              <strong>{code.name}</strong>
              <span>{excerpts.filter((excerpt) => excerpt.codeIds.includes(code.id)).length} references</span>
            </div>
          </article>
        ))}
      </section>

      <section className="detail-view" id="sources">
        <header className="detail-toolbar">
          <div>
            <p className="eyebrow">Detail View</p>
            <input
              className="title-input"
              value={sourceTitle}
              aria-label="Source title"
              onChange={(event) => setSourceTitle(event.target.value)}
            />
          </div>

          <div className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              value={searchTerm}
              placeholder="Find coded work"
              aria-label="Search coded work"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </header>

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

          <div className="transcript" aria-label="Transcript text">
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
      </section>

      <aside className="properties-view">
        <section className="panel" id="codes">
          <div className="panel-heading">
            <Tags size={18} aria-hidden="true" />
            <h2>Active Codes</h2>
          </div>
          <div className="code-picker">
            {codes.map((code) => (
              <button
                key={code.id}
                className={selectedCodeIds.includes(code.id) ? 'selected' : ''}
                type="button"
                aria-pressed={selectedCodeIds.includes(code.id)}
                onClick={() => toggleSelectedCode(code.id)}
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
              <dt>Source type</dt>
              <dd>Interview transcript</dd>
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
            <h2>Project memo</h2>
          </div>
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} aria-label="Project memo" />
        </section>

        <section className="panel" id="assistant">
          <div className="panel-heading">
            <Sparkles size={18} aria-hidden="true" />
            <h2>AI draft</h2>
          </div>
          <p className="ai-note">
            Early theme: participants describe access as emotional labor, not just administrative difficulty.
          </p>
          <div className="theme-pair">
            {accessCode && <span style={{ borderColor: accessCode.color }}>{accessCode.name}</span>}
            {trustCode && <span style={{ borderColor: trustCode.color }}>{trustCode.name}</span>}
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
          <div className="excerpt-list">
            {visibleExcerpts.map((excerpt) => {
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
                  <input
                    value={excerpt.note}
                    placeholder="Add note"
                    aria-label={`Note for ${excerptCodes.map((code) => code.name).join(', ') || 'excerpt'}`}
                    onChange={(event) => updateExcerptNote(excerpt.id, event.target.value)}
                  />
                </article>
              )
            })}
          </div>
        </section>
      </aside>
    </main>
  )
}

export default App
