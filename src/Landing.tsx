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
  { num: '01', name: 'Organize',  desc: 'Drop in transcripts, notes, PDFs, and spreadsheets. Keep the project from becoming a desktop folder named final_final_2.' },
  { num: '02', name: 'Code',      desc: 'Mark the passage, add one code or several, and keep line numbers visible while you read.' },
  { num: '03', name: 'Refine',    desc: 'Rename, merge, split, nest, and document codes when your first pass turns out to be only a first pass.' },
  { num: '04', name: 'Classify',  desc: 'Make cases for people, sites, or groups. Add the attributes you will want later, because later always arrives.' },
  { num: '05', name: 'Analyze',   desc: 'Filter excerpts, run matrices and crosstabs, and check word frequency or code co-occurrence without opening three other apps.' },
  { num: '06', name: 'Report',    desc: 'Gather findings, excerpts, memos, and charts. Export PDF, Word, CSV, or XLSX.' },
]

const VS_ENTERPRISE: string[] = [
  '$1,000+ per seat per year, locked behind sales calls and license keys.',
  'Desktop apps with file lock-in and brittle sync between machines.',
  "Decades of accumulated UI — every feature that's ever existed, all visible at once.",
  'Cloud features bolted on; collaboration is an afterthought.',
  'Exports designed for the app, not for your manuscript.',
]

const VS_FIELDNOTE: string[] = [
  'Web-based, autosaved, locally recoverable, and backed up when you want a copy in your own hands.',
  'Six modes in a sane order: organize, code, refine, classify, analyze, report.',
  'Exports that leave cleanly: PDF, Word, CSV, and XLSX.',
  'AI assist is there when useful: suggestions, summaries, drafts, and BYOK.',
]

const FEATURES: Array<{ num: string; eyebrow: string; h3: string; body: string; tags: string[] }> = [
  {
    num: '01', eyebrow: 'For interviews',
    h3: 'Work from the transcript.',
    body: 'Line numbers, overlapping codes, source memos, code memos, and project notes stay near the thing you are reading.',
    tags: ['Line numbers', 'Multi-code', 'Memos', 'Reader view'],
  },
  {
    num: '02', eyebrow: 'For comparison',
    h3: 'Compare sources and cases.',
    body: 'Cases, attributes, saved questions, matrices, crosstabs, word frequency, and co-occurrence all live in the same project.',
    tags: ['Saved queries', 'Matrix', 'Crosstab', 'Co-occurrence'],
  },
  {
    num: '03', eyebrow: 'For evidence',
    h3: 'Export usable evidence.',
    body: 'Make PDF reports, Word docs, coded-excerpt CSVs, codebooks, case sheets, memos, charts, and XLSX workbooks.',
    tags: ['PDF', 'Word', 'CSV', 'XLSX'],
  },
]

const ARTIFACTS: Array<{ step: string; title: string; kind: 'source' | 'code' | 'matrix' | 'report' }> = [
  { step: 'Source', title: 'Interview excerpt', kind: 'source' },
  { step: 'Code', title: 'Close reading', kind: 'code' },
  { step: 'Analyze', title: 'Pattern check', kind: 'matrix' },
  { step: 'Report', title: 'Evidence page', kind: 'report' },
]

const CAPABILITIES: Array<{ group: string; body: string; items: string[] }> = [
  {
    group: 'Close reading',
    body: 'Bring the interview materials into one place and keep the context from wandering off.',
    items: ['TXT/MD/CSV import', 'DOCX interviews', 'PDF page coding', 'Folders, memos, and archive'],
  },
  {
    group: 'Codebook work',
    body: 'Code the passage, then admit the codebook needs changing and change it.',
    items: ['Overlapping codes', 'Nested code tree', 'Drag to nest/root', 'Merge, split, and duplicate review'],
  },
  {
    group: 'Comparison',
    body: 'Move from marked passages to patterns across people, groups, and attributes.',
    items: ['Cases and attributes', 'Filtered excerpts', 'Matrix coding', 'Crosstabs and co-occurrence'],
  },
  {
    group: 'Outputs and safety',
    body: 'Get the work out again. Reports, tables, backups, the whole escape hatch.',
    items: ['PDF and Word reports', 'CSV/XLSX exports', 'Project backups', 'AI consent and BYOK'],
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
            <p className="landing-eyebrow">QDA for interview work</p>
            <h1 id="hero-h1" className="landing-hero-h1">
              <span className="landing-hero-lead">
                Read the material.<br />Code what matters.<br />Find the pattern.
              </span>
              <span className="landing-hero-cont">
                A web workspace for transcripts, PDFs, codes, cases, queries, and reports.
              </span>
            </h1>
            <p className="landing-hero-sub">
              Bring in the material, mark what matters, compare the patterns, and get the evidence back out. No license-key ceremony. No desktop-app archaeology.
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

      <section className="landing-evidence" aria-labelledby="evidence-h2">
        <div className="landing-evidence-inner">
          <div className="landing-evidence-head">
            <p className="landing-eyebrow on-dark">Source to report</p>
            <h2 id="evidence-h2" className="landing-evidence-h2">
              One quote can become<br /><em>a whole thread.</em>
            </h2>
            <p>
              The excerpt, the code, the comparison, and the report page stay close enough that you can remember why any of it mattered.
            </p>
          </div>

          <div className="landing-artifact-track" aria-label="Evidence path from source to report">
            {ARTIFACTS.map((artifact) => (
              <article key={artifact.step} className={`landing-artifact landing-artifact-${artifact.kind}`}>
                <p className="landing-artifact-step">{artifact.step}</p>
                <h3>{artifact.title}</h3>
                {artifact.kind === 'source' && (
                  <div className="landing-artifact-source-body">
                    <p><span>12</span> The form asked for documents I did not have anymore.</p>
                    <p><span>13</span> The system was testing whether I would give up.</p>
                    <p><span>14</span><mark>She explained the steps in plain language.</mark></p>
                  </div>
                )}
                {artifact.kind === 'code' && (
                  <div className="landing-artifact-code-body">
                    <span>Access barriers</span>
                    <span>Service navigation</span>
                    <span>Plain-language support</span>
                    <small>memo: participant names the paperwork as the barrier</small>
                  </div>
                )}
                {artifact.kind === 'matrix' && (
                  <div className="landing-artifact-matrix-body">
                    <span />
                    <strong>Caregiver</strong>
                    <strong>Student</strong>
                    <b>Access</b>
                    <em>8</em>
                    <em>3</em>
                    <b>Support</b>
                    <em>5</em>
                    <em>6</em>
                  </div>
                )}
                {artifact.kind === 'report' && (
                  <div className="landing-artifact-report-body">
                    <span />
                    <strong>Theme: access barriers</strong>
                    <p>“The form asked for documents I did not have anymore...”</p>
                    <small>PDF · Word · CSV · XLSX</small>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-loop" id="workflow" aria-labelledby="loop-h2">
        <div className="landing-loop-grid">
          <div className="landing-loop-intro">
            <p className="landing-eyebrow">The research loop</p>
            <h2 id="loop-h2" className="landing-loop-h2">
              The usual research mess,<br /><em>in a sane order.</em>
            </h2>
            <p className="landing-loop-sub">
              Organize sources, code passages, clean up the codebook, compare patterns, and make the thing you can actually share.
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
            Made for people doing the work, <em>not people approving the purchase order.</em>
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
            <h2 id="features-h2" className="landing-features-h2">The unglamorous parts, handled.</h2>
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
              It already does a lot.
            </h2>
            <p>
              Import, code, refine, classify, analyze, export. The core interview-work stack is here, with AI assist and backups where they belong: useful, visible, and optional.
            </p>
          </div>
          <div className="landing-capability-grid">
            {CAPABILITIES.map((capability) => (
              <article key={capability.group} className="landing-capability-card">
                <div>
                  <h3>{capability.group}</h3>
                  <p>{capability.body}</p>
                </div>
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
              Your work should not feel fragile.
            </h2>
            <p>
              Autosave, local recovery, backups, AI controls, and deletion paths are visible because panic is not a feature.
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
              More materials, same idea.
            </h2>
            <p>
              Next up: media, teams, maps, and source-grounded AI, without turning the app into a cockpit.
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
            Bring a transcript.<br /><em>Get unstuck.</em>
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
          <span className="landing-footer-line">Fieldnote — QDA for close reading, coding, analysis, and reports.</span>
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
