# Aesthetic Foundations + Landing Page — Design

Status: shipped 2026-04-29; refreshed 2026-05-16.

2026-05-16 note: this spec began as the aesthetic-foundations landing plan, but the shipped public homepage is now a fuller product-positioning page. It also now records the first signed-in app polish pass so the homepage and app do not drift apart. Treat the "Current landing implementation" and "Current signed-in app polish" sections below as the current source of truth; the original phase details are kept for provenance.

## Goal

Land Phase 1 of the new "Quiet lab tool" aesthetic direction (system tokens + typography) and ship a minimal landing page that exercises it. Replaces the current unauthenticated experience (a bare auth form) with a quiet, single-viewport landing page whose CTA opens the same auth flow.

The aesthetic source of truth for this and future phases is the design bundle exported from claude.ai/design. Local copies of the relevant assets live at `/tmp/fieldnote-design/fieldnote/project/` during this implementation; the canonical artifacts (`tokens.css`, design rationale) get folded into the project under `src/styles/` and `docs/`.

This phase **supersedes** `docs/design-system.md` (the earlier "Modern QDA System" spec). After this lands, that file is stale; a follow-up commit may delete or update it.

## Non-goals (this phase)

- Migrating the signed-in app shell (`App.tsx` + `App.css`) to the new aesthetic. Defers to a later phase.
- Mode-by-mode UI polish.
- Importing or applying the bundle's `components.css` rules. Those classes describe the in-app shell variants and don't apply to the landing page.
- Dark-mode toggle UI. The dark-theme tokens are loaded with the file but the toggle stays a follow-up.
- Marketing copy refinement, analytics, OG images, SEO.
- Routing changes (no React Router).

## Foundations

### Tokens

A new file `src/styles/tokens.css` is added, ported verbatim from the design bundle's `tokens.css`. It defines, on `:root`:

- Surface scale: `--paper`, `--paper-tint`, `--pane`, `--pane-deep`, `--rule`, `--rule-soft`.
- Ink scale: `--ink`, `--ink-2`, `--ink-3`, `--ink-4`.
- Sidebar (dark) scale: `--shell`, `--shell-deep`, `--shell-rule`, `--shell-ink`, `--shell-ink-2`, `--shell-ink-3`.
- Code-color family (`--c-teal` through `--c-slate`) and matching marker tints (`--hl-teal` through `--hl-moss`) using `color-mix(in oklch, ...)`.
- Single semantic accent: `--action`, `--action-ink`, `--action-soft`.
- Type tokens: `--font-reader` (Newsreader), `--font-ui` (Inter Tight), `--font-mono` (JetBrains Mono); shorthand fonts `--t-meta`/`--t-label`/`--t-ui-sm`/`--t-ui`/`--t-ui-lg`/`--t-title`/`--t-display`/`--t-reader`/`--t-reader-lg`.
- Spacing scale (`--s-1` … `--s-8`), radii (`--r-1` … `--r-4`), shadows (`--shadow-pop`, `--shadow-sheet`).
- Reader column constants (`--reader-measure: 64ch`, padding constants).

Plus a `[data-theme="dark"]` block overriding the surface, ink, shell, action, and highlight scales — present but not active in this phase.

The file also keeps the bundle's small set of shared primitive classes near the top: `.fn-root`, `.fn-label`, `.fn-meta`, `.fn-mono`, `.fn-rule`, `.fn-dot`, `.fn-mark`. These are reused by the landing page.

### Typography

Three Google Fonts are loaded via `<link>` tags in `index.html` exactly as the bundle's prototype does:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### Theme attribute

`<html data-theme="light">` is set declaratively in `index.html`. No JS needed in this phase. The dark theme overrides exist in the tokens file for the eventual toggle.

### Wiring

`src/main.tsx` adds `import './styles/tokens.css'` between the existing `import './index.css'` and `import App from './App.tsx'`. `App.tsx` itself imports `App.css` separately at line 46, so the load order ends up `index.css → tokens.css → App.css`, ensuring token vars resolve first. Most App.css rules use hard-coded hex values, so they continue to render unchanged; new surfaces using the tokens get the new look.

## Current landing implementation

The signed-out experience is a confident product homepage for `fieldnoteqda.com`, not an alpha apology page. It should communicate that Fieldnote is already a serious interview-centered QDA workspace while leaving future capabilities in the Roadmap section.

Visible homepage copy intentionally avoids "alpha" language. Alpha status, tester caution, backup expectations, and legal terms remain in the Terms of Service and Privacy Policy, not in the marketing body copy.

### Current structure

`src/Landing.tsx` and `src/Landing.css` now render a multi-section page:

1. **Top nav** — two-line Fieldnote wordmark, links to Workflow / Features / Roadmap, Sign in.
2. **Hero** — centered serif headline, direct category positioning, primary "Request early access" CTA, secondary sign-in CTA, and an animated Fieldnote UI mock inside a dark product stage.
3. **Source to report** — dark rounded artifact band showing how an excerpt becomes code chips, a matrix snippet, and a report page.
4. **Research loop** — dark rounded band with the six app modes: Organize, Code, Refine, Classify, Analyze, Report.
5. **Why Fieldnote** — light comparison card contrasting old enterprise QDA patterns with Fieldnote's web-native workflow.
6. **What you get** — dark rounded feature band for interview work, comparison work, and evidence export.
7. **Current capabilities** — light editorial ledger of working product areas across close reading, codebook work, comparison, outputs, and safety.
8. **Data safety** — dark rounded trust band that explains account-scoped projects, autosave plus browser recovery snapshots, portable backups/exports, optional AI, no tracking stack, and account/project deletion.
9. **Roadmap** — light section for future tracks: media depth, team research, visual analysis, and research intelligence.
10. **Closing CTA + footer** — dark CTA and footer links to Terms of Service, Privacy Policy, and contact email.

The page alternates light and dark bands after the hero so the lower half has a deliberate rhythm:

```text
light hero
dark source-to-report artifact band
dark research loop
light comparison
dark feature band
light current-capabilities ledger
dark data safety
light roadmap
dark CTA/footer
```

### Current visual behavior

- The hero is white/light, centered, and editorial so the dark product mock has contrast and appears early.
- The product mock demonstrates the real coding story: transcript line numbers, highlighted selection, contextual code menu, active quick-coding controls, and save status.
- The page uses artifact storytelling where possible: transcript excerpt, code chips, matrix/crosstab-like table, and report page preview.
- The mock uses motion, but `prefers-reduced-motion` disables the animation.
- Section color uses the same shell / paper tokens as the app UI, with accent colors pulled from the product palette.
- The feature, source-to-report, research-loop, and trust bands use dark shell backgrounds with rounded section containers and subtle accent tints, not card-heavy SaaS decoration.
- Mobile collapses grids to one column and preserves horizontal overflow safety.

### Current messaging rules

- Do say: interview-centered, close reading, coding, cases, attributes, analysis, AI assist, exportable evidence, data safety, roadmap.
- Tone should feel like a useful human-built research tool, not enterprise SaaS. Prefer plain, specific, slightly lively copy over institutional seriousness.
- Avoid copy that is clever but unclear. The hero should make the product category and workflow legible immediately.
- Do not say in homepage body copy: alpha, free, open source, self-host, GitHub, or "serious enough for alpha."
- Do not literally call the product "indie" in the public hero; that reads too plain and self-descriptive.
- Roadmap belongs on the page so people understand trajectory without mistaking future capabilities for shipped features.
- Safety reassurance belongs on the page because researchers need to trust that their work is recoverable and portable before trying the product.

### Copy review artifact

A local copy deck for review was generated at:

```text
output/doc/fieldnote-copy-deck.docx
output/doc/fieldnote-copy-deck.md
```

`output/` is ignored. Treat these as local review artifacts that should be regenerated when the public homepage or core in-app orientation copy changes.

### Current access model

Public access is intentionally gated for the first tester cohorts:

- Landing CTAs say "Request early access" and open the auth modal in signup mode.
- Sign-in remains available for existing testers.
- Signup runs through the `early-access-signup` Supabase Edge Function, which checks `public.fieldnote_access_invites` before calling Supabase Auth.
- A database trigger on `auth.users` is the hard gate: any new auth user insert without an invited/accepted normalized email raises `fieldnote-access-required`, even if someone bypasses the Fieldnote UI.
- The request-access link is configured by `VITE_FIELDNOTE_ACCESS_FORM_URL`; if missing, it falls back to the contact email.
- Approved testers are added with:

```sql
insert into public.fieldnote_access_invites (email, notes)
values ('researcher@example.edu', 'May 2026 tester cohort');
```

## Current signed-in app polish

The signed-in app should feel like the same product as the landing page, but it remains a working research environment rather than a marketing surface.

### App visual rules

- The global app header uses the dark shell with a thin multicolor accent rail pulled from the product palette.
- The work area stays light. Dark rounded bands are for the public homepage and occasional trust/feature emphasis, not normal working panels.
- Detail-toolbar titles are always serif `T1`, including Classify, Analyze, and Report. The eyebrow above them remains sans `T7`.
- Primary buttons can use the Fieldnote accent gradient sparingly; secondary controls should stay calm and work-like.
- Tables, query results, source rows, and report snapshots should read like research ledgers or artifacts, not generic SaaS cards.
- Analyze filter controls should read as a single working band, not scattered form pieces. The filter gradient spans the full middle work column with internal padding, and `Clear filters` sits in the Attributes control row beside attribute chips/add-filter controls.

### Mode band rules

Every signed-in mode should use the same two-band rhythm below the global detail toolbar:

1. **Mode preface strip** — fixed shared rhythm, currently `--mode-preface-height: 78px`. It spans the full middle work column and contains the mode-specific working controls: active codes, source register controls, Analyze tabs, or the Overview project heading.
2. **Mode orientation band** — also spans the full middle work column. It explains the current pass and uses a two-column copy/points layout.

The content below those bands may be inset, centered, or reader-width depending on the mode. The bands themselves should not jump in width, height, or type treatment when switching modes.

### Implementation touchpoints

- `src/styles/app-new-shell.css` — dark header, shared `--mode-preface-height`, full-width preface strip overrides, shell-level polish.
- `src/styles/app-workspace.css` — shared `ModeOrientation` treatment, data ledger rows, query/analyze surface polish, detail-card orientation breakout.
- `src/styles/app-overview.css` — Overview preface/orientation rhythm plus centered content below.
- `src/styles/app-frame.css` — detail-card padding variable and unified serif `.static-detail-title`.
- `src/analyze/AnalyzeDetail.tsx` — named query-builder slots so Text, Code, AND filters, Case, Attributes, Clear, saved-query name, and Save query align predictably.
- `src/styles/app-components.css` — shared header search/sync styling and Overview safety surface.
- `src/report/ReportPreview.css` — report snapshot artifact styling.

### Open design follow-ups

- Continue app polish mode by mode after this shared-shell cleanup: sidebars, right-rail panels, inspector controls, empty states, and AI surfaces still need the same level of craft.
- Keep testing intermediate desktop widths. The top rail and right rail have been improved, but app polish should continue to check narrow desktop behavior before commit.
- Do not let future copy or visual updates reintroduce a split between "homepage personality" and "app utility." The homepage can be more editorial; the app should be calmer, but it should still feel designed.

## Original landing page plan

### Component layout

A new `src/Landing.tsx` (and `src/Landing.css`) replaces the current unauthenticated branch in `App.tsx`. The page is a single, vertically-centered, single-viewport surface (no scroll on a 1024×640 laptop):

```
[ landing-root ]
  [ landing-header ]                       <- top-left: brand
    [ F mark ]
    [ eyebrow: "QUALITATIVE WORKSPACE" ]
  [ landing-hero ]                         <- centered, max-width ~640px
    [ headline: Newsreader, ~52px ]
      "Quiet qualitative research."
    [ deck: 3 short value bullets, Inter Tight, --ink-2 ]
      • Read sources at length.
      • Code with care.
      • Find patterns later.
    [ cta: primary button ]
      "Sign in →"
    [ subcta: muted text-button ]
      "Create an account"
  [ landing-footer ]                       <- bottom strip
    [ small attribution + GitHub repo link ]
```

(Copy is placeholder — the user will refine in a follow-up. The structure and aesthetic are what we lock in here.)

### Visual rules

- Background: `--paper`.
- Headline: `font-family: var(--font-reader)`, weight 500, size ~52px (use a `clamp()` so it shrinks on narrow viewports), color `--ink`, optical letter-spacing matching the bundle's reader (`-0.005em` from `.fn-root`).
- Deck bullets: Inter Tight, ~16px, `--ink-2`.
- CTA: `--action` background, `--action-ink` text, padding `var(--s-3) var(--s-5)`, radius `var(--r-3)`. Hover: subtle shadow (`--shadow-pop`).
- Sub-CTA: text-only, color `--ink-3`, hover `--ink`.
- Footer: tiny mono caption (`.fn-meta`) with the GitHub link.
- Eyebrow label: `.fn-label` (uppercase, tracked).

### Auth flow

The existing email/password auth form is extracted from `App.tsx` into a new `src/AuthModal.tsx` component (mechanical extraction — no behavioral change). The component takes:

```ts
type AuthModalProps = {
  open: boolean
  initialMode?: 'sign-in' | 'sign-up'
  onClose: () => void
}
```

Internally it owns the existing state (`authMode`, `email`, `password`, `authStatus`, `submitAuth`) and renders the same JSX currently in `App.tsx`'s "no session" branch — wrapped in an overlay `<div className="auth-overlay">` so it composes over the landing page. Esc + click-outside close.

The landing page uses it:

```ts
const [authOpen, setAuthOpen] = useState(false)
const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')

<button onClick={() => { setAuthMode('sign-in'); setAuthOpen(true) }}>Sign in →</button>
<a onClick={() => { setAuthMode('sign-up'); setAuthOpen(true) }}>Create an account</a>
<AuthModal open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
```

`App.tsx` then becomes:

```tsx
if (!session) return <Landing />
```

`Landing` mounts `AuthModal` itself. The signed-in shell is unaffected.

### Scoping rules

`Landing.css` scopes every rule under a `.landing-root` class so it cannot leak into `App.css`. Any class like `.cta` becomes `.landing-root .cta`. Tokens are global by design.

## Architecture

### Files created

- `src/styles/tokens.css` — token system + shared primitive classes.
- `src/Landing.tsx` — the landing component.
- `src/Landing.css` — scoped landing styles.
- `src/AuthModal.tsx` — extracted auth form, used by Landing.

### Files modified

- `index.html` — Google Fonts links, `data-theme="light"` on `<html>`.
- `src/main.tsx` — add `import './styles/tokens.css'` between the existing `index.css` and `App` imports (`App.css` is imported inside `App.tsx`).
- `src/App.tsx` — delete the inline auth-form branch; render `<Landing />` when `!session`.
- `docs/design-system.md` — append a top-of-file note that the file is superseded by `docs/superpowers/specs/2026-04-29-aesthetic-foundations-landing-design.md` and the design bundle in `/tmp/fieldnote-design/`. (Keep the file body for reference; do not delete this round — that's a separate cleanup.)

### Files unchanged this phase

- `src/App.css` — left alone. Migrates in Phase 3.
- All other components (Code mode, Refine, Analyze, etc.) — unchanged.

## Testing

Manual:

1. `npm run dev` signed-out → landing page renders, headline is in Newsreader, CTA is the action color, no scroll on laptop viewport.
2. Click "Sign in →" → auth modal overlay opens with sign-in mode active.
3. Click "Create an account" → modal opens with sign-up mode active.
4. Esc closes the modal; clicking the overlay backdrop closes the modal.
5. Successful sign-in lands on Project Home unchanged.
6. Sign out → returns to landing (not the bare form).
7. Inspect computed styles on the landing — token vars resolve (e.g. `getComputedStyle(document.documentElement).getPropertyValue('--paper')` returns the OKLCH value).
8. Lint + build clean.

No new unit tests required — extraction is mechanical and the new component has no logic beyond presentation + open/close state.

## Out-of-scope follow-ups

- Phase 3: migrate signed-in shell (`App.css` → tokens, sidebar to `--shell`, reader to Newsreader, inspector to right rail with new panel styling).
- Phase 4: per-mode polish.
- Dark-mode toggle UI (placement, persistence in localStorage or Supabase user prefs).
- Real marketing copy + analytics + OG image + SEO meta on the landing.
- `docs/design-system.md` cleanup (delete or replace fully).
- `components.css` import — only useful when Phase 3 migrates the in-app shell.
