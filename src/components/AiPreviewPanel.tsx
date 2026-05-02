import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { loadAiUsageToday } from '../ai/client'

type Phase = 'preview' | 'loading' | 'result' | 'error'

type Quota = { callsToday: number; cap: number; remaining: number }

type Props = {
  phase: Phase
  inputPreview: string
  estimatedTokens: number
  estimatedCostUsd: number | null
  errorMessage?: string
  // When true, the panel fetches today's hosted-quota usage and shows
  // an "X of N free calls left today" badge in the preview phase. Set
  // by callers that route through the free Gemini path; callers on
  // BYOK leave it false (the daily cap doesn't apply there).
  showHostedQuota?: boolean
  children?: ReactNode // result body
  onSend: () => void
  onCancel: () => void
}

function quotaTone(q: Quota): string {
  if (q.remaining === 0) return 'ai-preview-quota out'
  if (q.remaining <= 5) return 'ai-preview-quota low'
  return 'ai-preview-quota'
}

export function AiPreviewPanel({ phase, inputPreview, estimatedTokens, estimatedCostUsd, errorMessage, showHostedQuota, children, onSend, onCancel }: Props) {
  // Reload quota whenever the panel enters or returns to the preview
  // phase (i.e., after a successful call lands and the user opens
  // another draft). Keeps the badge fresh without a global subscription.
  const [quota, setQuota] = useState<Quota | null>(null)
  useEffect(() => {
    if (!showHostedQuota || phase !== 'preview') return
    let cancelled = false
    loadAiUsageToday().then((q) => { if (!cancelled) setQuota(q) }).catch(() => { /* show no badge on failure */ })
    return () => { cancelled = true }
  }, [showHostedQuota, phase])

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
          {quota && (
            <div className={quotaTone(quota)} aria-live="polite">
              {quota.remaining > 0
                ? <>{quota.remaining} of {quota.cap} free calls left today</>
                : <>Daily free-tier limit reached. Add your own key in Settings to continue.</>}
            </div>
          )}
          <div className="ai-preview-input">{inputPreview}</div>
          <div className="ai-preview-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button
              type="button"
              className="primary-button"
              onClick={onSend}
              disabled={quota?.remaining === 0}
            >
              Send
            </button>
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
