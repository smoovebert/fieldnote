import { useMemo, useState } from 'react'
import { AlertTriangle, Scissors, Trash2 } from 'lucide-react'
import type { Code, Excerpt } from '../../lib/types'
import { ReferenceList } from '../../ReferenceList'

type SortedCode = Code & { depth: number }

type Props = {
  activeCode: Code
  codes: Code[]
  codeExcerpts: Excerpt[]
  allExcerpts: Excerpt[]
  parentCodeOptions: SortedCode[]
  activeCodeParent: Code | undefined
  activeCodeChildren: Code[]
  updateCode: (codeId: string, patch: Partial<Code>) => void
  updateCodeParent: (codeId: string, parentCodeId: string) => void
  mergeActiveCodeIntoTarget: (targetCodeId: string) => void
  deleteActiveCode: () => void
  updateExcerptNote: (id: string, note: string) => void
  deleteExcerpt: (id: string) => void
  removeCodeFromExcerpt: (excerptId: string, codeId: string) => void
  splitExcerpt: (excerptId: string) => void
  splitCodeInto: (sourceCodeId: string, excerptIds: string[], newCodeName: string, parentCodeId?: string) => void
  onSelectCode: (codeId: string) => void
  retagOrphan: (excerptId: string, codeId: string) => void
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function findDuplicates(activeCode: Code, codes: Code[]): Code[] {
  const target = normalizeName(activeCode.name)
  if (!target) return []
  return codes.filter((c) => c.id !== activeCode.id && normalizeName(c.name) === target)
}

export function RefineDetail(props: Props) {
  const [mergeTargetCodeId, setMergeTargetCodeId] = useState('')
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitName, setSplitName] = useState('')
  const [splitParentId, setSplitParentId] = useState<string>(() => props.activeCode.parentCodeId ?? '')
  const [splitSelected, setSplitSelected] = useState<Set<string>>(() => new Set())

  const handleMerge = () => {
    if (!mergeTargetCodeId) return
    props.mergeActiveCodeIntoTarget(mergeTargetCodeId)
    setMergeTargetCodeId('')
  }

  const duplicates = useMemo(() => findDuplicates(props.activeCode, props.codes), [props.activeCode, props.codes])

  const codeIds = useMemo(() => new Set(props.codes.map((c) => c.id)), [props.codes])
  const orphanExcerpts = useMemo(
    () => props.allExcerpts.filter((e) => e.codeIds.length === 0 || e.codeIds.every((id) => !codeIds.has(id))),
    [props.allExcerpts, codeIds],
  )
  const [orphanReviewOpen, setOrphanReviewOpen] = useState(false)

  const toggleSplit = (excerptId: string) => {
    setSplitSelected((current) => {
      const next = new Set(current)
      if (next.has(excerptId)) next.delete(excerptId)
      else next.add(excerptId)
      return next
    })
  }

  const performSplit = () => {
    props.splitCodeInto(props.activeCode.id, Array.from(splitSelected), splitName, splitParentId || undefined)
    setSplitOpen(false)
    setSplitName('')
    setSplitSelected(new Set())
  }

  const closeSplit = () => {
    setSplitOpen(false)
    setSplitName('')
    setSplitSelected(new Set())
  }

  return (
    <article className="detail-card refine-surface">
      <div className="refine-header">
        <div>
          <p className="detail-kicker">Code definition</p>
          <h2>{props.activeCode.name}</h2>
        </div>
        <span className="reference-count">{props.codeExcerpts.length} references</span>
      </div>

      {duplicates.length > 0 && (
        <div className="duplicate-codes-banner" role="status">
          <strong>Possible duplicate{duplicates.length === 1 ? '' : 's'}:</strong>
          <span>This code shares a name with </span>
          {duplicates.map((dup, index) => (
            <span key={dup.id}>
              <button
                type="button"
                className="duplicate-link"
                onClick={() => props.onSelectCode(dup.id)}
              >
                {dup.name}
              </button>
              {index < duplicates.length - 1 ? ', ' : ''}
            </span>
          ))}
          <span>. Use Merge below to combine them.</span>
        </div>
      )}

      <div className="code-definition-grid">
        <label className="property-field">
          <span>Name</span>
          <input value={props.activeCode.name} onChange={(event) => props.updateCode(props.activeCode.id, { name: event.target.value })} />
        </label>
        <label className="property-field color-field">
          <span>Color</span>
          <input type="color" value={props.activeCode.color} onChange={(event) => props.updateCode(props.activeCode.id, { color: event.target.value })} />
        </label>
      </div>

      <div className="code-hierarchy-row">
        <label className="property-field">
          <span>Parent code</span>
          <select value={props.activeCode.parentCodeId ?? ''} onChange={(event) => props.updateCodeParent(props.activeCode.id, event.target.value)}>
            <option value="">Top-level code</option>
            {props.parentCodeOptions.map((code) => (
              <option key={code.id} value={code.id}>
                {'-'.repeat(code.depth)} {code.name}
              </option>
            ))}
          </select>
        </label>
        <div className="code-family-summary">
          <span>{props.activeCodeParent ? `Under ${props.activeCodeParent.name}` : 'Top-level'}</span>
          <small>{props.activeCodeChildren.length} child code{props.activeCodeChildren.length === 1 ? '' : 's'}</small>
        </div>
      </div>

      <label className="property-field">
        <span>Description</span>
        <textarea
          className="code-description"
          value={props.activeCode.description}
          aria-label="Code description"
          onChange={(event) => props.updateCode(props.activeCode.id, { description: event.target.value })}
        />
      </label>

      <div className="code-maintenance-row">
        <label className="property-field">
          <span>Merge / bulk recode into</span>
          <select value={mergeTargetCodeId} onChange={(event) => setMergeTargetCodeId(event.target.value)}>
            <option value="">Choose another code</option>
            {props.parentCodeOptions.map((code) => (
              <option key={code.id} value={code.id}>
                {'-'.repeat(code.depth)} {code.name}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button" type="button" disabled={!mergeTargetCodeId} onClick={handleMerge}>
          Merge code
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setSplitOpen((open) => !open)}
          disabled={props.codeExcerpts.length === 0}
        >
          <Scissors size={15} aria-hidden="true" />
          {splitOpen ? 'Close split' : 'Split code'}
        </button>
      </div>

      {splitOpen && (
        <section className="split-code-panel">
          <header>
            <strong>Split this code</strong>
            <span>Select references to move into a new code. Unselected references stay on "{props.activeCode.name}".</span>
          </header>
          <div className="split-code-form">
            <label className="property-field">
              <span>New code name</span>
              <input
                value={splitName}
                placeholder={`${props.activeCode.name} – split`}
                onChange={(event) => setSplitName(event.target.value)}
              />
            </label>
            <label className="property-field">
              <span>Parent</span>
              <select value={splitParentId} onChange={(event) => setSplitParentId(event.target.value)}>
                <option value="">Top-level code</option>
                {props.parentCodeOptions.map((code) => (
                  <option key={code.id} value={code.id}>
                    {'-'.repeat(code.depth)} {code.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="split-code-list">
            {props.codeExcerpts.map((excerpt) => (
              <li key={excerpt.id} className={splitSelected.has(excerpt.id) ? 'selected' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={splitSelected.has(excerpt.id)}
                    onChange={() => toggleSplit(excerpt.id)}
                  />
                  <div>
                    <strong>{excerpt.sourceTitle}</strong>
                    <span>{excerpt.text}</span>
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <footer>
            <span>{splitSelected.size} of {props.codeExcerpts.length} selected</span>
            <div className="split-code-actions">
              <button type="button" onClick={closeSplit}>Cancel</button>
              <button
                type="button"
                className="primary-button"
                disabled={splitSelected.size === 0 || !splitName.trim()}
                onClick={performSplit}
              >
                Move {splitSelected.size} to new code
              </button>
            </div>
          </footer>
        </section>
      )}

      <div className="reference-toolbar">
        <p className="detail-kicker">References</p>
        <button className="danger-text-button" type="button" onClick={props.deleteActiveCode}>
          <Trash2 size={15} aria-hidden="true" />
          Delete code
        </button>
      </div>

      <ReferenceList
        excerpts={props.codeExcerpts}
        codes={props.codes}
        onNoteChange={props.updateExcerptNote}
        onDelete={props.deleteExcerpt}
        onRemoveCode={props.removeCodeFromExcerpt}
        onSplit={props.splitExcerpt}
      />

      {orphanExcerpts.length > 0 && (
        <section className="orphan-review">
          <header className="orphan-review-header">
            <AlertTriangle size={15} aria-hidden="true" />
            <strong>{orphanExcerpts.length} orphan reference{orphanExcerpts.length === 1 ? '' : 's'}</strong>
            <span>Excerpts whose codes were deleted or never set.</span>
            <button type="button" onClick={() => setOrphanReviewOpen((open) => !open)}>
              {orphanReviewOpen ? 'Hide' : 'Review'}
            </button>
          </header>
          {orphanReviewOpen && (
            <ul className="orphan-review-list">
              {orphanExcerpts.map((excerpt) => (
                <li key={excerpt.id}>
                  <div className="orphan-review-meta">
                    <strong>{excerpt.sourceTitle}</strong>
                    <span>{excerpt.text}</span>
                  </div>
                  <div className="orphan-review-actions">
                    <select
                      defaultValue=""
                      aria-label="Re-tag with code"
                      onChange={(event) => {
                        if (event.target.value) {
                          props.retagOrphan(excerpt.id, event.target.value)
                          event.target.value = ''
                        }
                      }}
                    >
                      <option value="">Re-tag with code…</option>
                      {props.parentCodeOptions.map((code) => (
                        <option key={code.id} value={code.id}>
                          {'-'.repeat(code.depth)} {code.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="orphan-delete" aria-label="Delete orphan" onClick={() => props.deleteExcerpt(excerpt.id)}>
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </article>
  )
}
