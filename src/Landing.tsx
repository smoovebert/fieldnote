// src/Landing.tsx
import { useState } from 'react'
import { ArrowRight, BarChart3, FileText, Highlighter, Rows3, Tags } from 'lucide-react'
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
        <div className="landing-brand" aria-label="Fieldnote">
          <div className="landing-mark">F</div>
          <div>
            <strong>Fieldnote</strong>
            <span>Qualitative research workspace</span>
          </div>
        </div>
        <nav className="landing-nav" aria-label="Landing navigation">
          <a href="#workflow">Workflow</a>
          <a href="#outputs">Outputs</a>
          <button type="button" onClick={() => openAuth('sign-in')}>Sign in</button>
        </nav>
      </header>

      <main className="landing-hero">
        <section className="landing-hero-band" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Modern QDA for interview work</p>
            <h1 id="landing-title" className="landing-headline">
              Qualitative analysis software for researchers who actually have to do the work.
            </h1>
            <p className="landing-deck">
              Import transcripts, code passages, refine themes, compare participants, and export evidence without the institutional software tax.
            </p>
            <div className="landing-cta-row">
              <button type="button" className="landing-cta" onClick={() => openAuth('sign-up')}>
                Start a project
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="landing-subcta" onClick={() => openAuth('sign-in')}>
                Sign in
              </button>
            </div>
          </div>

          <div className="landing-product-frame" aria-label="Fieldnote product preview">
            <div className="landing-product-shell">
              <aside className="landing-product-rail">
                <strong>Fieldnote</strong>
                <span className="is-active"><Highlighter size={15} aria-hidden="true" /> Code</span>
                <span><Tags size={15} aria-hidden="true" /> Refine</span>
                <span><Rows3 size={15} aria-hidden="true" /> Classify</span>
                <span><BarChart3 size={15} aria-hidden="true" /> Analyze</span>
                <span><FileText size={15} aria-hidden="true" /> Report</span>
              </aside>
              <section className="landing-product-work">
                <div className="mock-toolbar">
                  <span>Interview 03</span>
                  <button type="button">Code selection</button>
                </div>
                <div className="mock-reader">
                  <p><span className="mock-line">12</span>It was not just one thing. The form asked for documents I did not have anymore, and every office told me to call someone else.</p>
                  <p><span className="mock-line">13</span>After a while it felt like the system was testing whether I would give up.</p>
                  <p><span className="mock-line">14</span><mark>She explained the steps in plain language and wrote down what to bring next time.</mark></p>
                </div>
                <div className="mock-analysis">
                  <div>
                    <span>Access barriers</span>
                    <i style={{ width: '76%' }} />
                  </div>
                  <div>
                    <span>Institutional trust</span>
                    <i style={{ width: '54%' }} />
                  </div>
                  <div>
                    <span>Guidance</span>
                    <i style={{ width: '42%' }} />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="landing-strip" id="workflow" aria-labelledby="workflow-title">
          <div>
            <p className="landing-eyebrow">The research loop</p>
            <h2 id="workflow-title">One calm workspace from source to report.</h2>
          </div>
          <div className="landing-workflow">
            {['Organize', 'Code', 'Refine', 'Classify', 'Analyze', 'Report'].map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </section>

        <section className="landing-proof" aria-label="Fieldnote capabilities">
          <div>
            <strong>Made for interviews first.</strong>
            <p>Multiple sources, line numbers, multi-code selections, source memos, code memos, and project memos.</p>
          </div>
          <div>
            <strong>Built for comparison.</strong>
            <p>Cases, participant attributes, saved queries, matrices, crosstabs, word frequency, and co-occurrence.</p>
          </div>
          <div id="outputs">
            <strong>Evidence gets out.</strong>
            <p>Export coded excerpts, codebooks, case sheets, memos, charts, Word reports, PDFs, CSVs, and XLSX workbooks.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Fieldnote is open, practical research software for people without enterprise budgets.</span>
        <a href="https://github.com/smoovebert/fieldnote" target="_blank" rel="noreferrer">
          github.com/smoovebert/fieldnote
        </a>
      </footer>

      <AuthModal key={authMode} open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
