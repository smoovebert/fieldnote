// Account self-deletion modal. Two-gate confirmation:
//   1. The user must type their account email into the input.
//   2. The Delete button stays disabled until step 1 matches AND a
//      "I understand this is permanent" checkbox is ticked.
// On success the local session is signed out and the caller is
// expected to navigate to the public landing.

import { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { deleteOwnAccount } from '../lib/deleteAccount'

type Props = {
  accountEmail: string
  onClose: () => void
  onDeleted: () => void
}

export function AccountDeletePanel({ accountEmail, onClose, onDeleted }: Props) {
  const [typedEmail, setTypedEmail] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Esc closes the modal so the user always has an out.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  const emailMatches = typedEmail.trim().toLowerCase() === accountEmail.trim().toLowerCase()
  const canSubmit = emailMatches && understood && !busy

  async function handleDelete() {
    if (!canSubmit) return
    setBusy(true)
    setStatus('Deleting account...')
    const result = await deleteOwnAccount(accountEmail)
    if (!result.ok) {
      setStatus(`Delete failed: ${result.message}`)
      setBusy(false)
      return
    }
    // Server has dropped the auth row. Tear down the local session so
    // we don't leave a half-signed-in client around.
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // signOut after the row is gone may 403; safe to ignore.
    }
    onDeleted()
  }

  return (
    <div className="modal-backdrop" onMouseDown={busy ? undefined : onClose} role="presentation">
      <div
        className="modal-card account-delete-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-delete-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="account-delete-title">Delete account</h2>
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
          <p>
            This permanently deletes your Fieldnote account, every project you've created, every coded excerpt, every memo, every saved query and snapshot, every AI usage record, and any saved BYOK API keys. We cannot recover any of it for you afterwards.
          </p>
          <p>
            If you might want to come back to this work, download a <code>.fieldnote.json</code> backup from each project's Overview before continuing.
          </p>

          <label className="property-field">
            <span>Type your account email to confirm</span>
            <input
              type="email"
              value={typedEmail}
              placeholder={accountEmail}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(event) => setTypedEmail(event.target.value)}
              disabled={busy}
            />
          </label>

          <label className="account-delete-understand">
            <input
              type="checkbox"
              checked={understood}
              onChange={(event) => setUnderstood(event.target.checked)}
              disabled={busy}
            />
            <span>I understand this is permanent and cannot be undone.</span>
          </label>

          {status && <p className="account-delete-status">{status}</p>}

          <div className="account-delete-actions">
            <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              type="button"
              className="danger-button"
              onClick={handleDelete}
              disabled={!canSubmit}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete my account
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
