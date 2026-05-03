// Modal opened from the Overview sidebar's New project... button.
// Researcher types a project name and picks a starting point from a
// 5-card grid (three methodology codebooks + Sample + Blank). On
// Create the parent calls createProjectFromSeed with the chosen
// template's seed; the modal closes and the new project becomes the
// active project.
//
// Spec: docs/superpowers/specs/2026-05-03-research-templates-design.md

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { RESEARCH_TEMPLATES, type ResearchTemplate } from '../lib/researchTemplates'

type Props = {
  defaultName?: string                                            // initial project name; usually empty
  busy: boolean                                                   // App.tsx isCreatingProject — disables UI mid-create
  errorMessage?: string                                           // surfaced from save status when create fails
  onCreate: (template: ResearchTemplate, title: string) => void
  onClose: () => void
}

const PRESELECTED_ID = 'inductive-interview'

export function ResearchTemplatePicker({ defaultName, busy, errorMessage, onCreate, onClose }: Props) {
  const [title, setTitle] = useState(defaultName ?? '')
  const [selectedId, setSelectedId] = useState<string>(PRESELECTED_ID)

  // Esc closes the modal — but only when we're not mid-create. Ignoring
  // the keystroke during a create call avoids leaving a half-finished
  // project in the row list with no UI to recover from.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const trimmed = title.trim()
  const canCreate = trimmed.length > 0 && !busy

  function handleCreate() {
    if (!canCreate) return
    const template = RESEARCH_TEMPLATES.find((t) => t.id === selectedId) ?? RESEARCH_TEMPLATES[0]
    onCreate(template, trimmed)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && canCreate) {
      event.preventDefault()
      handleCreate()
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={busy ? undefined : onClose}
      role="presentation"
    >
      <div
        className="modal-card research-template-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-template-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="research-template-title">Start a new project</h2>
          <button
            type="button"
            className="header-icon-button"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="modal-section">
          <label className="property-field research-template-name-field">
            <span>Project name</span>
            <input
              type="text"
              value={title}
              placeholder="e.g. First-gen students study"
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
            />
          </label>

          <div className="research-template-grid-label">Pick a starting point</div>
          <div className="research-template-grid" role="radiogroup" aria-label="Starting point">
            {RESEARCH_TEMPLATES.map((template) => {
              const isSelected = template.id === selectedId
              const codeCount = template.id === 'sample'
                ? template.buildSeed().codes.length
                : template.id === 'blank'
                  ? 0
                  : template.buildSeed().codes.length
              return (
                <button
                  key={template.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={isSelected ? 'research-template-card is-selected' : 'research-template-card'}
                  onClick={() => setSelectedId(template.id)}
                  disabled={busy}
                >
                  <div className="research-template-card-title">{template.name}</div>
                  <div className="research-template-card-tagline">{template.tagline}</div>
                  <div className="research-template-card-meta">
                    {codeCount === 0 ? 'No codes' : `${codeCount} code${codeCount === 1 ? '' : 's'}`}
                  </div>
                </button>
              )
            })}
          </div>

          {errorMessage && (
            <p className="research-template-error" role="alert">{errorMessage}</p>
          )}

          <div className="research-template-actions">
            <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              type="button"
              className="primary-button"
              onClick={handleCreate}
              disabled={!canCreate}
            >
              <Plus size={15} aria-hidden="true" />
              Create project
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
