/* global React, TopNav, RailSources, RailReportSections, RailQuestions, InspectActiveCodes, InspectSourceProperties, InspectExportSummary, CODES */

const TRANSCRIPT_LINES = [
  { n: 1, speaker: "Interviewer", text: "Can you tell me what made the application process difficult?", code: "feedback" },
  { n: 2 },
  { n: 3, speaker: "Participant", text: "It was not just one thing. The form asked for documents I did" },
  { n: 4, text: "not have anymore, and every office told me to call someone else. After a while" },
  { n: 5, text: "it felt like the system was testing whether I would give up." },
  { n: 6 },
  { n: 7, speaker: "Interviewer", text: "What helped you keep going?" },
  { n: 8 },
  { n: 9, speaker: "Participant", text: "The campus advisor. She explained the steps in plain language and" },
  { n: 10, text: "wrote down what to bring next time. That made me feel like I was not doing" },
  { n: 11, text: "something wrong." },
  { n: 12 },
  { n: 13, speaker: "Interviewer", text: "Did the process affect how you thought about the university?" },
];

// =================================================================
//  TYPE SPEC — the scale itself, with role + example
// =================================================================
function TypeSpec() {
  const tiers = [
    { tier:"T1", spec:"Newsreader · 32 / 1.15 · 500", role:"Display",        use:"Page-defining titles. Project names. Report cover.", cls:"th-t1", sample:"Sample project" },
    { tier:"T2", spec:"Inter Tight · 22 / 1.2 · 500",  role:"Page title",     use:"Mode page name when no project name applies.",      cls:"th-t2", sample:"Analyze" },
    { tier:"T3", spec:"Inter Tight · 16 / 1.35 · 500", role:"Section",        use:"In-page section heads above content blocks.",       cls:"th-t3", sample:"All sources" },
    { tier:"T4", spec:"Inter Tight · 14 / 1.4 · 500",  role:"Subhead",        use:"Code names in lists, table column emphasis.",       cls:"th-t4", sample:"Access barriers" },
    { tier:"T5", spec:"Inter Tight · 13.5 / 1.5",      role:"Body",           use:"Paragraphs, descriptions, instructional copy.",     cls:"th-t5", sample:"Select text in the source, then click Code selection." },
    { tier:"T6", spec:"Inter Tight · 12.5 / 1.45",     role:"Body small",     use:"Table cells, dense properties, inline meta.",       cls:"th-t6", sample:"Transcript · Internals · 1 reference" },
    { tier:"T7", spec:"Inter Tight · 10.5 / 1.2 · 600 · tracked", role:"Eyebrow / panel head", use:"DETAIL VIEW labels, right-rail panel headings.", cls:"th-t7", sample:"DETAIL VIEW" },
    { tier:"T8", spec:"JetBrains Mono · 11 / 1.3",     role:"Meta",           use:"Counts, dates, refs — anything where alignment matters.", cls:"th-t8", sample:"2026-05-01 · 2 sources · 9 codes" },
  ];
  return (
    <div className="th-spec">
      <div style={{display:"grid", gap:8}}>
        <div className="th-t7">Aesthetic direction · v2</div>
        <div className="th-t1">Type & visual hierarchy</div>
        <div className="th-t5" style={{maxWidth:"60ch"}}>
          Eight tiers. Each with one job. The current app reuses tracked-caps for too many roles
          and runs page titles, section heads, and record names at the same weight. This codifies
          the levels and applies them across mode pages.
        </div>
      </div>

      <div className="th-spec-row">
        <div className="th-spec-rowhead">
          <div className="th-spec-rowhead-label">The scale</div>
          <div className="th-spec-rowhead-name">Eight tiers</div>
          <div className="th-spec-rowhead-desc">Newsreader for display + reading. Inter Tight for UI. JetBrains Mono for numerics.</div>
        </div>
        <div>
          {tiers.map(t => (
            <div key={t.tier} className="th-spec-tier">
              <div>
                <div className="th-spec-tier-name">{t.tier}</div>
                <div style={{font:"500 11px/1.3 var(--th-sans)", color:"var(--th-ink-2)", marginTop:2}}>{t.role}</div>
              </div>
              <div className="th-spec-tier-spec">
                <div>{t.spec}</div>
                <div style={{marginTop:6, color:"var(--th-ink-4)"}}>{t.use}</div>
              </div>
              <div className={t.cls}>{t.sample}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="th-spec-row">
        <div className="th-spec-rowhead">
          <div className="th-spec-rowhead-label">Page header recipe</div>
          <div className="th-spec-rowhead-name">Eyebrow + title + meta</div>
          <div className="th-spec-rowhead-desc">Every page opens with this triplet. T7 eyebrow ("DETAIL VIEW"), T1 or T2 title, T6 meta line.</div>
        </div>
        <div style={{display:"grid", gap:32}}>
          <div className="th-pageheader" style={{margin:0}}>
            <div className="th-t7">Detail view</div>
            <div className="th-t1">Sample project</div>
            <div className="th-t6 th-pageheader-meta">
              <span>One-line description for collaborators</span>
              <span className="dot" /><span>Last edited 5 min ago</span>
            </div>
          </div>
          <div className="th-pageheader" style={{margin:0}}>
            <div className="th-t7">Detail view</div>
            <div className="th-t2">Analyze</div>
            <div className="th-t6 th-pageheader-meta">
              <span>Code co-occurrence pairs across all coded excerpts</span>
              <span className="dot" /><span>1 pair</span>
            </div>
          </div>
        </div>
      </div>

      <div className="th-spec-row">
        <div className="th-spec-rowhead">
          <div className="th-spec-rowhead-label">Right rail</div>
          <div className="th-spec-rowhead-name">Panel head + content</div>
          <div className="th-spec-rowhead-desc">T7 head with leading icon. Properties as key/value with the value tier-up (T4 vs T6).</div>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:24}}>
          <div className="th-card">
            <div className="th-inspect-section" style={{borderBottom:0}}>
              <div className="th-inspect-head">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>
                <div className="th-inspect-head-text">Active Codes</div>
                <span className="th-inspect-count">9</span>
              </div>
              <div className="th-code-list" style={{marginTop:6}}>
                {CODES.slice(0,4).map(c => (
                  <div key={c.id} className="th-code-row">
                    <span style={{width:8, height:8, borderRadius:99, background:c.color}} />
                    <span className="th-code-row-name">{c.name}</span>
                    <span className="th-code-row-refs">{c.refs}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="th-card">
            <div className="th-inspect-section" style={{borderBottom:0}}>
              <div className="th-inspect-head">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3h10v10H3z"/></svg>
                <div className="th-inspect-head-text">Export Summary</div>
              </div>
              <dl className="th-props">
                <div><dt>Project</dt><dd>Sample project</dd></div>
                <div><dt>Sources</dt><dd>2</dd></div>
                <div><dt>Codes</dt><dd>9</dd></div>
                <div><dt>References</dt><dd>1</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =================================================================
//  PAGE: OVERVIEW
// =================================================================
function PageOverview() {
  return (
    <div className="th-frame th-root">
      <TopNav active="overview" />
      <div className="th-body" style={{gridTemplateColumns:"232px minmax(0,1fr) 360px"}}>
        <aside className="th-rail">
          <div className="th-rail-section">
            <div className="th-rail-head">Projects</div>
            <div style={{display:"grid", gap:4}}>
              {[
                { t:"Sample project", s:"2 · 9 codes · 5/1/2026", active:true },
                { t:"New Project", s:"2 · 3 codes · 5/1/2026" },
                { t:"This is a test project and it is very cool", s:"3 · 11 codes · 5/1/2026" },
                { t:"bombdig", s:"3 · 3 codes · 5/1/2026" },
              ].map((p,i)=>(
                <button key={i} className={`th-rail-item ${p.active?"is-active":""}`} style={{gridTemplateColumns:"1fr"}}>
                  <div style={{display:"grid", gap:2}}>
                    <span style={{font:"500 13px/1.3 var(--th-sans)"}}>{p.t}</span>
                    <span style={{font:"400 10.5px/1.2 var(--th-mono)", color:"var(--th-shell-ink-3)"}}>{p.s}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="th-rail-section">
            <div className="th-rail-head">Add a project</div>
            <input className="th-input" placeholder="New project title" style={{background:"rgba(255,255,255,0.04)", border:"1px solid var(--th-shell-rule)", color:"var(--th-shell-ink)"}} />
            <button className="th-btn--primary" style={{justifyContent:"center", marginTop:6}}>+ Create blank project</button>
            <button className="th-btn" style={{justifyContent:"center", background:"transparent", border:"1px solid var(--th-shell-rule)", color:"var(--th-shell-ink-2)"}}>Try a sample project</button>
            <button className="th-btn--ghost" style={{justifyContent:"center", color:"var(--th-shell-ink-2)"}}>Import backup</button>
          </div>
        </aside>

        <main className="th-center">
          <div className="th-pageheader">
            <div className="th-t7">Detail view</div>
            <div className="th-t1">Sample project</div>
            <div className="th-t6 th-pageheader-meta">
              <span>One-line description for collaborators</span>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16}}>
            <div className="th-card">
              <div className="th-card-body">
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" style={{color:"var(--th-ink-3)"}}><path d="M2 13V8M6 13V5M10 13V9M14 13V3"/></svg>
                  <span className="th-t7">Progress</span>
                </div>
                <div style={{display:"flex", alignItems:"baseline", gap:6, marginBottom:12}}>
                  <span style={{font:"500 36px/1 var(--th-serif)", color:"var(--th-ink)", letterSpacing:"-0.02em"}}>1</span>
                  <span className="th-t6" style={{color:"var(--th-ink-3)"}}>of 2 sources coded</span>
                </div>
                <div style={{height:4, borderRadius:99, background:"var(--th-pane-deep)", overflow:"hidden"}}>
                  <div style={{height:"100%", width:"50%", background:"var(--th-action)"}} />
                </div>
              </div>
            </div>
            <div className="th-card">
              <div className="th-card-body">
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" style={{color:"var(--th-ink-3)"}}><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><path d="M5 6l2 4M11 6l-2 4"/></svg>
                  <span className="th-t7">Ontology</span>
                </div>
                <div style={{display:"flex", alignItems:"baseline", gap:6}}>
                  <span style={{font:"500 36px/1 var(--th-serif)", color:"var(--th-ink)", letterSpacing:"-0.02em"}}>9</span>
                  <span className="th-t6" style={{color:"var(--th-ink-3)"}}>themes</span>
                </div>
              </div>
            </div>
          </div>

          <div className="th-card">
            <div className="th-card-head">
              <div className="th-card-head-left">
                <span className="th-t3">Project memo</span>
                <span className="th-t6" style={{color:"var(--th-ink-3)"}}>Notes about research questions, design choices, or evolving thinking.</span>
              </div>
              <button className="th-btn">✦ Draft from snapshots</button>
            </div>
            <div className="th-card-body">
              <textarea className="th-textarea" style={{minHeight:140, border:0, padding:0}} placeholder="Add notes about this project's research questions, design choices, or evolving thinking." />
            </div>
          </div>
        </main>

        <aside className="th-inspect">
          <section className="th-inspect-section">
            <div className="th-inspect-head">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="12" height="12"/></svg>
              <div className="th-inspect-head-text">Project</div>
            </div>
            <dl className="th-props">
              <div><dt>Reader line numbering</dt><dd>Fixed width</dd></div>
              <div><dt>Line width</dt><dd>80 chars</dd></div>
            </dl>
            <button className="th-btn" style={{justifyContent:"center", marginTop:6}}>Edit project settings</button>
          </section>
          <section className="th-inspect-section">
            <div className="th-inspect-head">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 2v12M2 8h12"/></svg>
              <div className="th-inspect-head-text">AI Assist</div>
            </div>
            <dl className="th-props">
              <div><dt>Provider</dt><dd>Your own Gemini key</dd></div>
              <div><dt>Free-tier consent</dt><dd>Given 5/1/2026</dd></div>
            </dl>
            <button className="th-btn" style={{justifyContent:"center", marginTop:6}}>Edit AI settings</button>
          </section>
        </aside>
      </div>
    </div>
  );
}

// =================================================================
//  PAGE: CODE
// =================================================================
function PageCode() {
  return (
    <div className="th-frame th-root">
      <TopNav active="code" />
      <div className="th-body">
        <RailSources active="i03" />
        <main className="th-center">
          <div className="th-pageheader">
            <div className="th-t7">Detail view · Interview 03</div>
            <div className="th-t1">Interview 03</div>
            <div className="th-t6 th-pageheader-meta">
              <span>Transcript</span><span className="dot" />
              <span>Internals</span><span className="dot" />
              <span style={{fontFamily:"var(--th-mono)"}}>137 words</span><span className="dot" />
              <span style={{fontFamily:"var(--th-mono)"}}>1 code applied</span>
            </div>
          </div>

          <div className="th-card">
            <div className="th-card-head">
              <div className="th-card-head-left">
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <span style={{width:8, height:8, borderRadius:99, background:"var(--th-c-rose)"}} />
                  <span className="th-t3">Access barriers</span>
                </div>
                <span className="th-t6" style={{color:"var(--th-ink-3)"}}>Select text in the source, then click Code selection. Active codes can be combined.</span>
              </div>
              <div style={{display:"flex", gap:8}}>
                <label style={{display:"inline-flex", alignItems:"center", gap:6, font:"400 12.5px/1 var(--th-sans)", color:"var(--th-ink-2)"}}>
                  <input type="checkbox" defaultChecked /> Quick menu
                </label>
                <button className="th-btn--primary">⌖ Code selection</button>
              </div>
            </div>
            <div className="th-card-body" style={{padding:"8px 24px 32px"}}>
              <div className="th-reader">
                {TRANSCRIPT_LINES.map((l, i) => (
                  <div key={i} className="th-reader-row">
                    <div className="th-reader-num">{l.text || l.speaker ? l.n : ""}</div>
                    <div className="th-reader-line">
                      {l.speaker && <span className="speaker">{l.speaker}:</span>}
                      {l.code === "feedback" ? (
                        <span className="th-mark" style={{"--hl":"color-mix(in srgb, var(--th-c-amber) 22%, transparent)"}}>{l.text}</span>
                      ) : l.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <InspectActiveCodes active="access" />
      </div>
    </div>
  );
}

// =================================================================
//  PAGE: REPORT (editorial)
// =================================================================
function PageReport() {
  const codes = [
    { name:"Access barriers",       refs:0, desc:"Moments where people describe friction, cost, or gatekeeping." },
    { name:"Identity work",         refs:0, desc:"How participants explain who they are or how others see them." },
    { name:"Trust and safety",      refs:0, desc:"Signals of comfort, credibility, fear, or institutional trust." },
    { name:"Identifying pain points", refs:0, desc:"The act of pinpointing specific areas of difficulty or dissatisfaction." },
    { name:"User experience issues", refs:0, desc:"Problems or frustrations faced by users interacting with a system." },
    { name:"Process obstacles",     refs:0, desc:"Barriers or hindrances within a specific process." },
    { name:"Application challenges", refs:0, desc:"Difficulties encountered during the application process." },
    { name:"Gathering feedback",    refs:1, desc:"The collection of user opinions and experiences to improve a process." },
    { name:"question",              refs:1, desc:"The categorization of inquiries or questions posed within an interview." },
  ];
  return (
    <div className="th-frame th-root">
      <TopNav active="report" />
      <div className="th-body">
        <RailReportSections />
        <main className="th-center" style={{padding:"32px 32px 80px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24}}>
            <div>
              <div className="th-t7">Detail view</div>
              <div className="th-t2" style={{marginTop:6}}>Report</div>
            </div>
            <div style={{display:"flex", gap:8}}>
              <button className="th-btn--primary">↓ Export PDF</button>
              <button className="th-btn--primary" style={{background:"#0a5a73"}}>↓ Export Word</button>
            </div>
          </div>
          <div className="th-card">
            <div className="th-card-body" style={{padding:"40px 56px 60px"}}>
              <div className="th-report">
                <div className="th-t7">Research report</div>
                <h1>Sample project</h1>
                <div className="th-report-meta">
                  <span>2026-05-01</span><span className="sep">·</span>
                  <span>2 sources</span><span className="sep">·</span>
                  <span>9 codes</span><span className="sep">·</span>
                  <span>1 coded reference</span><span className="sep">·</span>
                  <span>2 cases</span>
                </div>
                <div className="th-report-rule" />
                <h2>Codebook</h2>
                <div className="th-report-codebook">
                  {codes.map((c,i) => (
                    <div key={i} className="th-report-code-item">
                      <div className="th-report-code-row">
                        <span className="th-report-code-name">{c.name}</span>
                        <span className="th-report-code-refs">{c.refs} {c.refs === 1 ? "ref" : "refs"}</span>
                      </div>
                      <div className="th-report-code-desc">{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
        <InspectExportSummary />
      </div>
    </div>
  );
}

// =================================================================
//  PAGE: ORGANIZE
// =================================================================
function PageOrganize() {
  return (
    <div className="th-frame th-root">
      <TopNav active="organize" />
      <div className="th-body">
        <RailSources active="i03" />
        <main className="th-center">
          <div className="th-pageheader">
            <div className="th-t7">Detail view</div>
            <div className="th-t1">Sample project</div>
          </div>
          <div className="th-card">
            <div className="th-card-head">
              <div className="th-card-head-left">
                <span className="th-t7">Source register</span>
                <span className="th-t3">All sources</span>
              </div>
              <button className="th-btn--primary">↑ Import</button>
            </div>
            <div className="th-card-body" style={{padding:0}}>
              <table style={{width:"100%", borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid var(--th-rule)"}}>
                    {["Title","Type","Folder","Case","References","Memo"].map(h => (
                      <th key={h} className="th-t7" style={{textAlign:"left", padding:"10px 20px", fontWeight:600, color:"var(--th-ink-3)"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { t:"Interview 07", type:"Transcript", f:"Internals", c:"Interview 07", r:0, m:"No" },
                    { t:"Interview 03", type:"Transcript", f:"Internals", c:"Interview 03", r:1, m:"No", active:true },
                  ].map((r,i) => (
                    <tr key={i} style={{borderBottom:"1px solid var(--th-rule-soft)", background: r.active ? "var(--th-action-soft)" : "transparent"}}>
                      <td style={{padding:"14px 20px"}}><span className="th-t4">{r.t}</span></td>
                      <td style={{padding:"14px 20px"}}><span className="th-t6" style={{color:"var(--th-ink-3)"}}>{r.type}</span></td>
                      <td style={{padding:"14px 20px"}}><span className="th-t6" style={{color:"var(--th-ink-3)"}}>{r.f}</span></td>
                      <td style={{padding:"14px 20px"}}><span className="th-t6" style={{color:"var(--th-ink-3)"}}>{r.c}</span></td>
                      <td style={{padding:"14px 20px"}}><span className="th-t8">{r.r}</span></td>
                      <td style={{padding:"14px 20px"}}><span className="th-t6" style={{color:"var(--th-ink-3)"}}>{r.m}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
        <InspectSourceProperties />
      </div>
    </div>
  );
}

// =================================================================
//  PAGE: ANALYZE
// =================================================================
function PageAnalyze() {
  return (
    <div className="th-frame th-root">
      <TopNav active="analyze" />
      <div className="th-body">
        <RailQuestions active="co" />
        <main className="th-center">
          <div className="th-pageheader">
            <div className="th-t7">Detail view</div>
            <div className="th-t2">Analyze</div>
            <div className="th-t6 th-pageheader-meta">
              <span>Code co-occurrence pairs across all coded excerpts</span>
              <span className="dot" /><span style={{fontFamily:"var(--th-mono)"}}>1 pair</span>
            </div>
          </div>
          <div style={{display:"flex", gap:2, marginBottom:18, borderBottom:"1px solid var(--th-rule)"}}>
            {[
              { id:"qr", l:"Query results" },
              { id:"mc", l:"Matrix coding" },
              { id:"wf", l:"Word frequency" },
              { id:"co", l:"Co-occurrence", a:true },
              { id:"ct", l:"Crosstabs" },
            ].map(t => (
              <button key={t.id} style={{
                padding:"10px 14px", border:0, background:"transparent",
                font: t.a ? "600 13px/1 var(--th-sans)" : "500 13px/1 var(--th-sans)",
                color: t.a ? "var(--th-ink)" : "var(--th-ink-3)",
                borderBottom: t.a ? "2px solid var(--th-action)" : "2px solid transparent",
                marginBottom:-1, cursor:"pointer",
              }}>{t.l}</button>
            ))}
          </div>
          <div className="th-card">
            <div className="th-card-body">
              <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:18}}>
                <label style={{display:"grid", gap:4}}><span className="th-t7">Text</span><input className="th-input" placeholder="Search excerpt text…" /></label>
                <label style={{display:"grid", gap:4}}><span className="th-t7">Code</span><input className="th-input" defaultValue="Any code" /></label>
                <label style={{display:"grid", gap:4}}><span className="th-t7">Case</span><input className="th-input" defaultValue="Any case" /></label>
                <label style={{display:"grid", gap:4}}><span className="th-t7">Attributes</span><span className="th-t6" style={{color:"var(--th-ink-3)", padding:"8px 0"}}>No attribute filters.<br/>+ Add attribute filter</span></label>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderTop:"1px solid var(--th-rule-soft)", borderBottom:"1px solid var(--th-rule-soft)", marginBottom:18}}>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <span className="th-t7">Top codes</span>
                  <input className="th-input" defaultValue="30" style={{width:60, height:28}} />
                  <div style={{display:"flex", gap:2, marginLeft:14}}>
                    {["Heatmap","Network","Table"].map((x,i) => (
                      <button key={x} className="th-tag" style={{background: i===0?"var(--th-ink)":"var(--th-pane)", color:i===0?"var(--th-paper)":"var(--th-ink-2)"}}>{x}</button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex", gap:8}}>
                  <button className="th-btn">↓ PNG</button>
                  <button className="th-btn">↓ CSV</button>
                </div>
              </div>
              <table style={{width:"100%", borderCollapse:"collapse", font:"500 12.5px/1 var(--th-sans)"}}>
                <thead>
                  <tr>
                    <th style={{width:160, padding:8}}></th>
                    <th style={{padding:8, textAlign:"left", color:"var(--th-ink-2)"}}>Gathering feedback</th>
                    <th style={{padding:8, textAlign:"left", color:"var(--th-ink-2)"}}>question</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{padding:8, textAlign:"right", color:"var(--th-ink-2)"}}>Gathering feedback</td><td style={{padding:0}}><div style={{height:32, background:"var(--th-pane)"}}/></td><td style={{padding:0}}><div style={{height:32, background:"var(--th-action)", color:"#fff", display:"grid", placeItems:"center", fontFamily:"var(--th-mono)"}}>1</div></td></tr>
                  <tr><td style={{padding:8, textAlign:"right", color:"var(--th-ink-2)"}}>question</td><td style={{padding:0}}><div style={{height:32, background:"var(--th-action)", color:"#fff", display:"grid", placeItems:"center", fontFamily:"var(--th-mono)"}}>1</div></td><td style={{padding:0}}><div style={{height:32, background:"var(--th-pane)"}}/></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
        <aside className="th-inspect">
          <section className="th-inspect-section">
            <div className="th-inspect-head">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/></svg>
              <div className="th-inspect-head-text">Current question</div>
            </div>
            <div style={{padding:"10px 12px", border:"1px solid var(--th-action)", borderRadius:5, background:"var(--th-action-soft)"}}>
              <span className="th-t5" style={{color:"var(--th-ink)"}}>Code co-occurrence pairs across all coded excerpts.</span>
            </div>
            <dl className="th-props" style={{marginTop:6}}>
              <div><dt>Results</dt><dd>1</dd></div>
              <div><dt>Cases</dt><dd>1</dd></div>
              <div><dt>Codes</dt><dd>2</dd></div>
            </dl>
            <div style={{display:"grid", gap:6, marginTop:8}}>
              <span className="th-t7">Active filters</span>
              <span className="th-t6" style={{color:"var(--th-ink-3)"}}>None. Showing all coded excerpts.</span>
            </div>
            <button className="th-btn" style={{justifyContent:"center", marginTop:8}}>↓ Export pairs CSV</button>
          </section>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { TypeSpec, PageOverview, PageCode, PageReport, PageOrganize, PageAnalyze });
