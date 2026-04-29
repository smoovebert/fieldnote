# Aesthetic Foundations + Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Phase 1 of the new aesthetic (system tokens + typography), extract the auth form into a reusable component, and replace the bare unauthenticated screen with a quiet single-viewport landing page that opens the same auth flow.

**Architecture:** Tokens drop into `src/styles/tokens.css` and load before `App.css`. A new `src/AuthModal.tsx` lifts the existing email/password form out of `App.tsx` (mechanical extraction). A new `src/Landing.tsx` + `src/Landing.css` renders the hero and mounts `AuthModal`. `App.tsx` swaps its `if (!session)` branch from the inline form to `<Landing />`. App shell migration is intentionally not part of this phase.

**Tech Stack:** React + TypeScript + Vite + Supabase Auth.

**Spec:** `docs/superpowers/specs/2026-04-29-aesthetic-foundations-landing-design.md`

**Source bundle (for verbatim asset copy):** `/tmp/fieldnote-design/fieldnote/project/tokens.css`

---

## File Structure

**Create:**
- `src/styles/tokens.css` — copied verbatim from the design bundle (188 lines).
- `src/Landing.tsx` — new presentational landing component, ~80 lines.
- `src/Landing.css` — scoped under `.landing-root`, ~120 lines.
- `src/AuthModal.tsx` — extracted auth form + state, ~90 lines.

**Modify:**
- `index.html` — add Google Fonts preconnect + stylesheet links; set `data-theme="light"` on `<html>`.
- `src/main.tsx` — import `tokens.css` between `index.css` and `App` import.
- `src/App.tsx` — remove inline auth form + auth state declarations + `submitAuth`; render `<Landing />` when `!session`.
- `docs/design-system.md` — prepend a one-paragraph supersession note pointing at the new spec; keep the body for reference.

**Files unchanged this phase:** `src/App.css`, all in-app components, all analyze modules.

---

## Task 1: Foundations — tokens.css, fonts, theme attribute, main.tsx wiring

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `index.html`
- Modify: `src/main.tsx`

- [ ] **Step 1: Copy `tokens.css` from the design bundle**

```bash
mkdir -p src/styles
cp /tmp/fieldnote-design/fieldnote/project/tokens.css src/styles/tokens.css
```

If the bundle path is missing, regenerate from the spec bundle. The file is 188 lines; do not transcribe by hand.

Verify:

```bash
head -3 src/styles/tokens.css
wc -l src/styles/tokens.css
```

Expected: first line is `/* ============================================================`; line count is 188 or 189.

- [ ] **Step 2: Update `index.html` — fonts + theme attribute**

Replace the entire content of `index.html` with:

```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <title>fieldnote</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Wire `tokens.css` into `main.tsx`**

In `src/main.tsx`, after the existing `import './index.css'` line, add:

```ts
import './styles/tokens.css'
```

The full file becomes:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/tokens.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Verify build still works and tokens resolve**

Run:

```bash
npm run build
```

Expected: clean build. Then verify the tokens are reachable:

```bash
grep -c "^  --paper:" src/styles/tokens.css
grep -c "^  --shell:" src/styles/tokens.css
grep -c "Newsreader" src/styles/tokens.css
```

Expected: each grep returns at least `1`.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.tsx src/styles/tokens.css
git commit -m "feat(design): add aesthetic tokens + load Newsreader/Inter Tight/JetBrains Mono"
```

---

## Task 2: Extract `AuthModal` from App.tsx

**Files:**
- Create: `src/AuthModal.tsx`
- Modify: `src/App.tsx` (state declarations and `submitAuth` body get removed/relocated; the inline auth JSX gets removed and replaced by `<AuthModal />` in the next task — but DO NOT yet do that here).

This task only **extracts** — App.tsx will still render the inline auth form temporarily by importing the modal's pieces. We commit a working state where AuthModal exists as a self-contained component but App.tsx still uses its own copy. Task 4 swaps the use site.

Actually that's overly clever — cleaner to extract + swap in one commit. Treat this and Task 4 as one combined commit; this task creates the file, Task 4 wires it in and deletes the inline code, both committed together at the end of Task 4.

- [ ] **Step 1: Create `src/AuthModal.tsx`**

```tsx
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

  // Re-sync the mode whenever the modal opens with a new initialMode.
  useEffect(() => {
    if (open) setAuthMode(initialMode)
  }, [open, initialMode])

  // Esc closes the modal.
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
```

- [ ] **Step 2: Type-check the new file**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: clean (zero errors).

- [ ] **Step 3: Do NOT commit yet**

This task pairs with Task 4. The commit happens at the end of Task 4 once the inline App.tsx code is also removed. If you stop here you'll have an unused file — that's fine temporarily.

---

## Task 3: Build the Landing component

**Files:**
- Create: `src/Landing.tsx`
- Create: `src/Landing.css`

- [ ] **Step 1: Create `src/Landing.css`**

```css
/* Landing — Phase 1 aesthetic foundations
   All rules are scoped under .landing-root so this cannot leak into App.css. */

.landing-root {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "ss01", "cv11", "calt";
  letter-spacing: -0.005em;
  overflow: hidden;
}

.landing-root .landing-header {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-5) var(--s-6);
}

.landing-root .landing-mark {
  width: 32px;
  height: 32px;
  border-radius: var(--r-2);
  background: var(--shell);
  color: var(--shell-ink);
  display: grid;
  place-items: center;
  font-family: var(--font-reader);
  font-weight: 500;
  font-size: 18px;
}

.landing-root .landing-eyebrow {
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.landing-root .landing-hero {
  display: grid;
  align-content: center;
  justify-items: center;
  text-align: center;
  padding: var(--s-7) var(--s-6);
}

.landing-root .landing-hero-inner {
  max-width: 640px;
  display: grid;
  gap: var(--s-5);
}

.landing-root .landing-headline {
  font-family: var(--font-reader);
  font-weight: 500;
  font-size: clamp(34px, 5.5vw, 56px);
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0;
}

.landing-root .landing-deck {
  display: grid;
  gap: var(--s-2);
  font-size: 16px;
  color: var(--ink-2);
  list-style: none;
  padding: 0;
  margin: 0;
}

.landing-root .landing-deck li {
  font-feature-settings: "ss01";
}

.landing-root .landing-cta-row {
  display: grid;
  gap: var(--s-3);
  justify-items: center;
  margin-top: var(--s-3);
}

.landing-root .landing-cta {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-5);
  border-radius: var(--r-3);
  background: var(--action);
  color: var(--action-ink);
  font: var(--t-ui);
  font-weight: 500;
  border: 0;
  cursor: pointer;
  transition: box-shadow 150ms ease;
}

.landing-root .landing-cta:hover {
  box-shadow: var(--shadow-pop);
}

.landing-root .landing-subcta {
  background: none;
  border: 0;
  padding: var(--s-1) var(--s-2);
  color: var(--ink-3);
  font: var(--t-ui-sm);
  cursor: pointer;
}

.landing-root .landing-subcta:hover {
  color: var(--ink);
}

.landing-root .landing-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--s-4) var(--s-6);
  font: var(--t-meta);
  color: var(--ink-3);
  border-top: 1px solid var(--rule);
}

.landing-root .landing-footer a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid transparent;
}

.landing-root .landing-footer a:hover {
  border-bottom-color: var(--ink-3);
}

/* Auth modal overlay — used when AuthModal is mounted on top of the landing. */
.auth-overlay {
  position: fixed;
  inset: 0;
  background: oklch(0 0 0 / 0.45);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: var(--s-5);
}

.auth-overlay .auth-card {
  position: relative;
  background: var(--paper);
  color: var(--ink);
  padding: var(--s-6);
  border-radius: var(--r-4);
  box-shadow: var(--shadow-sheet);
  width: 100%;
  max-width: 380px;
  display: grid;
  gap: var(--s-3);
}

.auth-overlay .auth-close {
  position: absolute;
  top: var(--s-3);
  right: var(--s-3);
  background: none;
  border: 0;
  padding: var(--s-1);
  cursor: pointer;
  color: var(--ink-3);
  border-radius: var(--r-1);
}

.auth-overlay .auth-close:hover {
  color: var(--ink);
  background: var(--pane-deep);
}
```

Note: the auth-overlay rules are **also** in this file (not Landing-scoped) because `AuthModal` mounts at the top of the DOM, not inside `.landing-root`. The other auth-card / auth-field / auth-submit / auth-switch / auth-status rules already exist in `App.css` and continue to apply — we only add the `.auth-overlay` wrapper and the `.auth-close` button styles here.

- [ ] **Step 2: Create `src/Landing.tsx`**

```tsx
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

      <AuthModal open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: clean.

- [ ] **Step 4: Do NOT commit yet**

This task pairs with Task 4. Both files land in the Task 4 commit alongside the App.tsx removals.

---

## Task 4: Wire Landing into App.tsx (atomic commit with Tasks 2 + 3)

**Files:**
- Modify: `src/App.tsx`

This step removes the inline auth form, deletes the auth state that lived in `App`, and renders `<Landing />` when `!session`. AuthModal (Task 2) and Landing (Task 3) are now live.

- [ ] **Step 1: Remove auth state declarations from App.tsx**

Find (around line 726):

```ts
const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [authStatus, setAuthStatus] = useState('Sign in to sync your research workspace.')
```

Delete all four lines. (`AuthModal` owns these now.)

- [ ] **Step 2: Remove the `submitAuth` function**

Find (around line 2098):

```ts
async function submitAuth(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault()

  if (!isSupabaseConfigured) {
    setAuthStatus('Supabase env variables are missing.')
    return
  }

  setAuthStatus(authMode === 'sign-in' ? 'Signing in...' : 'Creating account...')
  const credentials = { email, password }
  const { error } =
    authMode === 'sign-in' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp(credentials)

  if (error) {
    setAuthStatus(error.message)
    return
  }

  setAuthStatus(authMode === 'sign-in' ? 'Signed in.' : 'Account created. Check email confirmation settings if needed.')
}
```

Delete the entire function. (`AuthModal` owns this now.)

- [ ] **Step 3: Replace the inline auth-form branch with `<Landing />`**

Find (around line 2340):

```tsx
  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="brand-block">
            <div className="brand-mark">F</div>
            <div>
              <p className="eyebrow">Qualitative workspace</p>
              <h1>Fieldnote</h1>
            </div>
          </div>

          <div className="auth-copy">
            <h2>{authMode === 'sign-in' ? 'Sign in' : 'Create account'}</h2>
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

          <button className="auth-switch" type="button" onClick={() => setAuthMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'))}>
            {authMode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>

          <p className="auth-status">{isSupabaseConfigured ? authStatus : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.'}</p>
        </section>
      </main>
    )
  }
```

Replace the entire block with:

```tsx
  if (!session) {
    return <Landing />
  }
```

- [ ] **Step 4: Add the Landing import**

In the import block at the top of `src/App.tsx`, add:

```ts
import { Landing } from './Landing'
```

(Place it next to the other local-component imports.)

- [ ] **Step 5: Remove now-unused imports**

`LogIn` and `UserPlus` from `lucide-react` were only used in the deleted auth form. Search to confirm:

```bash
grep -n "LogIn\|UserPlus" src/App.tsx
```

If neither appears outside the import line, remove them from the import. Same for `submitAuth` and the auth state setters — verify they have zero references in App.tsx:

```bash
grep -n "submitAuth\|authStatus\|authMode\|setAuthMode\|setEmail\|setPassword" src/App.tsx
```

Expected: empty output.

- [ ] **Step 6: Build, lint, type-check, run tests**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: all clean. 52 tests pass.

- [ ] **Step 7: Manual sanity check**

```bash
npm run dev
```

Open `http://127.0.0.1:5173/` while signed out. Verify:

1. The landing page renders: dark `F` mark in the top-left, eyebrow "QUALITATIVE WORKSPACE", headline "Quiet qualitative research." in Newsreader, three short bullets, "Sign in →" button, "Create an account" sub-button, footer with the GitHub link.
2. Single viewport — no scroll on a 1024×640 window.
3. Click "Sign in →" → modal opens centered with sign-in mode. Esc closes; clicking outside closes.
4. Click "Create an account" → modal opens with sign-up mode active.
5. Successful sign-in → lands on Project Home (existing behavior).
6. Sign out → returns to landing (not the bare form).

Stop the dev server (Ctrl-C) when done.

- [ ] **Step 8: Commit (Tasks 2 + 3 + 4 together)**

```bash
git add src/AuthModal.tsx src/Landing.tsx src/Landing.css src/App.tsx
git commit -m "feat(landing): single-viewport landing page + extracted AuthModal"
```

---

## Task 5: Supersede the old design-system.md, final verify, push

**Files:**
- Modify: `docs/design-system.md`

- [ ] **Step 1: Prepend a supersession note**

Edit `docs/design-system.md`. At the very top (line 1, before any existing content), insert:

```md
> **Superseded as of 2026-04-29.** The aesthetic direction now lives in
> `docs/superpowers/specs/2026-04-29-aesthetic-foundations-landing-design.md`
> and the design bundle exported from claude.ai/design (Variant A — "Quiet").
> The body of this file is kept for historical reference only and should not
> drive new styling work.

```

(One blank line after the blockquote, then the existing file content.)

- [ ] **Step 2: Run the full suite + build**

```bash
npx vitest run
npm run build
```

Expected: clean. 52 tests pass.

- [ ] **Step 3: Commit and push**

```bash
git add docs/design-system.md
git commit -m "docs: mark Modern QDA System spec superseded by aesthetic foundations"
git push origin main
```

- [ ] **Step 4: Smoke-test on prod**

Once Vercel finishes the build, open https://fieldnote-seven.vercel.app while signed out. Repeat the manual checks from Task 4 step 7 against prod.

---

## Self-Review

- **Spec coverage:**
  - `src/styles/tokens.css` ported verbatim → Task 1.
  - Google Fonts links + `data-theme="light"` → Task 1.
  - `main.tsx` import order → Task 1.
  - `src/AuthModal.tsx` extraction with Esc + click-outside close → Task 2.
  - `src/Landing.tsx` + `src/Landing.css` single-viewport hero → Task 3.
  - App.tsx wiring (`!session` branch swap; auth state + `submitAuth` removed) → Task 4.
  - Supersede `docs/design-system.md` → Task 5.
  - Manual verification → Task 4 step 7 + Task 5 step 4.

- **Placeholders:** none. Every code block is concrete.

- **Type consistency:** `AuthModalProps` (lifted from spec into Task 2 as `Props`), `AuthMode` union, the modal's open/close contract is identical at the AuthModal call site (Task 3) and inside the modal itself (Task 2). No drift.

- **Note on Tasks 2–4 sharing one commit:** Tasks 2 and 3 produce files that compile in isolation but aren't reachable until Task 4 wires them. Committing them with Task 4 keeps every commit on `main` working. The plan makes this explicit at Task 2 step 3 and Task 3 step 4.
