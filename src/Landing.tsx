import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AuthModal } from './AuthModal'
import './Landing.css'

type AuthMode = 'sign-in' | 'sign-up'

type FlowMode = 'organize' | 'code' | 'refine' | 'classify' | 'analyze' | 'report'

const FLOW_ROWS: {
  step: string
  title: string
  titleEm: string
  body: string
  mode: FlowMode
  accent: string
}[] = [
  {
    step: '01 / organize.',
    title: 'Drop everything in,',
    titleEm: 'stop renaming files.',
    body: 'Drop in transcripts, notes, PDFs, and spreadsheets. Keep the project from becoming a desktop folder named final_final_2.',
    mode: 'organize',
    accent: 'teal',
  },
  {
    step: '02 / code.',
    title: 'Mark the passage,',
    titleEm: 'add what it means.',
    body: 'Mark the passage, add one code or several, and keep line numbers visible while you read.',
    mode: 'code',
    accent: 'rose',
  },
  {
    step: '03 / refine.',
    title: 'Your first pass was a first pass.',
    titleEm: 'Fix it.',
    body: 'Rename, merge, split, nest, and document codes when your first pass turns out to be only a first pass.',
    mode: 'refine',
    accent: 'amber',
  },
  {
    step: '04 / classify.',
    title: 'Make cases for everyone.',
    titleEm: 'Add what you will need later.',
    body: 'Make cases for people, sites, or groups. Add the attributes you will want later, because later always arrives.',
    mode: 'classify',
    accent: 'indigo',
  },
  {
    step: '05 / analyze.',
    title: 'Find the pattern',
    titleEm: 'across every case.',
    body: 'Filter excerpts, run matrices and crosstabs, and check word frequency or code co-occurrence without opening three other apps.',
    mode: 'analyze',
    accent: 'cyan',
  },
  {
    step: '06 / report.',
    title: 'Pull it together.',
    titleEm: 'Get it out.',
    body: 'Gather findings, excerpts, memos, and charts. Export PDF, Word, CSV, or XLSX.',
    mode: 'report',
    accent: 'moss',
  },
]

/* The hero product mock — a faithful slice of the real Code view:
   dark top nav with mode tabs, Sources rail, transcript with line
   numbers + a coded passage, and the Active Codes inspector. */
function HeroMock() {
  return (
    <div className="landing-hero-shot" role="img" aria-label="Fieldnote Code view: a coded interview transcript with the Active Codes inspector.">
      <header className="ln-mtop">
        <div className="ln-mbrand-nm">Fieldnote</div>
        <nav className="ln-mtabs">
          <span className="ln-mtab">Overview</span>
          <span className="ln-mtab">Organize</span>
          <span className="ln-mtab active">Code</span>
          <span className="ln-mtab">Refine</span>
          <span className="ln-mtab">Classify</span>
          <span className="ln-mtab">Analyze</span>
          <span className="ln-mtab">Report</span>
        </nav>
        <span />
      </header>
      <div className="ln-mbody3">
        <aside className="ln-mrail">
          <div className="ln-mrail-head">Sources</div>
          <div className="ln-mrail-item">
            <span className="ln-ic" />
            <span>Internals</span>
            <span className="ln-mrail-meta">2</span>
          </div>
          <div className="ln-mrail-leaf">
            <span className="ln-dot" />
            <span>Interview 07</span>
            <span className="ln-mrail-meta">0</span>
          </div>
          <div className="ln-mrail-leaf active">
            <span className="ln-dot" />
            <span>Interview 03</span>
            <span className="ln-mrail-meta">1</span>
          </div>
        </aside>

        <main className="ln-mcenter">
          <div className="ln-meb">Detail view</div>
          <h3 className="ln-mtitle">Interview 03</h3>
          <div className="ln-mmeta">
            Interview 03<span className="ln-sep">·</span>137 words
            <span className="ln-sep">·</span>1 code applied
          </div>
          <div className="ln-mcodecard">
            <div className="ln-mcc-head">
              <div className="ln-mcc-head-l">
                <span className="ln-mcc-dot" />
                <span className="ln-mcc-name">Access barriers</span>
              </div>
              <span className="ln-mcc-btn">⌖ Code selection</span>
            </div>
            <div className="ln-mreader">
              <div className="ln-mline">
                <span className="ln-mnum">3</span>
                <span className="ln-mtext">
                  <span className="ln-speaker">Participant:</span>It was not just one thing. The
                  form asked for documents I did
                </span>
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">4</span>
                <span className="ln-mtext">
                  not have anymore, and every office told me to call someone else.
                </span>
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">5</span>
                <span className="ln-mtext">
                  After a while it felt like the system was testing whether I would give up.
                </span>
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">6</span>
                <span className="ln-mtext" />
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">7</span>
                <span className="ln-mtext">
                  <span className="ln-speaker">Interviewer:</span>What helped you keep going?
                </span>
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">8</span>
                <span className="ln-mtext" />
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">9</span>
                <span className="ln-mtext">
                  <span className="ln-speaker">Participant:</span>
                  <span className="ln-mmark">She explained the steps in plain language</span>
                </span>
              </div>
              <div className="ln-mline">
                <span className="ln-mnum">10</span>
                <span className="ln-mtext">
                  <span className="ln-mmark">and wrote down what to bring next time.</span>
                </span>
              </div>
            </div>
          </div>
        </main>

        <aside className="ln-minspect">
          <div className="ln-minsp-head">Active Codes</div>
          <div className="ln-mcode-row active">
            <span className="ln-mcode-row-dot" style={{ background: 'var(--c-rose)' }} />
            <span>Access barriers</span>
            <span className="ln-mcode-row-refs">3</span>
          </div>
          <div className="ln-mcode-row">
            <span className="ln-mcode-row-dot" style={{ background: 'var(--c-cyan)' }} />
            <span>Application challenges</span>
            <span className="ln-mcode-row-refs">0</span>
          </div>
          <div className="ln-mcode-row">
            <span className="ln-mcode-row-dot" style={{ background: 'var(--c-amber)' }} />
            <span>Gathering feedback</span>
            <span className="ln-mcode-row-refs">1</span>
          </div>
          <div className="ln-mcode-row">
            <span className="ln-mcode-row-dot" style={{ background: 'var(--c-indigo)' }} />
            <span>Identifying pain points</span>
            <span className="ln-mcode-row-refs">0</span>
          </div>
          <div className="ln-mcode-row">
            <span className="ln-mcode-row-dot" style={{ background: 'var(--c-moss)' }} />
            <span>Process obstacles</span>
            <span className="ln-mcode-row-refs">0</span>
          </div>
          <div className="ln-mcode-row">
            <span className="ln-mcode-row-dot" style={{ background: 'var(--c-teal)' }} />
            <span>Trust and safety</span>
            <span className="ln-mcode-row-refs">0</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function FlowMock({ mode }: { mode: FlowMode }) {
  if (mode === 'organize') {
    return (
      <div className="ln-mm">
        <div className="ln-mm-top">
          <span className="ln-mt-dot" />Fieldnote<span className="ln-mt-tab">Organize</span>
        </div>
        <div className="ln-mm-body">
          <div className="ln-mm-h">Sources</div>
          <div className="ln-mm-trow"><span className="ln-ic" /><span>Internals</span><span className="ln-ct">14</span></div>
          <div className="ln-mm-tleaf"><span className="ln-dot" /><span>Interview 01.txt</span><span className="ln-ct">3</span></div>
          <div className="ln-mm-tleaf"><span className="ln-dot" /><span>Interview 02.docx</span><span className="ln-ct">7</span></div>
          <div className="ln-mm-tleaf active"><span className="ln-dot" /><span>Interview 03.docx</span><span className="ln-ct">11</span></div>
          <div className="ln-mm-tleaf"><span className="ln-dot" /><span>fieldnotes_2025-09.md</span><span className="ln-ct">2</span></div>
          <div className="ln-mm-h" style={{ marginTop: 6 }}>PDFs</div>
          <div className="ln-mm-tleaf"><span className="ln-dot" /><span>Background.pdf</span><span className="ln-ct">0</span></div>
          <div className="ln-mm-tleaf"><span className="ln-dot" /><span>Final_report_v3.pdf</span><span className="ln-ct">5</span></div>
        </div>
      </div>
    )
  }
  if (mode === 'code') {
    return (
      <div className="ln-mm">
        <div className="ln-mm-top">
          <span className="ln-mt-dot" />Fieldnote<span className="ln-mt-tab">Code</span>
        </div>
        <div className="ln-mm-body">
          <div className="ln-mm-h">Interview 03 · lines 7–11</div>
          <div className="ln-mm-reader">
            <div className="ln-ln"><span className="ln-ln-num">7</span><span className="ln-ln-txt"><span className="ln-sp">I:</span>What helped you keep going?</span></div>
            <div className="ln-ln"><span className="ln-ln-num">8</span><span className="ln-ln-txt" /></div>
            <div className="ln-ln"><span className="ln-ln-num">9</span><span className="ln-ln-txt"><span className="ln-sp">P:</span><span className="ln-mm-mark">She explained the steps in plain language</span></span></div>
            <div className="ln-ln"><span className="ln-ln-num">10</span><span className="ln-ln-txt"><span className="ln-mm-mark">and wrote down what to bring next time.</span></span></div>
            <div className="ln-ln"><span className="ln-ln-num">11</span><span className="ln-ln-txt">After that I knew what to expect.</span></div>
          </div>
          <span className="ln-mm-codepill"><span className="ln-dot" />Plain-language support</span>
        </div>
      </div>
    )
  }
  if (mode === 'refine') {
    return (
      <div className="ln-mm">
        <div className="ln-mm-top">
          <span className="ln-mt-dot" />Fieldnote<span className="ln-mt-tab">Refine</span>
        </div>
        <div className="ln-mm-body">
          <div className="ln-mm-h">Codebook</div>
          <div className="ln-mm-tree">
            <div className="ln-mm-tnode active"><span className="ln-caret">▾</span><span className="ln-sw" style={{ background: 'var(--c-rose)' }} /><span>Access barriers</span><span className="ln-ct">24</span></div>
            <div className="ln-mm-tchild"><span className="ln-sw" style={{ background: 'var(--c-rose)' }} /><span>Documentation</span><span className="ln-ct">8</span></div>
            <div className="ln-mm-tchild"><span className="ln-sw" style={{ background: 'var(--c-rose)' }} /><span>Eligibility</span><span className="ln-ct">6</span></div>
            <div className="ln-mm-tchild"><span className="ln-sw" style={{ background: 'var(--c-rose)' }} /><span>Wait times</span><span className="ln-ct">5</span></div>
            <div className="ln-mm-tnode"><span className="ln-caret">▸</span><span className="ln-sw" style={{ background: 'var(--c-moss)' }} /><span>Plain-language support</span><span className="ln-ct">12</span></div>
            <div className="ln-mm-tnode"><span className="ln-caret">▸</span><span className="ln-sw" style={{ background: 'var(--c-indigo)' }} /><span>Identity work</span><span className="ln-ct">7</span></div>
            <div className="ln-mm-tnode"><span className="ln-caret">▸</span><span className="ln-sw" style={{ background: 'var(--c-teal)' }} /><span>Trust &amp; safety</span><span className="ln-ct">9</span></div>
          </div>
        </div>
      </div>
    )
  }
  if (mode === 'classify') {
    return (
      <div className="ln-mm">
        <div className="ln-mm-top">
          <span className="ln-mt-dot" />Fieldnote<span className="ln-mt-tab">Classify</span>
        </div>
        <div className="ln-mm-body">
          <div className="ln-mm-h">Cases · 5 of 12</div>
          <div className="ln-mm-tbl">
            <div className="ln-h">CASE</div><div className="ln-h">ROLE</div><div className="ln-h">COHORT</div><div className="ln-h">QUOTES</div>
            <div className="ln-id">P01</div><div>Researcher</div><div><span className="ln-chip" style={{ background: 'color-mix(in oklch, var(--c-teal) 22%, white)', color: 'var(--c-teal)' }}>A</span></div><div className="ln-num">12</div>
            <div className="ln-id">P02</div><div>Student</div><div><span className="ln-chip" style={{ background: 'color-mix(in oklch, var(--c-rose) 22%, white)', color: 'var(--c-rose)' }}>B</span></div><div className="ln-num">9</div>
            <div className="ln-id">P03</div><div>Customer</div><div><span className="ln-chip" style={{ background: 'color-mix(in oklch, var(--c-amber) 30%, white)', color: 'var(--ink-2)' }}>A</span></div><div className="ln-num">14</div>
            <div className="ln-id">P04</div><div>Researcher</div><div><span className="ln-chip" style={{ background: 'color-mix(in oklch, var(--c-teal) 22%, white)', color: 'var(--c-teal)' }}>A</span></div><div className="ln-num">7</div>
            <div className="ln-id">P05</div><div>Student</div><div><span className="ln-chip" style={{ background: 'color-mix(in oklch, var(--c-rose) 22%, white)', color: 'var(--c-rose)' }}>B</span></div><div className="ln-num">11</div>
          </div>
        </div>
      </div>
    )
  }
  if (mode === 'analyze') {
    return (
      <div className="ln-mm">
        <div className="ln-mm-top">
          <span className="ln-mt-dot" />Fieldnote<span className="ln-mt-tab">Analyze</span>
        </div>
        <div className="ln-mm-body">
          <div className="ln-mm-h">Crosstab · code × cohort</div>
          <div className="ln-mm-matrix">
            <div className="ln-h">CODE</div><div className="ln-h">CUST.</div><div className="ln-h">STUD.</div><div className="ln-h">RES.</div>
            <div>Access</div><div className="ln-num ln-hot">12</div><div className="ln-num">7</div><div className="ln-num">2</div>
            <div>Support</div><div className="ln-num">4</div><div className="ln-num ln-hot">9</div><div className="ln-num">3</div>
            <div>Trust</div><div className="ln-num">6</div><div className="ln-num">3</div><div className="ln-num">5</div>
            <div>Identity</div><div className="ln-num">2</div><div className="ln-num ln-hot">8</div><div className="ln-num">1</div>
          </div>
          <div className="ln-mm-h" style={{ marginTop: 4 }}>n = 41 excerpts · 12 cases</div>
        </div>
      </div>
    )
  }
  return (
    <div className="ln-mm">
      <div className="ln-mm-top">
        <span className="ln-mt-dot" />Fieldnote<span className="ln-mt-tab">Report</span>
      </div>
      <div className="ln-mm-body">
        <div className="ln-mm-report">
          <div className="ln-h">Theme · 1 of 4</div>
          <div className="ln-title">Access barriers</div>
          <div className="ln-quote">
            "The form asked for documents I did not have anymore, and every office told me to call
            someone else."
          </div>
          <div className="ln-quote">
            "After a while it felt like the system was testing whether I would give up."
          </div>
          <div className="ln-meta">P03 · LINES 3–5 · CROSSTAB ON P. 12</div>
        </div>
        <div className="ln-mm-h" style={{ marginTop: 6 }}>Export · PDF · WORD · CSV · XLSX</div>
      </div>
    </div>
  )
}

const SAFETY_ITEMS = [
  ['i.', 'teal', 'Private by default', 'Each project is scoped to your account. Other users can’t read your work.'],
  ['ii.', 'cyan', 'Autosave plus local recovery', 'Changes save to the cloud, and Fieldnote writes a browser recovery snapshot before the network save starts.'],
  ['iii.', 'moss', 'Portable backups and exports', 'Download a .fieldnote.json project backup, or export reports and raw data as PDF, Word, CSV, and XLSX.'],
  ['iv.', 'indigo', 'AI stays optional', 'Hosted AI asks for consent first. BYOK keys are encrypted, used server-side, and never returned to the browser.'],
  ['v.', 'rose', 'No tracking stack', 'No Google Analytics, Segment, Mixpanel, ad pixels, or behavioral tracking scripts on the product.'],
  ['vi.', 'amber', 'Delete and leave cleanly', 'Delete projects or your account from inside the app. Your data goes with it.'],
]

const FEATURES = [
  ['Close reading', 'TXT/MD/CSV import, DOCX interviews, PDF page coding, folders, memos, archive.'],
  ['Codebook work', 'Overlapping codes, nested code tree, drag to nest/root, merge, split, duplicate review.'],
  ['Comparison', 'Cases and attributes, filtered excerpts, matrix coding, crosstabs and co-occurrence.'],
  ['Outputs', 'PDF and Word reports, CSV/XLSX exports, project backups.'],
]

const ROADMAP = [
  ['Audio, video, images, and linked transcripts', 'Speaker-labeled transcription, transcript-linked playback, image region coding.'],
  ['Collaboration without losing analytic control', 'Shared projects, inter-coder reliability, conflict review.'],
  ['Maps and charts that explain the evidence', 'Hierarchy charts, concept maps, relationship maps.'],
  ['Ask questions across the corpus', 'Citation-first answers, cross-project search.'],
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
      <header className="landing-nav">
        <div className="landing-wrap landing-nav-inner">
          <button
            type="button"
            className="landing-brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="landing-brand-dot" aria-hidden="true" />
            <span>Fieldnote</span>
          </button>
          <nav className="landing-nav-links" aria-label="Landing navigation">
            <a href="#workflow">Workflow</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#roadmap">Roadmap</a>
            <button type="button" onClick={() => openAuth('sign-in')}>Sign in</button>
            <button type="button" className="landing-nav-cta" onClick={() => openAuth('sign-up')}>
              Request access
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-wrap landing-hero-inner">
            <h1>
              QDA for researchers, not{' '}
              <span className="landing-circled">
                procurement departments.
                <svg
                  className="landing-doodle"
                  viewBox="0 0 440 110"
                  aria-hidden="true"
                  preserveAspectRatio="none"
                >
                  <path d="M 24 60 C 18 30, 90 14, 220 14 C 350 14, 420 32, 418 62 C 416 90, 330 98, 210 96 C 90 94, 26 78, 30 58 C 32 48, 40 40, 52 34" />
                </svg>
              </span>
            </h1>

            <p className="landing-hero-sub">
              The full workflow — organize, code, refine, classify, analyze, report — in a browser.
            </p>

            <div className="landing-actions">
              <button
                type="button"
                className="landing-btn landing-btn-primary"
                onClick={() => openAuth('sign-up')}
              >
                Request early access <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="landing-btn landing-btn-ghost"
                onClick={() => openAuth('sign-in')}
              >
                Sign in
              </button>
            </div>

            <div className="landing-mock-stage">
              <HeroMock />
              <div className="landing-margin-note" aria-hidden="true">
                <svg
                  className="landing-margin-arrow"
                  viewBox="0 0 80 60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M 70 8 C 50 14, 28 26, 14 50" />
                  <path d="M 8 44 L 14 50 L 22 46" />
                </svg>
                <div className="landing-margin-text">a coded passage, plain as that</div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-flow" id="workflow">
          <div className="landing-wrap">
            <div className="landing-flow-top">
              <h2>
                The usual research mess,{' '}
                <em>
                  <span className="landing-scribble">
                    in a sane order.
                    <svg
                      viewBox="0 0 240 18"
                      preserveAspectRatio="none"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M 4 12 C 30 4, 60 14, 100 8 C 140 2, 180 14, 236 6" />
                    </svg>
                  </span>
                </em>
              </h2>
              <p>
                Six modes, one workspace. Organize sources, code passages, clean up the codebook,
                compare patterns, and make the thing you can actually share.
              </p>
            </div>

            <div className="landing-flow-list">
              {FLOW_ROWS.map((row, index) => (
                <article
                  key={row.step}
                  className={`landing-flow-row ${index % 2 === 1 ? 'is-flipped' : ''}`}
                  data-accent={row.accent}
                >
                  <div className="landing-flow-copy">
                    <span className="landing-flow-step">{row.step}</span>
                    <h3>
                      {row.title} <em>{row.titleEm}</em>
                    </h3>
                    <p>{row.body}</p>
                  </div>
                  <div className="landing-flow-shot">
                    <FlowMock mode={row.mode} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-proof" id="capabilities">
          <div className="landing-wrap">
            <div className="landing-proof-head">
              <h2>
                <span className="landing-roman">A price you don’t have</span> to justify.
              </h2>
            </div>

            <div className="landing-price-list">
              <article>
                <p className="landing-price-when">today.</p>
                <h3 className="landing-price-num">
                  $0<span>/ seat</span>
                </h3>
                <p className="landing-price-desc">
                  <strong>Free during the alpha.</strong> Sign up, bring a project, code as much as
                  you want. We’re trading polish for your time and feedback.
                </p>
              </article>
              <article>
                <p className="landing-price-when">at launch.</p>
                <h3 className="landing-price-num">
                  <em>low</em>
                  <span>/ month</span>
                </h3>
                <p className="landing-price-desc">
                  <strong>A single, low monthly price.</strong> Aimed at individuals and small
                  teams. No seats, no quotes, no annual sales cycle.
                </p>
              </article>
              <article className="is-elsewhere">
                <p className="landing-price-when">elsewhere.</p>
                <h3 className="landing-price-num landing-price-strike">
                  $1,000+<span>/ seat / yr</span>
                </h3>
                <p className="landing-price-desc">
                  <strong>NVivo, ATLAS.ti, MAXQDA.</strong> Locked behind sales calls and license
                  keys, with desktop apps that lock your files to one machine.
                </p>
              </article>
            </div>

          </div>
        </section>

        <section className="landing-safety">
          <div className="landing-wrap">
            <div className="landing-section-top">
              <h2>
                Your research is <em>safe with us.</em>
              </h2>
              <p>
                Autosave, local recovery, backups, AI controls, and deletion paths are visible
                because panic is not a feature.
              </p>
            </div>
            <div className="landing-safety-grid">
              {SAFETY_ITEMS.map(([num, accent, title, body]) => (
                <article key={title} data-accent={accent}>
                  <p>{num}</p>
                  <div>
                    <h3>{title}</h3>
                    <span>{body}</span>
                  </div>
                </article>
              ))}
            </div>
            <a
              href="/privacy-policy.md"
              target="_blank"
              rel="noreferrer"
              className="landing-inline-link"
            >
              Read the full Privacy Policy →
            </a>
          </div>
        </section>

        <section className="landing-brief">
          <div className="landing-wrap">
            <div className="landing-brief-head">
              <h2>Everything else, briefly.</h2>
            </div>
            <div className="landing-brief-block">
              <h3>Features.</h3>
              <p>Already in the app.</p>
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>What’s included</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map(([feature, body]) => (
                    <tr key={feature}>
                      <td className="landing-brief-area">{feature}</td>
                      <td>{body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="landing-brief-block" id="roadmap">
              <h3>Roadmap.</h3>
              <p>Coming up.</p>
              <table>
                <thead>
                  <tr>
                    <th>Coming up</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {ROADMAP.map(([feature, body]) => (
                    <tr key={feature}>
                      <td className="landing-brief-area">{feature}</td>
                      <td>{body}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-wrap landing-cta-inner">
            <h2>
              Bring a transcript. <em>Get unstuck.</em>
            </h2>
            <div className="landing-actions">
              <button
                type="button"
                className="landing-btn landing-btn-primary"
                onClick={() => openAuth('sign-up')}
              >
                Request early access <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="landing-btn landing-btn-dark-ghost"
                onClick={() => openAuth('sign-in')}
              >
                Read the docs
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap">
          <div className="landing-footer-meta">
            <p>Fieldnote — QDA for close reading, coding, analysis, and reports.</p>
            <span>Made in California. Dedicated to Dr. S Robbins and Birdie Robbins.</span>
          </div>
          <nav aria-label="Footer navigation">
            <a href="/terms-of-service.md" target="_blank" rel="noreferrer">
              Terms of Service
            </a>
            <a href="/privacy-policy.md" target="_blank" rel="noreferrer">
              Privacy Policy
            </a>
            <a href="mailto:studio.ops@behemothagency.com">Contact</a>
          </nav>
        </div>
      </footer>

      <AuthModal key={authMode} open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
