import type { ReactNode } from 'react'
import { Sparkles, X } from 'lucide-react'

type Phase = 'preview' | 'loading' | 'result' | 'error'

type Props = {
  phase: Phase
  inputPreview: string
  estimatedTokens: number
  estimatedCostUsd: number | null
  errorMessage?: string
  children?: ReactNode // result body
  onSend: () => void
  onCancel: () => void
}

export function AiPreviewPanel({ phase, inputPreview, estimatedTokens, estimatedCostUsd, errorMessage, children, onSend, onCancel }: Props) {
  return (
    <section className="ai-preview" role="region" aria-label="AI assist">
      <header className="ai-preview-header">
        <Sparkles size={14} aria-hidden="true" />
        <strong>AI assist</strong>
        <button type="button" className="ai-preview-close" aria-label="Close" onClick={onCancel}>
          <X size={13} aria-hidden="true" />
        </button>
      </header>

      {phase === 'preview' && (
        <>
          <div className="ai-preview-cost">
            ~{estimatedTokens.toLocaleString()} tokens
            {estimatedCostUsd !== null && ` (~$${estimatedCostUsd.toFixed(5)})`}
          </div>
          <div className="ai-preview-input">{inputPreview}</div>
          <div className="ai-preview-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" className="primary-button" onClick={onSend}>Send</button>
          </div>
        </>
      )}

      {phase === 'loading' && (
        <div className="ai-preview-loading">Thinking…</div>
      )}

      {phase === 'result' && children}

      {phase === 'error' && (
        <div className="ai-preview-error">
          {errorMessage ?? 'Something went wrong.'}
          <button type="button" onClick={onCancel}>Dismiss</button>
        </div>
      )}
    </section>
  )
}
