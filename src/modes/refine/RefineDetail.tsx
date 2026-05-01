import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Code, Excerpt } from '../../lib/types'
import { ReferenceList } from '../../ReferenceList'

type SortedCode = Code & { depth: number }

type Props = {
  activeCode: Code
  codes: Code[]
  codeExcerpts: Excerpt[]
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
}

export function RefineDetail(props: Props) {
  const [mergeTargetCodeId, setMergeTargetCodeId] = useState('')

  const handleMerge = () => {
    if (!mergeTargetCodeId) return
    props.mergeActiveCodeIntoTarget(mergeTargetCodeId)
    setMergeTargetCodeId('')
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
          <span>Merge into</span>
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
      </div>

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
      <div className="coming-soon-strip">
        <strong>Coming soon</strong>
        <span>Stronger code splitting, bulk recode, and deeper codebook cleanup tools.</span>
      </div>
    </article>
  )
}
