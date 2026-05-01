import { useEffect, useState } from 'react'
import { Settings, X } from 'lucide-react'
import { loadAiSettings, recordHostedConsent, updateAiProvider } from '../lib/aiSettings'
import { saveProviderKey } from '../ai/client'
import type { AiProvider } from '../ai/types'

type Props = {
  userId: string
  onClose: () => void
}

export function AiSettingsPanel({ userId, onClose }: Props) {
  const [provider, setProvider] = useState<AiProvider>('gemini-free')
  const [byokProvider, setByokProvider] = useState<'gemini' | 'openai' | 'anthropic'>('gemini')
  const [keyInput, setKeyInput] = useState('')
  const [consent, setConsent] = useState(false)
  const [hostedConsentAt, setHostedConsentAt] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState<{ gemini: boolean; openai: boolean; anthropic: boolean }>({ gemini: false, openai: false, anthropic: false })
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadAiSettings(userId).then((settings) => {
      if (!settings) return
      setProvider(settings.aiProvider)
      if (settings.aiProvider === 'openai-byok') setByokProvider('openai')
      else if (settings.aiProvider === 'anthropic-byok') setByokProvider('anthropic')
      else if (settings.aiProvider === 'gemini-byok') setByokProvider('gemini')
      setHostedConsentAt(settings.hostedAiConsentAt)
      if (settings.hostedAiConsentAt) setConsent(true)
      setHasKey({
        gemini: settings.hasGeminiKey,
        openai: settings.hasOpenaiKey,
        anthropic: settings.hasAnthropicKey,
      })
    })
  }, [userId])

  const isHosted = provider === 'gemini-free'
  const byokKeyAlreadyOnFile = !isHosted && hasKey[byokProvider]

  // Save flow guarantees we never leave the account pointing at a *-byok
  // provider that has no usable key:
  //   1. If switching to BYOK and a fresh key was pasted, save the key
  //      first. Only update the provider after that succeeds.
  //   2. If switching to BYOK with no fresh key, allow it only when the
  //      account already has a saved key for that provider; otherwise
  //      block and prompt for a key.
  //   3. Hosted-mode consent is recorded as before.
  const handleSave = async () => {
    setStatus('Saving...')
    try {
      if (!isHosted) {
        const trimmed = keyInput.trim()
        if (trimmed) {
          const result = await saveProviderKey({ provider: byokProvider, plaintextKey: trimmed })
          if (!result.ok) {
            setStatus(`Could not save key: ${result.message}`)
            return
          }
          setKeyInput('')
          setHasKey((current) => ({ ...current, [byokProvider]: true }))
        } else if (!hasKey[byokProvider]) {
          setStatus(`Paste a ${byokProvider} API key before switching to BYOK.`)
          return
        }
      }

      if (isHosted && consent && !hostedConsentAt) {
        await recordHostedConsent(userId)
        setHostedConsentAt(new Date().toISOString())
      }

      await updateAiProvider(userId, provider)
      setStatus('Saved.')
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return (
    <div className="ai-settings-backdrop" onClick={onClose}>
      <div className="ai-settings-modal" role="dialog" aria-labelledby="ai-settings-heading" onClick={(e) => e.stopPropagation()}>
        <header>
          <Settings size={18} aria-hidden="true" />
          <h2 id="ai-settings-heading">AI Assist</h2>
          <button type="button" className="ai-settings-close" aria-label="Close" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <fieldset className="ai-settings-providers">
          <legend>Provider</legend>
          <label>
            <input type="radio" name="provider" checked={isHosted} onChange={() => setProvider('gemini-free')} />
            <span>Use Fieldnote's free Gemini quota (default)</span>
          </label>
          <label>
            <input type="radio" name="provider" checked={!isHosted} onChange={() => setProvider(`${byokProvider}-byok` as AiProvider)} />
            <span>Bring your own key</span>
          </label>
        </fieldset>

        {!isHosted && (
          <div className="ai-settings-byok">
            <label className="property-field">
              <span>Provider</span>
              <select
                value={byokProvider}
                onChange={(e) => {
                  const next = e.target.value as 'gemini' | 'openai' | 'anthropic'
                  setByokProvider(next)
                  setProvider(`${next}-byok` as AiProvider)
                }}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
            <label className="property-field">
              <span>API key</span>
              <input
                type="password"
                value={keyInput}
                placeholder={byokKeyAlreadyOnFile ? 'paste a new key to replace the saved one' : 'paste here, then click Save'}
                autoComplete="off"
                onChange={(e) => setKeyInput(e.target.value)}
              />
            </label>
            {byokKeyAlreadyOnFile && (
              <p className="ai-settings-note">A {byokProvider} key is already saved for this account. Leave the field blank to keep using it, or paste a new one to replace it.</p>
            )}
            <p className="ai-settings-note">Your key is encrypted in our database and decrypted only inside the AI Edge Function. It never reaches the browser after saving.</p>
          </div>
        )}

        {isHosted && (
          <label className="ai-settings-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I understand free-tier prompts may be used to train Google's models. For IRB-protected research, use my own paid key in Settings.
            </span>
          </label>
        )}

        <div className="ai-settings-actions">
          <span className="ai-settings-status">{status}</span>
          <button type="button" className="primary-button" onClick={handleSave} disabled={isHosted && !consent}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
