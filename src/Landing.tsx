// src/Landing.tsx
//
// Marketing landing page. Mirrors the design handoff at
// /Users/smoovebert/Downloads/design_handoff_type_hierarchy 2/Fieldnote Landing.html
// (and the README in the same bundle), translated into the existing
// app's token vocabulary.
//
// Notably absent from the spec's "scrappy / self-hosted / open source"
// framing: the current hosted build doesn't ship a self-host path
// that a non-developer could realistically follow, so the marketing copy here
// avoids "free", "open source", "self-host", and the GitHub link.
// When a real self-host story exists, those claims can come back.

import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { AuthModal } from './AuthModal'
import './Landing.css'

type AuthMode = 'sign-in' | 'sign-up'

const STAGES: Array<{ num: string; name: string; desc: string }> = [
  { num: '01', name: 'Organize',  desc: 'Import transcripts, field notes, PDFs, and spreadsheets. Keep folders, memos, and attributes together.' },
  { num: '02', name: 'Code',      desc: 'Select passages, apply one or more codes, and keep line numbers visible while you read.' },
  { num: '03', name: 'Refine',    desc: 'Rename, merge, split, nest, and document codes as the analysis changes.' },
  { num: '04', name: 'Classify',  desc: 'Create cases for participants, sites, or groups. Add the attributes you will compare later.' },
  { num: '05', name: 'Analyze',   desc: 'Filter excerpts, run matrices and crosstabs, and check word frequency or code co-occurrence.' },
  { num: '06', name: 'Report',    desc: 'Assemble findings, excerpts, memos, and charts. Export PDF, Word, CSV, or XLSX.' },
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
  'Six modes in order: organize, code, refine, classify, analyze, report.',
  'PDF, Word, CSV, and XLSX exports for reports, codebooks, cases, and excerpts.',
  'AI assist built in: suggested codes, draft descriptions, summaries, and project memos.',
]

const FEATURES: Array<{ num: string; eyebrow: string; h3: string; body: string; tags: string[] }> = [
  {
    num: '01', eyebrow: 'For interviews',
    h3: 'Work from the transcript.',
    body: 'Line-numbered readers, overlapping codes, source memos, code memos, and project memos stay close to the material you are reading.',
    tags: ['Line numbers', 'Multi-code', 'Memos', 'Reader view'],
  },
  {
    num: '02', eyebrow: 'For comparison',
    h3: 'Compare sources and cases.',
    body: 'Cases, participant attributes, saved queries, matrices, crosstabs, word frequency, and code co-occurrence live in the same project.',
    tags: ['Saved queries', 'Matrix', 'Crosstab', 'Co-occurrence'],
  },
  {
    num: '03', eyebrow: 'For evidence',
    h3: 'Export usable evidence.',
    body: 'Build PDF reports, Word documents, coded-excerpt CSVs, codebook CSVs, case sheets, memos, charts, and XLSX workbooks.',
    tags: ['PDF', 'Word', 'CSV', 'XLSX'],
  },
]

const CAPABILITIES: Array<{ group: string; items: string[] }> = [
  {
    group: 'Sources',
    items: ['TXT/MD/CSV import', 'DOCX interviews', 'PDF page coding', 'Folders + archive'],
  },
  {
    group: 'Coding',
    items: ['Overlapping codes', 'Nested code tree', 'Drag to nest/root', 'Excerpt notes'],
  },
  {
    group: 'Refinement',
    items: ['Merge codes', 'Split codes', 'Duplicate review', 'Orphan cleanup'],
  },
  {
    group: 'Cases',
    items: ['Participants/cases', 'Attributes', 'Spreadsheet import', 'Case sheets'],
  },
  {
    group: 'Analyze',
    items: ['Filtered excerpts', 'Matrix coding', 'Crosstabs', 'Word + co-occurrence'],
  },
  {
    group: 'Outputs',
    items: ['PDF reports', 'Word reports', 'CSV/XLSX exports', 'Project backups'],
  },
  {
    group: 'AI assist',
    items: ['Suggest codes', 'Draft descriptions', 'Source summaries', 'Project memo drafts'],
  },
  {
    group: 'Safety',
    items: ['Cloud autosave', 'Local recovery', 'Download backup', 'AI consent + BYOK'],
  },
]

const TRUST_CONTROLS: Array<{ title: string; body: string }> = [
  {
    title: 'Private by default',
    body: 'Projects are scoped to your signed-in account in Supabase, with database policies limiting which rows the browser can read.',
  },
  {
    title: 'Autosave plus local recovery',
    body: 'Changes save to the cloud, and Fieldnote writes a browser recovery snapshot before the network save starts.',
  },
  {
    title: 'Portable backups and exports',
    body: 'Download a .fieldnote.json project backup, or export reports and raw data as PDF, Word, CSV, and XLSX.',
  },
  {
    title: 'AI stays optional',
    body: 'Hosted AI asks for consent first. BYOK keys are encrypted, used server-side, and never returned to the browser.',
  },
  {
    title: 'No tracking stack',
    body: 'No Google Analytics, Segment, Mixpanel, ad pixels, or behavioral tracking scripts on the product.',
  },
  {
    title: 'Delete and leave cleanly',
    body: 'Delete projects or your account from inside the app. Account deletion removes related project rows server-side.',
  },
]

const ROADMAP: Array<{ horizon: string; title: string; body: string; items: string[] }> = [
  {
    horizon: 'Media depth',
    title: 'Audio, video, images, and linked transcripts.',
    body: 'Add common field materials to the same coding and memoing space.',
    items: ['Speaker-labeled transcription', 'Transcript-linked playback', 'Image region coding'],
  },
  {
    horizon: 'Team research',
    title: 'Collaboration without losing analytic control.',
    body: 'Support shared projects, reviewer roles, and careful comparison between coders.',
    items: ['Shared projects', 'Inter-coder reliability', 'Conflict review'],
  },
  {
    horizon: 'Visual analysis',
    title: 'Maps and charts that explain the evidence.',
    body: 'Turn query results into charts and maps that can travel into reports.',
    items: ['Hierarchy charts', 'Concept maps', 'Relationship maps'],
  },
  {
    horizon: 'Research intelligence',
    title: 'Ask questions across the corpus.',
    body: 'Use source-grounded AI to find passages, summarize patterns, and keep citations attached.',
    items: ['Ask your data', 'Citation-first answers', 'Cross-project search'],
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
          <a className="landing-nav-link" href="#features">Features</a>
          <a className="landing-nav-link" href="#roadmap">Roadmap</a>
          <button type="button" className="landing-nav-link" onClick={() => openAuth('sign-in')}>Sign in</button>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="hero-h1">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Modern QDA for interview work</p>
            <h1 id="hero-h1" className="landing-hero-h1">
              <span className="landing-hero-lead">
                Read closely.<br />Code carefully.<br />Report clearly.
              </span>
              <span className="landing-hero-cont">
                A web-based QDA workspace for interview-centered research.
              </span>
            </h1>
            <p className="landing-hero-sub">
              Import transcripts and PDFs, code the same passage more than one way, refine your codebook, compare cases and attributes, and export the evidence you need.
            </p>
            <div className="landing-cta-row">
              <button type="button" className="landing-btn landing-btn-primary" onClick={() => openAuth('sign-up')}>
                Request early access
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              <button type="button" className="landing-btn landing-btn-ghost" onClick={() => openAuth('sign-in')}>
                Sign in
              </button>
            </div>
          </div>

          <div className="landing-product-frame" aria-label="Fieldnote product preview">
            <div className="landing-product-shell landing-product-demo">
              {/* Top nav — dark band, single-line wordmark + the seven
                  horizontal mode tabs + a single status dot. Tighter
                  than the live shell because the hero column gives
                  the mock about half the room a real top nav has. */}
              <header className="landing-mock-nav">
                <span className="landing-mock-brand">Fieldnote</span>
                <nav className="landing-mock-tabs" aria-hidden="true">
                  <span className="landing-mock-tab">Overview</span>
                  <span className="landing-mock-tab">Organize</span>
                  <span className="landing-mock-tab is-active">Code</span>
                  <span className="landing-mock-tab">Refine</span>
                  <span className="landing-mock-tab">Classify</span>
                  <span className="landing-mock-tab">Analyze</span>
                  <span className="landing-mock-tab">Report</span>
                </nav>
                <div className="landing-mock-status" aria-hidden="true" title="Saved">
                  <span className="landing-mock-dot" />
                </div>
              </header>

              {/* Detail toolbar — eyebrow + source title (Newsreader
                  T1) on the left; the live app puts the search box
                  on the right but we omit it here for visual quiet. */}
              <div className="landing-mock-toolbar">
                <span className="landing-mock-eyebrow">Detail View</span>
                <h3 className="landing-mock-title">Interview 03</h3>
              </div>

              {/* Active-codes bar — second row of the document panel.
                  T3 active-code title + Quick menu toggle + the
                  Code selection primary button. This is where the
                  Code-selection button moved to in the live app. */}
              <div className="landing-mock-active-codes">
                <div className="landing-mock-active-codes-text">
                  <strong>Access barriers</strong>
                  <span>Drag across a phrase to apply.</span>
                </div>
                <span className="landing-mock-active-codes-actions">
                  <span className="landing-mock-quick-toggle">
                    <span className="landing-mock-checkbox is-on" />
                    Quick menu
                  </span>
                  <span className="landing-mock-code-button">Code selection</span>
                </span>
              </div>

              {/* Line-numbered transcript reader — same 32px gutter,
                  Newsreader 16.5/1.75 body, --ink-4 mono line numbers,
                  one teal mark to show how a coded passage renders. */}
              <div className="landing-mock-reader">
                <p>
                  <span className="landing-mock-line">12</span>
                  <span>It was not just one thing. The form asked for documents I did not have anymore, and every office told me to call someone else.</span>
                </p>
                <p>
                  <span className="landing-mock-line">13</span>
                  <span>After a while it felt like the system was testing whether I would give up.</span>
                </p>
                <p>
                  <span className="landing-mock-line">14</span>
                  <span><mark className="landing-mock-mark">She explained the steps in plain language and wrote down what to bring next time.</mark></span>
                </p>
                <div className="landing-mock-selection-menu" aria-hidden="true">
                  <span className="landing-mock-menu-label">Code selection</span>
                  <span className="landing-mock-menu-code">Access barriers</span>
                  <span className="landing-mock-menu-code is-alt">Service navigation</span>
                  <span className="landing-mock-menu-add">+ New code</span>
                </div>
              </div>
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
              Organize sources, code passages, refine the codebook, classify cases, analyze patterns, and prepare a report.
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
            Made for small research teams, <em>not procurement cycles.</em>
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
              <h3 className="landing-vs-col-name is-fn">Browser-based QDA</h3>
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

      <section className="landing-capabilities" aria-labelledby="capabilities-h2">
        <div className="landing-capabilities-inner">
          <div className="landing-capabilities-head">
            <p className="landing-eyebrow">Current capabilities</p>
            <h2 id="capabilities-h2" className="landing-capabilities-h2">
              A full-featured QDA workspace for interview-centered research.
            </h2>
            <p>
              Fieldnote brings source management, close coding, codebook refinement, cases, attributes, analysis, AI assist, and exportable evidence into one web workspace.
            </p>
          </div>
          <div className="landing-capability-grid">
            {CAPABILITIES.map((capability) => (
              <article key={capability.group} className="landing-capability-card">
                <h3>{capability.group}</h3>
                <ul>
                  {capability.items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={14} aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-trust" aria-labelledby="trust-h2">
        <div className="landing-trust-inner">
          <div className="landing-trust-head">
            <p className="landing-eyebrow on-dark">Data safety</p>
            <h2 id="trust-h2" className="landing-trust-h2">
              Your research stays yours.
            </h2>
            <p>
              Fieldnote keeps backups, exports, AI settings, and account controls visible instead of burying them in admin screens.
            </p>
          </div>
          <div className="landing-trust-grid">
            {TRUST_CONTROLS.map((item) => (
              <article key={item.title} className="landing-trust-card">
                <CheckCircle2 size={16} aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
          <a className="landing-trust-link" href="/privacy-policy.md" target="_blank" rel="noreferrer">
            Read the full Privacy Policy
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="landing-roadmap" id="roadmap" aria-labelledby="roadmap-h2">
        <div className="landing-roadmap-inner">
          <div className="landing-roadmap-head">
            <p className="landing-eyebrow">Roadmap</p>
            <h2 id="roadmap-h2" className="landing-roadmap-h2">
              Next, Fieldnote expands beyond text.
            </h2>
            <p>
              The next releases add richer source types, shared coding, visual analysis, and source-grounded AI.
            </p>
          </div>
          <div className="landing-roadmap-grid">
            {ROADMAP.map((item) => (
              <article key={item.horizon} className="landing-roadmap-card">
                <p className="landing-roadmap-horizon">{item.horizon}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <ul>
                  {item.items.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2 className="landing-cta-h2">
            Bring a transcript.<br /><em>Leave with evidence.</em>
          </h2>
          <div className="landing-cta-actions">
            <button type="button" className="landing-btn landing-btn-primary on-dark" onClick={() => openAuth('sign-up')}>
              Request early access
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
          <span className="landing-footer-line">Fieldnote — qualitative research software for close reading, coding, analysis, and reporting.</span>
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
