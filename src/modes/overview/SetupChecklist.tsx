// Per-project onboarding checklist surfaced on Overview.
//
// Solves the expectation mismatch where a new researcher loaded a
// blank project and didn't know what order to do things in — most
// concretely, importing a participants spreadsheet before any cases
// exist. Each item is derived from the real data on the project, so
// it self-resolves the moment the user does the thing it asks for.
// The whole checklist hides once every item passes (or once the
// researcher dismisses it manually); a per-project localStorage flag
// keeps it from reappearing on the next session.

import { useState } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import type { Attribute, Case, Excerpt, Source } from '../../lib/types'

type WorkspaceView = 'overview' | 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

type Props = {
  projectId: string | null
  sources: Source[]
  cases: Case[]
  attributes: Attribute[]
  excerpts: Excerpt[]
  onNavigate: (view: WorkspaceView) => void
}

const STORAGE_PREFIX = 'fieldnote.setup-dismissed:'

function isDismissed(projectId: string | null): boolean {
  if (!projectId) return false
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${projectId}`) === '1'
  } catch {
    return false
  }
}

function persistDismissal(projectId: string | null) {
  if (!projectId) return
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, '1')
  } catch {
    // localStorage may be unavailable (private mode etc.) — fall back
    // to in-memory dismissal only.
  }
}

export function SetupChecklist(props: Props) {
  const [dismissed, setDismissed] = useState(() => isDismissed(props.projectId))

  const items = [
    {
      key: 'source',
      done: props.sources.length > 0,
      title: 'Import a source',
      hint: 'Drop in a transcript, document, or PDF in Organize.',
      cta: 'Open Organize',
      target: 'organize' as WorkspaceView,
    },
    {
      key: 'case',
      done: props.cases.length > 0,
      title: 'Create your first case',
      hint: 'A case is one participant or interview unit. You’ll be prompted to name it (e.g. "Participant One").',
      cta: 'Open Classify',
      target: 'classify' as WorkspaceView,
    },
    {
      key: 'attribute',
      done: props.attributes.length > 0,
      title: 'Add participant attributes',
      hint: 'Demographics, conditions, or any field you’ll group by later. Or import a spreadsheet — missing cases get created for you.',
      cta: 'Open Classify',
      target: 'classify' as WorkspaceView,
    },
    {
      key: 'code',
      done: props.excerpts.length > 0,
      title: 'Apply your first code',
      hint: 'Select text in a source and apply a code. Everything downstream (Refine, Analyze, Report) lights up after this.',
      cta: 'Open Code',
      target: 'code' as WorkspaceView,
    },
  ] as const

  const completed = items.filter((item) => item.done).length
  const total = items.length
  const allDone = completed === total

  if (dismissed || allDone) return null

  return (
    <section className="setup-checklist" aria-label="Project setup checklist">
      <header className="setup-checklist-header">
        <div>
          <h2>Get this project set up</h2>
          <p className="setup-checklist-progress">
            {completed} of {total} done. Each step links you to where to do it.
          </p>
        </div>
        <button
          type="button"
          className="setup-checklist-dismiss"
          aria-label="Dismiss setup checklist"
          title="Hide for this project"
          onClick={() => {
            persistDismissal(props.projectId)
            setDismissed(true)
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>
      <ol className="setup-checklist-items">
        {items.map((item) => (
          <li
            key={item.key}
            className={item.done ? 'setup-checklist-item is-done' : 'setup-checklist-item'}
          >
            <span className="setup-checklist-bullet" aria-hidden="true">
              {item.done ? <Check size={13} /> : null}
            </span>
            <div className="setup-checklist-text">
              <strong>{item.title}</strong>
              <span>{item.hint}</span>
            </div>
            {!item.done && (
              <button
                type="button"
                className="setup-checklist-cta"
                onClick={() => props.onNavigate(item.target)}
              >
                {item.cta}
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
