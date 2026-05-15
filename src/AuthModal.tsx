// src/AuthModal.tsx
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { LogIn, UserPlus, X } from 'lucide-react'
import { createEarlyAccessAccount, earlyAccessRequestUrl } from './lib/earlyAccess'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

type Props = {
  open: boolean
  initialMode?: AuthMode
  onClose: () => void
}

const TERMS_VERSION = '2026-05-02-alpha'
const TERMS_URL = '/terms-of-service.md'
const statusForMode = (mode: AuthMode) =>
  mode === 'sign-up'
    ? 'Invited testers can create an account with their approved email.'
    : 'Sign in to sync your research workspace.'

export function AuthModal({ open, initialMode = 'sign-in', onClose }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [authStatus, setAuthStatus] = useState(() => statusForMode(initialMode))
  const isSignUp = authMode === 'sign-up'
  const submitDisabled = !isSupabaseConfigured || (isSignUp && !termsAccepted)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function submitAuth(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (!isSupabaseConfigured) {
      setAuthStatus('Supabase env variables are missing.')
      return
    }
    if (isSignUp && !termsAccepted) {
      setAuthStatus('Please read and accept the alpha terms before creating an account.')
      return
    }
    setAuthStatus(isSignUp ? 'Creating account...' : 'Signing in...')
    const credentials = { email, password }
    if (isSignUp) {
      const result = await createEarlyAccessAccount({
        ...credentials,
        termsAccepted,
        termsVersion: TERMS_VERSION,
      })
      setAuthStatus(result.message)
      return
    }

    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (error) {
      setAuthStatus(error.message)
      return
    }
    setAuthStatus(
      isSignUp ? 'Account created. Check email confirmation settings if needed.' : 'Signed in.',
    )
  }

  if (!open) return null

  return (
    <div className="auth-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
          <X size={16} aria-hidden="true" />
        </button>
        <div className="auth-copy">
          <h2 id="auth-modal-title">{authMode === 'sign-in' ? 'Sign in' : 'Request early access'}</h2>
          <p>
            {isSignUp
              ? 'Fieldnote is opening in small research cohorts so we can support testers well.'
              : 'Use an account so each researcher has their own synced project.'}
          </p>
        </div>

        <label className="auth-field">
          <span>Email</span>
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} />
        </label>

        {isSignUp ? (
          <>
            <p className="auth-access-note">
              Already invited? Use that email here. Otherwise{' '}
              <a href={earlyAccessRequestUrl} target="_blank" rel="noreferrer">
                request access
              </a>
              .
            </p>
            <label className="auth-terms">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>
                I have read and agree to the{' '}
                <a
                  href={TERMS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Fieldnote Alpha Terms of Service
                </a>
                .
              </span>
            </label>
          </>
        ) : (
          <p className="auth-terms-note">
            By signing in, you continue under the{' '}
            <a
              href={TERMS_URL}
              target="_blank"
              rel="noreferrer"
            >
              Fieldnote Alpha Terms
            </a>
            .
          </p>
        )}

        <button className="auth-submit" type="button" onClick={submitAuth} disabled={submitDisabled}>
          {isSignUp ? <UserPlus size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
          {isSignUp ? 'Create account' : 'Sign in'}
        </button>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            const nextMode = authMode === 'sign-in' ? 'sign-up' : 'sign-in'
            setAuthMode(nextMode)
            setAuthStatus(statusForMode(nextMode))
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Request access'}
        </button>

        <p className="auth-status">
          {isSupabaseConfigured ? authStatus : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.'}
        </p>
      </section>
    </div>
  )
}
