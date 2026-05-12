import type { LucideIcon } from 'lucide-react'
import { HeaderSearch } from './HeaderSearch'
import { ProfileMenu } from './ProfileMenu'
import type { Case, Code, Excerpt, Memo, Source } from '../lib/types'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

export type HeaderModeItem = {
  id: WorkspaceView
  label: string
  description: string
  status: 'ready' | 'partial' | 'soon'
  icon: LucideIcon
}

type Props = {
  activeView: WorkspaceView
  projectId: string | null
  saveStatus: string
  accountEmail?: string | null
  modeItems: HeaderModeItem[]
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  cases: Case[]
  memos: Memo[]
  onSelectView: (view: WorkspaceView) => void
  onSelectSource: (sourceId: string) => void
  onSelectCode: (codeId: string) => void
  onSelectMemo: (memoId: string) => void
  onOpenAiSettings: () => void
  onOpenAccountDelete: () => void
  onSignOut: () => Promise<void>
}

export function AppHeader({
  activeView,
  projectId,
  saveStatus,
  accountEmail,
  modeItems,
  sources,
  codes,
  excerpts,
  cases,
  memos,
  onSelectView,
  onSelectSource,
  onSelectCode,
  onSelectMemo,
  onOpenAiSettings,
  onOpenAccountDelete,
  onSignOut,
}: Props) {
  const isError = /save failed|could not|error|invalid/i.test(saveStatus)
  const isWorking = !isError && saveStatus.endsWith('...')
  const tone = isError ? 'error' : isWorking ? 'saving' : 'ok'

  const feedbackContext = buildFeedbackContext({
    accountEmail,
    activeView,
    projectId,
  })

  return (
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
              onClick={() => onSelectView(mode.id)}
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
          onOpenSource={(id) => { onSelectSource(id); onSelectView('code') }}
          onOpenCode={(id) => { onSelectCode(id); onSelectView('refine') }}
          onOpenCase={(id) => {
            const targetCase = cases.find((c) => c.id === id)
            if (targetCase?.sourceIds[0]) onSelectSource(targetCase.sourceIds[0])
            onSelectView('classify')
          }}
          onOpenMemo={onSelectMemo}
          onOpenExcerpt={(sourceId) => { onSelectSource(sourceId); onSelectView('code') }}
        />
      )}

      <div className="header-tools">
        <div
          className={`sync-status sync-status--${tone}`}
          role="status"
          aria-live="polite"
          title={saveStatus}
        >
          <span className={`sync-dot sync-dot--${tone}`} aria-hidden="true" />
          <span className="sync-status-text">{saveStatus}</span>
        </div>
        {accountEmail && (
          <ProfileMenu
            accountEmail={accountEmail}
            feedbackSubject={feedbackContext.subject}
            feedbackBody={feedbackContext.body}
            onOpenAiSettings={onOpenAiSettings}
            onOpenAccountDelete={onOpenAccountDelete}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </header>
  )
}

function buildFeedbackContext(input: {
  accountEmail?: string | null
  activeView: WorkspaceView
  projectId: string | null
}) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
  const url = typeof window !== 'undefined' ? window.location.href : 'unknown'
  const subject = `Fieldnote alpha — ${input.activeView}`
  const body = [
    'Pick whichever section fits and delete the other:',
    '',
    '— Bug report —',
    'What I was trying to do:',
    '',
    'What I expected to happen:',
    '',
    'What actually happened:',
    '',
    '',
    '— Feature request / idea —',
    'What would help:',
    '',
    'Why it matters / where it would fit:',
    '',
    '',
    '— context (auto-filled, edit if any of this is wrong) —',
    `Mode: ${input.activeView}`,
    `Project: ${input.projectId ?? '(no project loaded)'}`,
    `URL: ${url}`,
    `Browser: ${ua}`,
    `Account: ${input.accountEmail ?? 'unknown'}`,
  ].join('\n')

  return { subject, body }
}
