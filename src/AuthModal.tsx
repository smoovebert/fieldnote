// src/AuthModal.tsx
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { LogIn, UserPlus, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

type Props = {
  open: boolean
  initialMode?: AuthMode
  onClose: () => void
}

export function AuthModal({ open, initialMode = 'sign-in', onClose }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authStatus, setAuthStatus] = useState('Sign in to sync your research workspace.')

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
    setAuthStatus(authMode === 'sign-in' ? 'Signing in...' : 'Creating account...')
    const credentials = { email, password }
    const { error } =
      authMode === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials)
    if (error) {
      setAuthStatus(error.message)
      return
    }
    setAuthStatus(
      authMode === 'sign-in' ? 'Signed in.' : 'Account created. Check email confirmation settings if needed.',
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
          <h2 id="auth-modal-title">{authMode === 'sign-in' ? 'Sign in' : 'Create account'}</h2>
          <p>Use an account so each researcher has their own synced project. Sharing can build on this next.</p>
        </div>

        <label className="auth-field">
          <span>Email</span>
          <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} />
        </label>

        <button className="auth-submit" type="button" onClick={submitAuth} disabled={!isSupabaseConfigured}>
          {authMode === 'sign-in' ? <LogIn size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
          {authMode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>

        <button
          className="auth-switch"
          type="button"
          onClick={() => setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}
        >
          {authMode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>

        <p className="auth-status">
          {isSupabaseConfigured ? authStatus : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.'}
        </p>
      </section>
    </div>
  )
}
