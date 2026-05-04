// Refine-mode right rail: contextual inspector for the active code.
// Properties (name/color/parent/description), code-family navigation,
// merge candidates ranked by reference overlap, and code-level lifecycle
// actions (Merge, Delete). Split lives in the center pane because its UI
// operates on the references list.

import { useMemo, useState } from 'react'
import { ArrowUpRight, ChevronRight, Database, Sparkles, Trash2 } from 'lucide-react'
import type { Code, Excerpt } from '../../lib/types'
import { AiPreviewPanel } from '../../components/AiPreviewPanel'
import { estimateCostUsd, estimateInputTokens } from '../../ai/client'
import { formatExcerptCitation } from '../../lib/excerptCitation'

type SortedCode = Code & { depth: number }

type Props = {
  activeCode: Code
  codes: Code[]
  allExcerpts: Excerpt[]
  codeExcerpts: Excerpt[]
  parentCodeOptions: SortedCode[]
  activeCodeParent: Code | undefined
  activeCodeChildren: Code[]
  updateCode: (codeId: string, patch: Partial<Code>) => void
  updateCodeParent: (codeId: string, parentCodeId: string) => void
  mergeActiveCodeIntoTarget: (targetCodeId: string) => void
  deleteActiveCode: () => void
  onSelectCode: (codeId: string) => void
  onDraftDescription: (codeName: string, references: Array<{ sourceTitle: string; text: string }>) => Promise<{ ok: true; description: string } | { ok: false; message: string }>
  isHostedAi: boolean
}

type MergeCandidate = {
  code: Code
  overlap: number
  total: number
  jaccard: number
}

function rankMergeCandidates(activeCode: Code, codes: Code[], excerpts: Excerpt[], topN: number): MergeCandidate[] {
  const activeRefs = new Set<string>()
  for (const e of excerpts) {
    if (e.codeIds.includes(activeCode.id)) activeRefs.add(e.id)
  }
  if (activeRefs.size === 0) return []

  const candidates: MergeCandidate[] = []
  for (const candidate of codes) {
    if (candidate.id === activeCode.id) continue
    const candRefs = new Set<string>()
    for (const e of excerpts) {
      if (e.codeIds.includes(candidate.id)) candRefs.add(e.id)
    }
    if (candRefs.size === 0) continue
    let intersection = 0
    for (const id of activeRefs) if (candRefs.has(id)) intersection++
    if (intersection === 0) continue
    const union = activeRefs.size + candRefs.size - intersection
    candidates.push({
      code: candidate,
      overlap: intersection,
      total: candRefs.size,
      jaccard: intersection / union,
    })
  }

  return candidates.sort((a, b) => b.jaccard - a.jaccard).slice(0, topN)
}

export function RefineInspector(props: Props) {
  const [aiPhase, setAiPhase] = useState<'idle' | 'preview' | 'loading' | 'result' | 'error'>('idle')
  const [aiDraft, setAiDraft] = useState('')
  const [aiError, setAiError] = useState<string | undefined>()
  const [mergeTargetCodeId, setMergeTargetCodeId] = useState('')

  const referencesPreview = props.codeExcerpts
    .map((e) => `${formatExcerptCitation(e)}: ${e.text.slice(0, 120)}`)
    .join('\n')
  const inputTokens = estimateInputTokens(referencesPreview)
  const inputCost = estimateCostUsd(inputTokens)
  const showDraftButton = props.codeExcerpts.length > 0

  const mergeCandidates = useMemo(
    () => rankMergeCandidates(props.activeCode, props.codes, props.allExcerpts, 5),
    [props.activeCode, props.codes, props.allExcerpts],
  )

  const depth = useMemo(() => {
    let d = 0
    let cur: Code | undefined = props.activeCode
    const seen = new Set<string>()
    while (cur?.parentCodeId && !seen.has(cur.id)) {
      seen.add(cur.id)
      cur = props.codes.find((c) => c.id === cur!.parentCodeId)
      if (!cur) break
      d++
    }
    return d
  }, [props.activeCode, props.codes])

  const confirmMerge = (targetCode: Code) => {
    if (!window.confirm(`Merge "${props.activeCode.name}" into "${targetCode.name}"? Every excerpt moves over and "${props.activeCode.name}" is removed.`)) return
    props.mergeActiveCodeIntoTarget(targetCode.id)
  }

  const handleMergeFromDropdown = () => {
    const target = props.codes.find((c) => c.id === mergeTargetCodeId)
    if (!target) return
    confirmMerge(target)
    setMergeTargetCodeId('')
  }

  return (
    <section className="panel refine-inspector" id="refine-inspector">
      <div className="panel-heading">
        <Database size={18} aria-hidden="true" />
        <h2>Code Properties</h2>
      </div>

      <label className="property-field">
        <span>Name</span>
        <input value={props.activeCode.name} onChange={(event) => props.updateCode(props.activeCode.id, { name: event.target.value })} />
      </label>

      <label className="property-field color-field">
        <span>Color</span>
        <input type="color" value={props.activeCode.color} onChange={(event) => props.updateCode(props.activeCode.id, { color: event.target.value })} />
      </label>

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

      <label className="property-field">
        <span>
          Description
          {showDraftButton && aiPhase === 'idle' && (
            <button
              type="button"
              className="refine-ai-trigger"
              onClick={() => setAiPhase('preview')}
            >
              <Sparkles size={14} aria-hidden="true" />
              Draft from excerpts
            </button>
          )}
        </span>
        <textarea
          className="code-description"
          value={props.activeCode.description}
          aria-label="Code description"
          onChange={(event) => props.updateCode(props.activeCode.id, { description: event.target.value })}
        />
      </label>

      {aiPhase !== 'idle' && (
        <AiPreviewPanel
          phase={aiPhase as 'preview' | 'loading' | 'result' | 'error'}
          inputPreview={referencesPreview}
          estimatedTokens={inputTokens}
          estimatedCostUsd={inputCost}
          errorMessage={aiError}
          showHostedQuota={props.isHostedAi}
          onCancel={() => { setAiPhase('idle'); setAiDraft(''); setAiError(undefined) }}
          onSend={async () => {
            setAiPhase('loading')
            const result = await props.onDraftDescription(
              props.activeCode.name,
              props.codeExcerpts.map((e) => ({ sourceTitle: e.sourceTitle, text: e.text }))
            )
            if (result.ok) { setAiDraft(result.description); setAiPhase('result') }
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
                    props.updateCode(props.activeCode.id, { description: aiDraft })
                    setAiPhase('idle')
                    setAiDraft('')
                  }}
                >
                  Insert into description
                </button>
              </div>
            </div>
          )}
        </AiPreviewPanel>
      )}

      <dl className="properties-list compact-properties">
        <div>
          <dt>Excerpts</dt>
          <dd>{props.codeExcerpts.length}</dd>
        </div>
        <div>
          <dt>Children</dt>
          <dd>{props.activeCodeChildren.length}</dd>
        </div>
        <div>
          <dt>Depth</dt>
          <dd>{depth === 0 ? 'Top-level' : `Level ${depth}`}</dd>
        </div>
      </dl>

      <section className="refine-inspector-section">
        <header className="refine-inspector-section-head">
          <h3>Code family</h3>
        </header>
        {!props.activeCodeParent && props.activeCodeChildren.length === 0 && (
          <p className="refine-inspector-empty">No parent or children. Use the codebook on the left to drag this code under another.</p>
        )}
        {props.activeCodeParent && (
          <button
            type="button"
            className="refine-family-row"
            onClick={() => props.onSelectCode(props.activeCodeParent!.id)}
          >
            <ArrowUpRight size={13} aria-hidden="true" />
            <span className="refine-family-label">Parent</span>
            <span className="refine-family-name">{props.activeCodeParent.name}</span>
          </button>
        )}
        {props.activeCodeChildren.map((child) => (
          <button
            key={child.id}
            type="button"
            className="refine-family-row"
            onClick={() => props.onSelectCode(child.id)}
          >
            <ChevronRight size={13} aria-hidden="true" />
            <span className="refine-family-label">Child</span>
            <span className="refine-family-name">{child.name}</span>
          </button>
        ))}
      </section>

      <section className="refine-inspector-section">
        <header className="refine-inspector-section-head">
          <h3>Merge into…</h3>
        </header>
        {mergeCandidates.length > 0 ? (
          <ul className="refine-merge-candidates">
            {mergeCandidates.map((cand) => (
              <li key={cand.code.id}>
                <button
                  type="button"
                  className="refine-merge-candidate"
                  onClick={() => confirmMerge(cand.code)}
                  title={`Merge "${props.activeCode.name}" into "${cand.code.name}"`}
                >
                  <span className="code-dot" style={{ background: cand.code.color }} />
                  <span className="refine-merge-candidate-name">{cand.code.name}</span>
                  <small>{cand.overlap} of {props.codeExcerpts.length} excerpts overlap</small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="refine-inspector-empty">{props.codeExcerpts.length === 0 ? 'Apply this code to some text first to see suggested merge targets.' : 'No other code shares any excerpts with this one.'}</p>
        )}

        <div className="refine-merge-fallback">
          <select value={mergeTargetCodeId} onChange={(event) => setMergeTargetCodeId(event.target.value)} aria-label="Merge into any code">
            <option value="">Or pick any code…</option>
            {props.parentCodeOptions.map((code) => (
              <option key={code.id} value={code.id}>
                {'-'.repeat(code.depth)} {code.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary-button"
            disabled={!mergeTargetCodeId}
            onClick={handleMergeFromDropdown}
          >
            Merge
          </button>
        </div>
      </section>

      <button
        className="danger-button refine-inspector-delete"
        type="button"
        onClick={props.deleteActiveCode}
      >
        <Trash2 size={15} aria-hidden="true" />
        Delete code
      </button>
    </section>
  )
}
