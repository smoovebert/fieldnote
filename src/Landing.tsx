// src/Landing.tsx
import { useState } from 'react'
import { AuthModal } from './AuthModal'
import './Landing.css'

type AuthMode = 'sign-in' | 'sign-up'

export function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')

  function openAuth(mode: AuthMode) {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-mark">F</div>
        <div className="landing-eyebrow">Qualitative workspace</div>
      </header>

      <main className="landing-hero">
        <div className="landing-hero-inner">
          <h1 className="landing-headline">Quiet qualitative research.</h1>
          <ul className="landing-deck">
            <li>Read sources at length.</li>
            <li>Code with care.</li>
            <li>Find patterns later.</li>
          </ul>
          <div className="landing-cta-row">
            <button type="button" className="landing-cta" onClick={() => openAuth('sign-in')}>
              Sign in →
            </button>
            <button type="button" className="landing-subcta" onClick={() => openAuth('sign-up')}>
              Create an account
            </button>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <span>Fieldnote · qualitative research workspace</span>
        <a href="https://github.com/smoovebert/fieldnote" target="_blank" rel="noreferrer">
          github.com/smoovebert/fieldnote
        </a>
      </footer>

      <AuthModal key={authMode} open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
