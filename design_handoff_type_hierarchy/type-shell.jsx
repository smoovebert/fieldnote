/* global React */

const ICONS = {
  overview: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2.5" width="5" height="5"/><rect x="9" y="2.5" width="5" height="5"/><rect x="2" y="9" width="5" height="4.5"/><rect x="9" y="9" width="5" height="4.5"/></svg>,
  organize: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h5l1.2 1.5H14V13H2z"/></svg>,
  code:     <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 4 2 8l4 4M10 4l4 4-4 4"/></svg>,
  refine:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 4h10M4 8h8M5 12h6"/></svg>,
  classify: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="5" cy="5" r="2.2"/><circle cx="11" cy="5" r="2.2"/><circle cx="5" cy="11" r="2.2"/><circle cx="11" cy="11" r="2.2"/></svg>,
  analyze:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 13V8M6 13V5M10 13V9M14 13V3"/></svg>,
  report:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 2h6l2.5 2.5V14H4z"/><path d="M6 7h5M6 10h5"/></svg>,
  search:   <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4"/><path d="m10 10 3.5 3.5"/></svg>,
  signout:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M9 3H3v10h6M11 5l3 3-3 3M14 8H6"/></svg>,
};

const CODES = [
  { id: "access",      name: "Access barriers",     color: "var(--th-c-rose)",   refs: 0 },
  { id: "application", name: "Application challenges", color: "var(--th-c-cyan)", refs: 0 },
  { id: "feedback",    name: "Gathering feedback",  color: "var(--th-c-amber)",  refs: 1 },
  { id: "pain",        name: "Identifying pain points", color: "var(--th-c-cyan)", refs: 0 },
  { id: "identity",    name: "Identity work",       color: "var(--th-c-indigo)", refs: 0 },
  { id: "process",     name: "Process obstacles",   color: "var(--th-c-rose)",   refs: 0 },
  { id: "question",    name: "question",            color: "var(--th-c-moss)",   refs: 1 },
  { id: "trust",       name: "Trust and safety",    color: "var(--th-c-cyan)",   refs: 0 },
  { id: "ux",          name: "User experience issues", color: "var(--th-c-cyan)", refs: 0 },
];

// ---------- TOP NAV ------------------------------------------
function TopNav({ active = "code" }) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "organize", label: "Organize" },
    { id: "code",     label: "Code" },
    { id: "refine",   label: "Refine" },
    { id: "classify", label: "Classify" },
    { id: "analyze",  label: "Analyze" },
    { id: "report",   label: "Report" },
  ];
  return (
    <header className="th-topnav">
      <div className="th-brand">
        <div>
          <div className="th-brand-eyebrow">Qualitative Workspace</div>
          <div className="th-brand-name">Fieldnote</div>
        </div>
      </div>
      <nav className="th-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`th-tab ${t.id === active ? "is-active" : ""}`}>
            {ICONS[t.id]}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="th-topnav-right">
        <div className="th-search">
          {ICONS.search}
          <span>Search project</span>
          <span className="th-search-shortcut">⌘K</span>
        </div>
        <div className="th-saving">Saving…</div>
        <button className="th-icon-btn">{ICONS.signout}</button>
      </div>
    </header>
  );
}

// ---------- LEFT RAILS (per mode) ----------------------------
function RailSources({ active = "i03" }) {
  return (
    <aside className="th-rail">
      <div className="th-rail-section">
        <div className="th-rail-head">Sources</div>
        <button className="th-rail-item">
          <span className="th-rail-item-icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 11V3h6l2 2v6z"/><path d="M6 7h4M6 9.5h4"/></svg>
          </span>
          <span>Import sources</span>
          <span></span>
        </button>
        <div className="th-rail-sub" style={{marginTop:6}}>
          <button className="th-rail-item">
            <span className="th-rail-item-icon">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 5l1.5-1.5h4l1.5 1.5H14V13H2z"/></svg>
            </span>
            <span>Internals</span>
            <span className="th-rail-item-meta">2</span>
          </button>
          <button className={`th-rail-leaf ${active === "i07" ? "is-active" : ""}`}>
            <span></span>
            <span>Interview 07</span>
            <span className="th-rail-leaf-meta">0</span>
          </button>
          <button className={`th-rail-leaf ${active === "i03" ? "is-active" : ""}`}>
            <span></span>
            <span>Interview 03</span>
            <span className="th-rail-leaf-meta">1</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function RailReportSections() {
  const items = [
    "Project memo", "Codebook", "Coded excerpts (samples per code)",
    "Cases", "Source memos", "Analysis snapshots (annotated)",
  ];
  return (
    <aside className="th-rail">
      <div className="th-rail-section">
        <div className="th-rail-head">Report sections</div>
        <div style={{display:"grid", gap:6}}>
          {items.map((label, i) => (
            <label key={i} style={{display:"grid", gridTemplateColumns:"16px 1fr", gap:10, alignItems:"center", padding:"4px 8px", color:"var(--th-shell-ink-2)", font:"400 12.5px/1.4 var(--th-sans)", cursor:"pointer"}}>
              <input type="checkbox" defaultChecked style={{accentColor:"var(--th-action)", margin:0}} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="th-rail-section">
        <div className="th-rail-head">Raw data</div>
        <div style={{display:"flex", gap:6, marginTop:4}}>
          <button className="th-tag" style={{background:"rgba(255,255,255,0.10)", color:"var(--th-shell-active)"}}>CSV</button>
          <button className="th-tag" style={{background:"transparent", color:"var(--th-shell-ink-3)"}}>XLSX</button>
        </div>
        <div style={{display:"grid", gap:2, marginTop:8}}>
          {["Coded excerpts CSV","Codebook CSV","Case sheet CSV","Coded excerpts by case CSV","Current query CSV","Memos CSV"].map(x => (
            <button key={x} className="th-rail-leaf"><span></span><span>{x}</span><span></span></button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function RailQuestions({ active = "find" }) {
  const groups = [
    { head: "Evidence", items: [
      { id: "find", label: "Find excerpts", sub: "Filter coded excerpts" },
      { id: "q1",   label: "is this?",      sub: "Saved query" },
      { id: "q2",   label: "?",             sub: "Saved query" },
    ]},
    { head: "Compare", items: [
      { id: "by-group", label: "Codes by group", sub: "Codes across cases or attribute values" },
      { id: "by-two",   label: "Codes by two attributes", sub: "Crosstab with row/column percentages" },
    ]},
    { head: "Language", items: [
      { id: "wf", label: "Word frequency", sub: "Terms in filtered excerpts" },
    ]},
    { head: "Relationships", items: [
      { id: "co", label: "Code co-occurrence", sub: "Codes that appear together" },
    ]},
  ];
  return (
    <aside className="th-rail">
      {groups.map((g, i) => (
        <div key={i} className="th-rail-section">
          <div className="th-rail-head">{g.head}</div>
          <div style={{display:"grid", gap:2}}>
            {g.items.map(it => (
              <button key={it.id} className={`th-rail-item ${it.id === active ? "is-active" : ""}`} style={{gridTemplateColumns:"1fr"}}>
                <div style={{display:"grid", gap:2}}>
                  <span style={{font:"500 13px/1.3 var(--th-sans)", color:"inherit"}}>{it.label}</span>
                  <span style={{font:"400 11.5px/1.35 var(--th-sans)", color:"var(--th-shell-ink-3)"}}>{it.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

// ---------- RIGHT INSPECTORS ---------------------------------
function InspectActiveCodes({ active = "access" }) {
  return (
    <aside className="th-inspect">
      <section className="th-inspect-section">
        <div className="th-inspect-head">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>
          <div className="th-inspect-head-text">Active Codes</div>
        </div>
        <div className="th-code-list">
          {CODES.map(c => (
            <button key={c.id} className={`th-code-row ${c.id === active ? "is-active" : ""}`}>
              <span className="th-rail-leaf-dot" style={{background: c.color}} />
              <span className="th-code-row-name">{c.name}</span>
              <span className="th-code-row-refs">{c.refs}</span>
            </button>
          ))}
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 32px", gap:0, border:"1px solid var(--th-rule)", borderRadius:5, overflow:"hidden", marginTop:8}}>
          <input className="th-input" placeholder="New code" style={{border:0, height:30}} />
          <button className="th-btn--primary" style={{border:0, borderRadius:0, height:30, padding:0}}>+</button>
        </div>
      </section>
      <section className="th-inspect-section">
        <div className="th-inspect-head">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3h10v8H6l-3 3z"/></svg>
          <div className="th-inspect-head-text">Interview 03 memo</div>
        </div>
        <textarea className="th-textarea" placeholder="Add notes for interview 03 memo" />
      </section>
      <section className="th-inspect-section">
        <div className="th-inspect-head">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3h10v10H3z"/><path d="M5 6h6M5 9h4"/></svg>
          <div className="th-inspect-head-text">Coded excerpts</div>
          <span className="th-inspect-count">1</span>
        </div>
        <div style={{display:"grid", gap:8, padding:"10px 12px", border:"1px solid var(--th-rule)", borderRadius:6, background:"var(--th-pane)"}}>
          <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
            <span className="th-pill"><span className="dot" style={{background:"var(--th-c-amber)"}} />Gathering feedback</span>
            <span className="th-pill"><span className="dot" style={{background:"var(--th-c-moss)"}} />question</span>
            <span style={{font:"400 11px/1 var(--th-mono)", color:"var(--th-ink-3)", marginLeft:"auto"}}>Interview 03</span>
          </div>
          <p style={{font:"400 13px/1.5 var(--th-serif)", color:"var(--th-ink-2)", margin:0, fontStyle:"italic"}}>
            "Interviewer: Can you tell me what made the application process difficult?"
          </p>
          <div style={{display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"center"}}>
            <input className="th-input" placeholder="Add note" style={{height:28}} />
            <button className="th-btn" style={{height:28, color:"#a83838", borderColor:"var(--th-rule)"}}>Delete</button>
          </div>
        </div>
      </section>
    </aside>
  );
}

function InspectSourceProperties() {
  return (
    <aside className="th-inspect">
      <section className="th-inspect-section">
        <div className="th-inspect-head">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><ellipse cx="8" cy="4" rx="5" ry="2"/><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4"/><path d="M3 8c0 1.1 2.2 2 5 2s5-.9 5-2"/></svg>
          <div className="th-inspect-head-text">Source Properties</div>
        </div>
        <div style={{display:"grid", gap:10}}>
          <label style={{display:"grid", gap:4}}><span className="th-t7" style={{color:"var(--th-ink-3)"}}>Title</span><input className="th-input" defaultValue="Interview 03" /></label>
          <label style={{display:"grid", gap:4}}><span className="th-t7" style={{color:"var(--th-ink-3)"}}>Type</span><input className="th-input" defaultValue="Transcript" /></label>
          <label style={{display:"grid", gap:4}}><span className="th-t7" style={{color:"var(--th-ink-3)"}}>Folder</span><input className="th-input" defaultValue="Internals" /></label>
          <label style={{display:"grid", gap:4}}><span className="th-t7" style={{color:"var(--th-ink-3)"}}>Case</span><input className="th-input" defaultValue="Interview 03" /></label>
        </div>
        <dl className="th-props" style={{marginTop:8}}>
          <div><dt>Words</dt><dd>137</dd></div>
          <div><dt>References</dt><dd>1</dd></div>
          <div><dt>Memo</dt><dd style={{color:"var(--th-ink-3)", fontWeight:400}}>Blank</dd></div>
          <div><dt>Imported</dt><dd style={{color:"var(--th-ink-3)", fontWeight:400}}>Sample</dd></div>
        </dl>
        <div style={{display:"grid", gap:6, marginTop:6}}>
          <button className="th-btn" style={{justifyContent:"center"}}>Create case from source</button>
          <button className="th-btn" style={{justifyContent:"center"}}>Open for coding</button>
          <button className="th-btn" style={{justifyContent:"center"}}>Archive source</button>
          <button className="th-btn" style={{justifyContent:"center", color:"#a83838"}}>Delete source</button>
        </div>
      </section>
    </aside>
  );
}

function InspectExportSummary() {
  return (
    <aside className="th-inspect">
      <section className="th-inspect-section">
        <div className="th-inspect-head">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 3h7l3 3v7H3z"/><path d="M5 7h6M5 9.5h4"/></svg>
          <div className="th-inspect-head-text">Export Summary</div>
        </div>
        <dl className="th-props">
          <div><dt>Project</dt><dd>Sample project</dd></div>
          <div><dt>Sources</dt><dd>2</dd></div>
          <div><dt>Codes</dt><dd>9</dd></div>
          <div><dt>References</dt><dd>1</dd></div>
          <div><dt>Cases</dt><dd>2</dd></div>
          <div><dt>Attributes</dt><dd>2</dd></div>
        </dl>
      </section>
    </aside>
  );
}

Object.assign(window, {
  ICONS, CODES,
  TopNav, RailSources, RailReportSections, RailQuestions,
  InspectActiveCodes, InspectSourceProperties, InspectExportSummary,
});
