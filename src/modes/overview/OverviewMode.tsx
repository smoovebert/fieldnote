import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { BarChart3, ChevronRight, Download, History, Network, RotateCcw, Sparkles } from 'lucide-react'
import type { Attribute, Case, Code, Excerpt, Memo, Source } from '../../lib/types'
import { computeOntology, computeProgress } from './stats'
import { StatCard } from './StatCard'
import { listVersions, type ProjectVersion } from '../../lib/localRecovery'
import { AiPreviewPanel } from '../../components/AiPreviewPanel'
import { estimateCostUsd } from '../../ai/client'
import { ScrollAffordance } from '../../components/ScrollAffordance'
import { SetupChecklist } from './SetupChecklist'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

type OverviewNextStep = {
  title: string
  detail: string
  cta: string
  target: WorkspaceView
}

const WORKFLOW_STEPS = [
  { key: 'organize', label: 'Organize' },
  { key: 'code', label: 'Code' },
  { key: 'refine', label: 'Refine' },
  { key: 'classify', label: 'Classify' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'report', label: 'Report' },
] as const satisfies ReadonlyArray<{ key: Exclude<WorkspaceView, 'overview'>; label: string }>

type Props = {
  title: string
  description: string
  sources: Source[]
  codes: Code[]
  excerpts: Excerpt[]
  projectMemo: Memo | undefined
  userId: string | null
  projectId: string | null
  snapshotsCount: number
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onProjectMemoChange: (next: string) => void
  onRestoreVersion: (version: ProjectVersion) => void
  onExportBackup: () => void
  onDraftProjectMemo: () => Promise<{ ok: true; memo: string } | { ok: false; message: string }>
  isHostedAi: boolean
  onOpenAiSettings: () => void
  // Onboarding checklist data — derived inside SetupChecklist from
  // these arrays. The whole list self-hides once everything is done.
  cases: Case[]
  attributes: Attribute[]
  onNavigate: (view: WorkspaceView) => void
}

export function OverviewMode(props: Props) {
  const progress = computeProgress({ sources: props.sources, excerpts: props.excerpts })
  const ontology = computeOntology(props.codes)
  const [versions, setVersions] = useState<ProjectVersion[]>([])

  const [aiPhase, setAiPhase] = useState<'idle' | 'preview' | 'loading' | 'result' | 'error'>('idle')
  const [aiDraft, setAiDraft] = useState('')
  const [aiError, setAiError] = useState<string | undefined>()

  const enabled = props.snapshotsCount > 0
  const estTokens = props.snapshotsCount * 800
  const estCost = estimateCostUsd(estTokens)
  const hasRefinedCode = props.codes.some((code) => code.description.trim() || code.parentCodeId)
  const nextStep: OverviewNextStep = getOverviewNextStep({
    sourceCount: props.sources.length,
    excerptCount: props.excerpts.length,
    codeCount: props.codes.length,
    hasRefinedCode,
    caseCount: props.cases.length,
    attributeCount: props.attributes.length,
    snapshotsCount: props.snapshotsCount,
  })
  const workflowDone = {
    organize: props.sources.length > 0,
    code: props.excerpts.length > 0,
    refine: hasRefinedCode,
    classify: props.cases.length > 0 && props.attributes.length > 0,
    analyze: props.snapshotsCount > 0,
    report: props.snapshotsCount > 0,
  } satisfies Record<(typeof WORKFLOW_STEPS)[number]['key'], boolean>

  // Reload versions whenever the project changes or the user toggles Overview.
  // Cheap query (small per-project list) so re-running on focus is fine.
  useEffect(() => {
    let cancelled = false
    if (!props.userId || !props.projectId) {
      // Project not active yet; load yields an empty list, which the async
      // branch will set once it resolves. Don't clear state synchronously
      // here — that would trigger a cascading render.
      Promise.resolve([] as ProjectVersion[]).then((rows) => {
        if (!cancelled) setVersions(rows)
      })
      return () => { cancelled = true }
    }
    listVersions(props.userId, props.projectId).then((rows) => {
      if (!cancelled) setVersions(rows)
    }).catch(() => {
      if (!cancelled) setVersions([])
    })
    return () => { cancelled = true }
  }, [props.userId, props.projectId])

  return (
    <article className="overview-mode">
      <header className="overview-header">
        <div className="overview-titles">
          <input
            className="overview-title"
            value={props.title}
            placeholder="Untitled project"
            aria-label="Project title"
            onChange={(event: ChangeEvent<HTMLInputElement>) => props.onTitleChange(event.target.value)}
          />
          <input
            className="overview-description"
            value={props.description}
            placeholder="One-line description for collaborators"
            aria-label="Project description"
            onChange={(event: ChangeEvent<HTMLInputElement>) => props.onDescriptionChange(event.target.value)}
          />
        </div>
      </header>

      <SetupChecklist
        projectId={props.projectId}
        sources={props.sources}
        cases={props.cases}
        attributes={props.attributes}
        excerpts={props.excerpts}
        onNavigate={props.onNavigate}
      />

      <section className="overview-orientation" aria-label="Project orientation">
        <div className="overview-orientation-main">
          <p className="detail-kicker">Project overview</p>
          <h2>Home base for this research project</h2>
          <p>Use Overview to see where the project stands, keep the project memo alive, download backups, and jump to the next useful mode.</p>
        </div>
        <div className="overview-next-step">
          <span className="overview-next-step-label">Recommended next step</span>
          <strong>{nextStep.title}</strong>
          <p>{nextStep.detail}</p>
          <button type="button" className="overview-next-step-cta" onClick={() => props.onNavigate(nextStep.target)}>
            {nextStep.cta}
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
        <ol className="overview-workflow" aria-label="Workflow progress">
          {WORKFLOW_STEPS.map((step) => (
            <li
              key={step.key}
              className={[
                workflowDone[step.key] ? 'is-done' : '',
                nextStep.target === step.key ? 'is-current' : '',
              ].filter(Boolean).join(' ')}
            >
              <button type="button" onClick={() => props.onNavigate(step.key)}>
                <span aria-hidden="true" />
                {step.label}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <div className="overview-stats">
        <StatCard
          label="Progress"
          icon={BarChart3}
          iconBackground="#e8eafc"
          primary={
            <span>
              <strong>{progress.coded}</strong>
              <span className="overview-stat-of"> of {progress.total} sources coded</span>
            </span>
          }
          progress={{ value: progress.coded, max: progress.total }}
        />
        <StatCard
          label="Ontology"
          icon={Network}
          iconBackground="#fbe9d8"
          primary={<strong>{ontology.codes}</strong>}
          secondary={<span>{ontology.themes === 1 ? '1 theme' : `${ontology.themes} themes`}</span>}
        />
      </div>

      <section className="overview-memo">
        <header className="panel-heading">
          <h2>Project memo</h2>
        </header>
        {enabled && aiPhase === 'idle' && (
          <button
            type="button"
            className="overview-ai-trigger"
            onClick={() => setAiPhase('preview')}
          >
            <Sparkles size={14} aria-hidden="true" />
            Draft from snapshots
          </button>
        )}
        {aiPhase !== 'idle' && (
          <AiPreviewPanel
            phase={aiPhase as 'preview' | 'loading' | 'result' | 'error'}
            inputPreview={`${props.snapshotsCount} pinned snapshot${props.snapshotsCount === 1 ? '' : 's'} from this project will be sent.`}
            estimatedTokens={estTokens}
            estimatedCostUsd={estCost}
            errorMessage={aiError}
            showHostedQuota={props.isHostedAi}
            onOpenSettings={() => { props.onOpenAiSettings(); setAiPhase('idle'); setAiError(undefined) }}
            onCancel={() => { setAiPhase('idle'); setAiDraft(''); setAiError(undefined) }}
            onSend={async () => {
              setAiPhase('loading')
              const result = await props.onDraftProjectMemo()
              if (result.ok) { setAiDraft(result.memo); setAiPhase('result') }
              else { setAiError(result.message); setAiPhase('error') }
            }}
          >
            {aiPhase === 'result' && (
              <div className="ai-draft-preview">
                <p>{aiDraft}</p>
                <div className="ai-draft-actions">
                  <button type="button" onClick={() => { setAiPhase('idle'); setAiDraft('') }}>Discard</button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      if ((props.projectMemo?.body ?? '').trim()) {
                        if (!window.confirm('This will replace your existing project memo. Continue?')) return
                      }
                      props.onProjectMemoChange(aiDraft)
                      setAiPhase('idle')
                      setAiDraft('')
                    }}
                  >
                    Insert into memo
                  </button>
                </div>
              </div>
            )}
          </AiPreviewPanel>
        )}
        <textarea
          value={props.projectMemo?.body ?? ''}
          placeholder="Add notes about this project's research questions, design choices, or evolving thinking."
          aria-label="Project memo"
          onChange={(event) => props.onProjectMemoChange(event.target.value)}
        />
      </section>

      <section className="overview-safety">
        <header className="panel-heading">
          <h2>Your work is safe</h2>
        </header>
        <p className="overview-safety-lead">
          Fieldnote saves automatically to the cloud, keeps a backup copy in your browser, and lets you download a portable file you can re-import any time.
        </p>
        <ul className="overview-safety-list">
          <li>
            <strong>Auto-saves</strong> — every change is sent to Supabase within a second. The status pill at the top of the page shows <em>Saving... / Saved</em>; if it ever turns red, the change failed and you should fix the connection or download a backup before closing the tab.
          </li>
          <li>
            <strong>Local recovery</strong> — every edit is first written to your browser, then synced to Supabase. If you reopen the project and the local copy is newer than the server (e.g. you lost connection), you'll get a prompt to restore it.
          </li>
          <li>
            <strong>Local history</strong> — the last {LAST_N_VERSIONS_HINT} daily versions of every project are kept in your browser. Roll back from the list below.
          </li>
          <li>
            <strong>Backup file</strong> — open the project switcher (top-left) and click <em>Backup current project</em> to download a <code>.fieldnote.json</code> file. Save it somewhere safe (Drive, email it to yourself). Use <em>Import backup as new project</em> to bring it back.
          </li>
        </ul>
        <p className="overview-safety-note">
          <strong>Habit:</strong> download a backup before any big restructuring (mass merges, deletes, or imports). It takes a second and gives you a known-good rollback point.
        </p>
        <button
          type="button"
          className="overview-safety-backup"
          onClick={props.onExportBackup}
          disabled={!props.projectId}
        >
          <Download size={14} aria-hidden="true" />
          Download backup now (.fieldnote.json)
        </button>
      </section>

      {versions.length > 0 && (
        <section className="overview-history">
          <header className="panel-heading">
            <History size={16} aria-hidden="true" />
            <h2>Local history</h2>
            <span className="overview-history-meta">{versions.length} version{versions.length === 1 ? '' : 's'} saved in this browser</span>
          </header>
          <p className="overview-history-hint">
            Each row is a snapshot from a different day. Click <em>Restore</em> to replace your current project state with that version — your current state is overwritten, so download a backup first if you're unsure.
          </p>
          <ul className="overview-history-list">
            {versions.map((version) => (
              <li key={version.key}>
                <div className="overview-history-row-meta">
                  <strong>{version.dateUtc}</strong>
                  <span>{new Date(version.capturedAt).toLocaleTimeString()}</span>
                </div>
                <button
                  type="button"
                  className="overview-history-restore"
                  onClick={() => {
                    if (!window.confirm(`Restore the project state from ${version.dateUtc}? Your current state will be replaced (no automatic backup of the current state — download a .fieldnote.json first if you want to keep it). The restore syncs to Supabase on the next save.`)) return
                    props.onRestoreVersion(version)
                  }}
                  title="Replace current project state with this version"
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ScrollAffordance />
    </article>
  )
}

function getOverviewNextStep(input: {
  sourceCount: number
  excerptCount: number
  codeCount: number
  hasRefinedCode: boolean
  caseCount: number
  attributeCount: number
  snapshotsCount: number
}): OverviewNextStep {
  if (input.sourceCount === 0) {
    return {
      title: 'Import the first source',
      detail: 'Start with a transcript, document, PDF, or spreadsheet. One real source is enough to test the workflow.',
      cta: 'Open Organize',
      target: 'organize',
    }
  }
  if (input.excerptCount === 0) {
    return {
      title: 'Code the first passage',
      detail: 'Open a source, highlight a meaningful passage, and apply one or more codes.',
      cta: 'Open Code',
      target: 'code',
    }
  }
  if (input.codeCount > 0 && !input.hasRefinedCode) {
    return {
      title: 'Refine the early codebook',
      detail: 'Write a definition, nest a subcode, or split/merge anything that already feels too broad.',
      cta: 'Open Refine',
      target: 'refine',
    }
  }
  if (input.caseCount === 0 || input.attributeCount === 0) {
    return {
      title: 'Add cases and attributes',
      detail: 'Cases and attributes make comparisons possible in matrix coding and crosstabs.',
      cta: 'Open Classify',
      target: 'classify',
    }
  }
  if (input.snapshotsCount === 0) {
    return {
      title: 'Ask an analysis question',
      detail: 'Run a query, matrix, crosstab, word frequency, or co-occurrence view, then send useful results to Report.',
      cta: 'Open Analyze',
      target: 'analyze',
    }
  }
  return {
    title: 'Review the report',
    detail: 'Check the memo, codebook, excerpts, cases, and pinned analysis snapshots before exporting.',
    cta: 'Open Report',
    target: 'report',
  }
}

const LAST_N_VERSIONS_HINT = 10
