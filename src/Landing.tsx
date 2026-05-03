// src/Landing.tsx
//
// Marketing landing page. Mirrors the design handoff at
// /Users/smoovebert/Downloads/design_handoff_type_hierarchy 2/Fieldnote Landing.html
// (and the README in the same bundle), translated into the existing
// app's token vocabulary.
//
// Notably absent from the spec's "scrappy / self-hosted / open source"
// framing: this alpha doesn't ship a self-host path that a non-
// developer could realistically follow, so the marketing copy here
// avoids "free", "open source", "self-host", and the GitHub link.
// When a real self-host story exists, those claims can come back.

import { useState } from 'react'
import { ArrowRight, BarChart3, FileText, Highlighter, Rows3, Tags } from 'lucide-react'
import { AuthModal } from './AuthModal'
import './Landing.css'

type AuthMode = 'sign-in' | 'sign-up'

const STAGES: Array<{ num: string; name: string; desc: string }> = [
  { num: '01', name: 'Organize',  desc: 'Bring transcripts, field notes, and documents into folders. Tag them with attributes.' },
  { num: '02', name: 'Code',      desc: 'Read closely. Highlight passages. Apply codes — including overlapping ones — without losing context.' },
  { num: '03', name: 'Refine',    desc: 'Merge, split, rename, recolor. Codebooks should evolve as your understanding does.' },
  { num: '04', name: 'Classify',  desc: "Build cases for each participant. Add cohort, role, and any attributes you'll group by later." },
  { num: '05', name: 'Analyze',   desc: 'Query results, matrices, word frequency, code co-occurrence, crosstabs — answers to real questions.' },
  { num: '06', name: 'Report',    desc: 'Compose an editorial report and export to PDF, Word, or raw CSV/XLSX.' },
]

const VS_ENTERPRISE: string[] = [
  '$1,000+ per seat per year, locked behind sales calls and license keys.',
  'Desktop apps with file lock-in and brittle sync between machines.',
  "Decades of accumulated UI — every feature that's ever existed, all visible at once.",
  'Cloud features bolted on; collaboration is an afterthought.',
  'Exports designed for the app, not for your manuscript.',
]

const VS_FIELDNOTE: string[] = [
  'Web-based. Auto-saves to cloud with local recovery and downloadable backups.',
  'Six modes mapped to actual research stages — no menu archaeology.',
  'Editorial PDF, Word, CSV, and XLSX exports that read like work products.',
  'AI assist built in: suggested codes, draft descriptions, summaries, and project memos.',
]

const FEATURES: Array<{ num: string; eyebrow: string; h3: string; body: string; tags: string[] }> = [
  {
    num: '01', eyebrow: 'For interviews',
    h3: "Read like it's a transcript.",
    body: "Multiple sources, fixed-width line numbering, multi-code selections, source memos, code memos, and project memos — the things you actually need when you're in the work.",
    tags: ['Line numbers', 'Multi-code', 'Memos', 'Reader view'],
  },
  {
    num: '02', eyebrow: 'For comparison',
    h3: 'Compare what they said.',
    body: "Cases, participant attributes, saved queries, matrix coding, crosstabs, word frequency, and code co-occurrence — every comparison you'd run in NVivo, in a workspace that won't fight you.",
    tags: ['Saved queries', 'Matrix', 'Crosstab', 'Co-occurrence'],
  },
  {
    num: '03', eyebrow: 'For evidence',
    h3: 'Get evidence out cleanly.',
    body: 'Editorial PDF reports, Word documents, coded-excerpt CSVs, codebook CSVs, case sheets, memos, charts, and XLSX workbooks. Exports that read like work products.',
    tags: ['PDF', 'Word', 'CSV', 'XLSX'],
  },
]

export function Landing() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')

  function openAuth(mode: AuthMode) {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  return (
    <div className="landing-root">
      <header className="landing-nav" aria-label="Site navigation">
        <div className="landing-brand" aria-label="Fieldnote">
          <span className="landing-brand-eyebrow">Qualitative research workspace</span>
          <span className="landing-brand-name">Fieldnote</span>
        </div>
        <nav className="landing-nav-links">
          <a className="landing-nav-link" href="#workflow">Workflow</a>
          <a className="landing-nav-link" href="#features">Outputs</a>
          <button type="button" className="landing-nav-link" onClick={() => openAuth('sign-in')}>Sign in</button>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="hero-h1">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow on-dark">Modern QDA for interview work</p>
            <h1 id="hero-h1" className="landing-hero-h1">
              <span className="landing-hero-lead">
                Read it.<br />Code it.<br />Defend it.
              </span>
              <span className="landing-hero-cont">
                A qualitative workspace for researchers who actually do the work.
              </span>
            </h1>
            <p className="landing-hero-sub">
              Import transcripts, code passages, refine themes, compare participants, and export evidence — without the institutional software tax.
            </p>
            <div className="landing-cta-row">
              <button type="button" className="landing-btn landing-btn-primary on-dark" onClick={() => openAuth('sign-up')}>
                Start a project
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="landing-btn landing-btn-ghost on-dark" onClick={() => openAuth('sign-in')}>
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
                  <div><span>Access barriers</span><i style={{ width: '76%' }} /></div>
                  <div><span>Institutional trust</span><i style={{ width: '54%' }} /></div>
                  <div><span>Guidance</span><i style={{ width: '42%' }} /></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-loop" id="workflow" aria-labelledby="loop-h2">
        <div className="landing-loop-grid">
          <div className="landing-loop-intro">
            <p className="landing-eyebrow">The research loop</p>
            <h2 id="loop-h2" className="landing-loop-h2">
              One calm workspace,<br /><em>source to report.</em>
            </h2>
            <p className="landing-loop-sub">
              Six modes that map to how qualitative work actually moves — not how decades-old enterprise software organizes its menus.
            </p>
          </div>
          <ol className="landing-loop-stages">
            {STAGES.map((stage) => (
              <li key={stage.num} className="landing-stage">
                <span className="landing-stage-num">{stage.num}</span>
                <div>
                  <h3 className="landing-stage-name">{stage.name}</h3>
                  <p className="landing-stage-desc">{stage.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="landing-vs" aria-labelledby="vs-h2">
        <div className="landing-vs-inner">
          <p className="landing-eyebrow">Why Fieldnote</p>
          <h2 id="vs-h2" className="landing-vs-h2">
            Built for researchers, <em>not procurement.</em>
          </h2>
          <div className="landing-vs-card">
            <div className="landing-vs-col">
              <p className="landing-vs-col-eyebrow">Enterprise QDA</p>
              <h3 className="landing-vs-col-name">NVivo, ATLAS.ti, MAXQDA</h3>
              <ul className="landing-vs-list">
                {VS_ENTERPRISE.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="landing-vs-col is-fn">
              <p className="landing-vs-col-eyebrow">Fieldnote</p>
              <h3 className="landing-vs-col-name is-fn">A workspace, not a vendor</h3>
              <ul className="landing-vs-list">
                {VS_FIELDNOTE.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features" aria-labelledby="features-h2">
        <div className="landing-features-inner">
          <div className="landing-features-intro">
            <p className="landing-eyebrow">What you get</p>
            <h2 id="features-h2" className="landing-features-h2">The boring parts done well.</h2>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map((feature) => (
              <article key={feature.num} className="landing-feature-card">
                <p className="landing-feature-num">{feature.num} / {feature.eyebrow.toUpperCase()}</p>
                <h3 className="landing-feature-h3">{feature.h3}</h3>
                <p className="landing-feature-body">{feature.body}</p>
                <div className="landing-feature-tags">
                  {feature.tags.map((tag) => <span key={tag} className="landing-feature-tag">{tag}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="landing-cta-h2">
            Calm. Practical.<br /><em>Built for the work.</em>
          </h2>
          <div className="landing-cta-actions">
            <button type="button" className="landing-btn landing-btn-primary on-dark" onClick={() => openAuth('sign-up')}>
              Start a project
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button type="button" className="landing-btn landing-btn-ghost on-dark" onClick={() => openAuth('sign-in')}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-text">
          <span className="landing-footer-line">Fieldnote — qualitative research software, in alpha.</span>
          <span className="landing-footer-dedication">Made in California. Dedicated to Dr. S Robbins and Birdie Robbins.</span>
        </div>
        <nav className="landing-footer-links" aria-label="Site footer">
          <a href="/terms-of-service.md" target="_blank" rel="noreferrer">Terms of Service</a>
          <span aria-hidden="true">·</span>
          <a href="/privacy-policy.md" target="_blank" rel="noreferrer">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="mailto:studio.ops@behemothagency.com">Contact</a>
        </nav>
      </footer>

      <AuthModal key={authMode} open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
