# Phase 3c — Inspector / Right Rail Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `.properties-view` and its panels to the new aesthetic. Restyle Code mode's Active Codes picker, the memo textarea, the new-code field, and code chips. Other panels inherit the new shell + heading.

**Architecture:** All new rules scoped under `.app-shell[data-shell="new"]` (already active from Phase 3a). One JSX edit (add ref count to Active Codes rows). The rest is CSS.

**Tech Stack:** React + TypeScript + Vite. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-29-inspector-design.md`

---

## File Structure

**Modify:**
- `src/App.tsx` — add ref count `<span>` to each Active Codes row.
- `src/App.css` — append ~150 lines of scoped rules under `.app-shell[data-shell="new"]`.

**Create:** none.

---

## Task 1: Add ref count to Active Codes / Codebook rows

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update the Active Codes row to surface ref count**

Find this block in `src/App.tsx` (around line 3449):

```tsx
<section className="panel" id="codes">
  <div className="panel-heading">
    <Tags size={18} aria-hidden="true" />
    <h2>{activeView === 'code' ? 'Active Codes' : 'Codebook'}</h2>
  </div>
  <div className="code-picker">
    {sortedCodes.map((code) => (
      <button
        key={code.id}
        className={(activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id) ? 'selected' : ''}
        style={{ marginLeft: activeView === 'refine' ? code.depth * 14 : 0 }}
        type="button"
        aria-pressed={activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id}
        onClick={() => {
          if (activeView === 'code') {
            toggleSelectedCode(code.id)
            return
          }
          setActiveCodeId(code.id)
        }}
      >
        <span style={{ background: code.color }} />
        {code.name}
        {code.depth > 0 && activeView === 'refine' && <small>Child</small>}
      </button>
    ))}
  </div>
```

Replace the `sortedCodes.map(...)` body with one that wraps the name in its own `<span>` and adds a ref count:

```tsx
<div className="code-picker">
  {sortedCodes.map((code) => {
    const refCount = excerpts.filter((e) => e.codeIds.includes(code.id)).length
    return (
      <button
        key={code.id}
        className={(activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id) ? 'selected' : ''}
        style={{ marginLeft: activeView === 'refine' ? code.depth * 14 : 0 }}
        type="button"
        aria-pressed={activeView === 'code' ? selectedCodeIds.includes(code.id) : activeCode.id === code.id}
        onClick={() => {
          if (activeView === 'code') {
            toggleSelectedCode(code.id)
            return
          }
          setActiveCodeId(code.id)
        }}
      >
        <span className="code-pick-dot" style={{ background: code.color }} />
        <span className="code-pick-name">{code.name}</span>
        {code.depth > 0 && activeView === 'refine' && <small className="code-pick-child">Child</small>}
        <span className="code-pick-refs fn-mono">{refCount}</span>
      </button>
    )
  })}
</div>
```

Three additions:
- `className="code-pick-dot"` on the existing color dot.
- `className="code-pick-name"` wrapping the name text.
- New `<span className="code-pick-refs fn-mono">{refCount}</span>` rendering the ref count.

The ref count compute is inline. For typical code counts (<200) this is fine. If scaling becomes an issue, lift to a `useMemo` later.

- [ ] **Step 2: Verify**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. 52 tests pass. Active Codes rows now show ref counts (legacy CSS will style them as plain text inline; Task 2's CSS makes them right-aligned and mono).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(inspector): show ref count on Active Codes / Codebook rows"
```

---

## Task 2: Scoped CSS for the inspector

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: Append the new CSS block at the end of `src/App.css`**

```css

/* ============================================================
   Phase 3c — Inspector / Right Rail — scoped under [data-shell="new"]
   Properties-view shell, panel chrome, Active Codes picker rows,
   memo textarea, new-code input, code chips.
   ============================================================ */

/* ----- Properties-view shell --------------------------------------- */
.app-shell[data-shell="new"] .properties-view {
  background: var(--paper);
  color: var(--ink);
  border-left: 1px solid var(--rule);
}

.app-shell[data-shell="new"] .properties-view .panel {
  padding: var(--s-5);
  border-bottom: 1px solid var(--rule-soft);
  background: transparent;
}

.app-shell[data-shell="new"] .properties-view .panel:last-child {
  border-bottom: 0;
}

.app-shell[data-shell="new"] .properties-view .panel-heading {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-3);
  color: var(--ink-3);
}

.app-shell[data-shell="new"] .properties-view .panel-heading svg {
  color: var(--ink-3);
}

.app-shell[data-shell="new"] .properties-view .panel-heading h2 {
  font: var(--t-label);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-2);
  font-size: 11px;
  font-weight: 600;
  margin: 0;
}

/* ----- Active Codes / Codebook picker ------------------------------ */
.app-shell[data-shell="new"] .properties-view .code-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: var(--s-3);
}

.app-shell[data-shell="new"] .properties-view .code-picker button {
  display: grid;
  grid-template-columns: 8px 1fr auto;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-2);
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: var(--t-ui);
  color: var(--ink);
  position: relative;
}

.app-shell[data-shell="new"] .properties-view .code-picker button:hover {
  background: var(--pane-deep);
}

.app-shell[data-shell="new"] .properties-view .code-picker button.selected {
  background: var(--pane);
}

.app-shell[data-shell="new"] .properties-view .code-picker .code-pick-dot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  display: inline-block;
}

.app-shell[data-shell="new"] .properties-view .code-picker .code-pick-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
}

.app-shell[data-shell="new"] .properties-view .code-picker .code-pick-refs {
  color: var(--ink-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.app-shell[data-shell="new"] .properties-view .code-picker .code-pick-child {
  color: var(--ink-4);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.app-shell[data-shell="new"] .properties-view .code-picker button.selected::before {
  content: "✓";
  position: absolute;
  right: var(--s-3);
  color: var(--action);
  font-size: 11px;
}

.app-shell[data-shell="new"] .properties-view .code-picker button.selected .code-pick-refs {
  visibility: hidden;
}

/* ----- New-code field --------------------------------------------- */
.app-shell[data-shell="new"] .properties-view .new-code {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--s-2);
  align-items: center;
  margin-top: var(--s-2);
}

.app-shell[data-shell="new"] .properties-view .new-code input {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--r-2);
  color: var(--ink);
  font: var(--t-ui-sm);
  padding: var(--s-2) var(--s-3);
  height: 32px;
}

.app-shell[data-shell="new"] .properties-view .new-code input:focus {
  outline: none;
  border-color: var(--action);
  box-shadow: 0 0 0 2px var(--action-soft);
}

.app-shell[data-shell="new"] .properties-view .new-code button.icon-button {
  width: 32px;
  height: 32px;
  border-radius: var(--r-2);
  background: var(--action);
  color: var(--action-ink);
  border: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.app-shell[data-shell="new"] .properties-view .new-code button.icon-button:hover {
  box-shadow: var(--shadow-pop);
}

/* ----- Memo textarea ---------------------------------------------- */
.app-shell[data-shell="new"] .properties-view #memo textarea {
  width: 100%;
  min-height: 120px;
  padding: var(--s-3);
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--r-2);
  font: var(--t-ui);
  color: var(--ink);
  resize: vertical;
  box-sizing: border-box;
}

.app-shell[data-shell="new"] .properties-view #memo textarea:focus {
  outline: none;
  border-color: var(--action);
  box-shadow: 0 0 0 2px var(--action-soft);
}

.app-shell[data-shell="new"] .properties-view .memo-link-note {
  margin-top: var(--s-2);
  font: var(--t-meta);
  color: var(--ink-3);
}
```

- [ ] **Step 2: Build to confirm CSS parses**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/App.css
git commit -m "style(inspector): scoped properties-view + panels under [data-shell=new]"
```

---

## Task 3: Manual sanity check + push

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`. Sign in, open a project. Verify:

1. **Code mode**: properties-view shows paper background. "ACTIVE CODES" heading is small uppercase tracked label with Tags icon.
2. Code rows show `[• dot] [name] [N refs]` shape. Hover bumps the row to `--pane-deep`. Click a row → tinted bg + ✓ check accent on the right; ref count hides while selected.
3. Below the picker, the New-code field shows `[input "New code"] [+ button]` shape. Focus on input shows action color border.
4. **Memo panel** below: textarea has paper bg, soft rule border. Focus shows action color border + soft outline.
5. **Refine mode**: Codebook panel shows the same rows; tree indentation preserved; only one row is selected at a time (active code).
6. **Organize mode**: Source Properties panel uses paper bg + new heading style. Field rows keep current internal styling.
7. **Analyze mode**: Query Summary panel — paper bg + new heading. Internals unchanged.
8. **Report mode**: Export Summary panel — paper bg + new heading. Internals unchanged.
9. The whole signed-in app — sidebar (3a) + reader (3b) + inspector (3c) — reads as a single cohesive paper-and-shell surface. No more navy seams in the visible loop.

Stop the dev server (Ctrl-C) when done.

- [ ] **Step 2: Lint + build + tests**

```bash
npm run lint
npm run build
npx vitest run
```

Expected: clean. 52 tests pass.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Smoke-test on prod**

Once Vercel finishes the build, open https://fieldnote-seven.vercel.app and repeat the manual checks against prod.

---

## Self-Review

- **Spec coverage:** properties-view shell → Task 2; panel headings → Task 2; Active Codes picker rows → Task 1 (markup) + Task 2 (CSS); memo textarea → Task 2; new-code field → Task 2; ref counts on rows → Task 1.
- **Placeholders:** none.
- **Type consistency:** new class names (`code-pick-dot`, `code-pick-name`, `code-pick-refs`, `code-pick-child`) match between Task 1 markup and Task 2 CSS. The `.code-picker button.selected::before` pseudo-element doesn't need any markup change. Ref count uses existing `excerpts` and `code.codeIds` shapes.
- **Atomic commits:** Task 1 adds markup that just adds extra spans (legacy CSS doesn't style them; no regression). Task 2 adds rules. Each commit leaves the app working.
