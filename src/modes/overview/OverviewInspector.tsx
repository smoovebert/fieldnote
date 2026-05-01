// Right rail content for the Overview mode: Project + AI assist
// settings shown as glance-and-edit cards. Detailed editing happens
// in the existing modals.

import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { loadAiSettings } from '../../lib/aiSettings'
import type { AiProvider } from '../../ai/types'

type Props = {
  userId: string | null
  lineNumberingMode: 'paragraph' | 'fixed-width'
  lineNumberingWidth: number
  onOpenProjectSettings: () => void
  onOpenAiSettings: () => void
}

function aiProviderLabel(provider: AiProvider): string {
  switch (provider) {
    case 'gemini-free': return 'Free Gemini Flash'
    case 'gemini-byok': return 'Your own Gemini key'
    case 'openai-byok': return 'Your own OpenAI key'
    case 'anthropic-byok': return 'Your own Anthropic key'
    default: return provider
  }
}

export function OverviewInspector(props: Props) {
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini-free')
  const [aiConsentAt, setAiConsentAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!props.userId) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setAiProvider('gemini-free')
          setAiConsentAt(null)
        }
      })
      return () => { cancelled = true }
    }
    loadAiSettings(props.userId).then((settings) => {
      if (cancelled) return
      if (settings) {
        setAiProvider(settings.aiProvider)
        setAiConsentAt(settings.hostedAiConsentAt)
      } else {
        setAiProvider('gemini-free')
        setAiConsentAt(null)
      }
    }).catch(() => {
      if (!cancelled) {
        setAiProvider('gemini-free')
        setAiConsentAt(null)
      }
    })
    return () => { cancelled = true }
  }, [props.userId])

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <SettingsIcon size={16} aria-hidden="true" />
          <h2>Project</h2>
        </div>
        <dl className="overview-settings-card-dl">
          <div>
            <dt>Reader line numbering</dt>
            <dd>
              {props.lineNumberingMode === 'fixed-width'
                ? `Fixed width, ${props.lineNumberingWidth} chars per line`
                : 'One per paragraph'}
            </dd>
          </div>
        </dl>
        <button type="button" className="overview-settings-card-btn" onClick={props.onOpenProjectSettings}>
          Edit project settings
        </button>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <Sparkles size={16} aria-hidden="true" />
          <h2>AI assist</h2>
        </div>
        <dl className="overview-settings-card-dl">
          <div>
            <dt>Provider</dt>
            <dd>{aiProviderLabel(aiProvider)}</dd>
          </div>
          <div>
            <dt>Free-tier consent</dt>
            <dd>{aiConsentAt ? `Given ${new Date(aiConsentAt).toLocaleDateString()}` : 'Not yet, required before first hosted AI call'}</dd>
          </div>
        </dl>
        <button type="button" className="overview-settings-card-btn" onClick={props.onOpenAiSettings}>
          Edit AI settings
        </button>
      </section>
    </>
  )
}
