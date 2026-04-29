---
name: Modern QDA System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f484a'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f797a'
  outline-variant: '#bfc8c9'
  surface-tint: '#20686f'
  primary: '#004349'
  on-primary: '#ffffff'
  primary-container: '#0d5c63'
  on-primary-container: '#90d2da'
  inverse-primary: '#8fd1d9'
  secondary: '#4355b9'
  on-secondary: '#ffffff'
  secondary-container: '#8596ff'
  on-secondary-container: '#11278e'
  tertiary: '#5c310d'
  on-tertiary: '#ffffff'
  tertiary-container: '#784722'
  on-tertiary-container: '#fcb88a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#abeef6'
  primary-fixed-dim: '#8fd1d9'
  on-primary-fixed: '#002023'
  on-primary-fixed-variant: '#004f55'
  secondary-fixed: '#dee0ff'
  secondary-fixed-dim: '#bac3ff'
  on-secondary-fixed: '#00105c'
  on-secondary-fixed-variant: '#293ca0'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#fcb889'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#693b17'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-main:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  reader-text:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  code-inline:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  sidebar-width: 280px
  inspector-width: 320px
---

> **Superseded as of 2026-04-29.** The aesthetic direction now lives in
> `docs/superpowers/specs/2026-04-29-aesthetic-foundations-landing-design.md`
> and the design bundle exported from claude.ai/design (Variant A — "Quiet").
> The body of this file is kept for historical reference only and should not
> drive new styling work.

## Brand & Style
The design system is engineered for the intellectual rigor of qualitative research. It prioritizes a "Zen-like" focus, transforming complex data density into a structured, navigable landscape. The brand personality is scholarly yet technologically advanced—think of it as a digital laboratory where the software recedes to let the researcher's insights take center stage.

The design style is **Minimalism** with a heavy influence from **Modern Corporate** systems. It utilizes ample whitespace to separate distinct data streams and a strict hierarchy to manage cognitive load. The aesthetic is "quiet" by design, avoiding unnecessary ornamentation to prevent researcher fatigue during multi-hour analysis sessions.

## Colors
The palette is rooted in a neutral foundation of "Paper White" and "Stone Grey" to mimic a clean workspace.
- **Primary (Deep Teal):** Reserved for primary actions, success states, and foundational "coding" categories. It represents stability and depth.
- **Secondary (Indigo):** Used for interactive highlights, selection states, and secondary data links.
- **Functional Neutrals:** A range of cool greys handles the UI scaffolding, ensuring that the interface borders are perceptible but do not distract from the content.
- **Semantic Usage:** Use light tint variations (light teal/indigo) for background highlights in long-form text to indicate "coded" segments without obscuring legibility.

## Typography
This design system employs a dual-font strategy to differentiate between "navigating" and "interpreting."
- **Manrope:** The workhorse for the UI. Its geometric yet friendly terminals provide excellent legibility at small scales in sidebars and data grids.
- **Newsreader:** Utilized exclusively for the source text (interviews, documents, field notes). The serif structure aids in long-form reading, reducing eye strain and signaling a shift into "deep analysis" mode.
- **Inter:** Used for high-density labels and metadata tags where maximum character clarity is required in confined spaces.

## Layout & Spacing
The layout follows a **Fluid Grid** model with fixed utility panels.
- **Three-Pane Architecture:** A standard view consists of a collapsible navigation sidebar (left), the fluid source document reader (center), and an inspector/coding panel (right).
- **Rhythm:** An 8px base grid governs all components, but 4px increments are permitted for tight data-table density.
- **Margins:** Large 40px margins are used in the central reader to prevent text lines from becoming too long, maintaining an optimal 65-75 characters per line for the Newsreader font.

## Elevation & Depth
To maintain a clean and flat aesthetic, this design system avoids heavy drop shadows.
- **Tonal Layering:** Depth is primarily conveyed through subtle background color shifts. The main canvas is the lightest (`#FFFFFF`), while sidebars use a soft grey (`#F8F9FA`).
- **Low-Contrast Outlines:** Instead of shadows, use 1px solid borders in `#E1E3E6` to define containers.
- **Active Elevation:** Only use a very soft, diffused shadow (10% opacity, 12px blur) for floating elements like context menus or modal dialogues to suggest they are temporarily "above" the research data.

## Shapes
The shape language is **Soft**. A 0.25rem (4px) corner radius is the standard for most UI components (buttons, input fields, cards). This creates a modern, approachable feel without looking overly "bubbly" or consumer-grade. Larger containers like modals or main content areas may use 8px (rounded-lg) to subtly frame the data.

## Components
- **Buttons:** Primary buttons use the Deep Teal fill with white text. Secondary buttons use a Teal outline with no fill. All buttons feature a 150ms transition on hover.
- **Coding Chips:** Used for tagging text. Chips should have a light tinted background (Teal or Indigo) with high-contrast dark text. They include a "remove" icon that appears only on hover to reduce visual noise.
- **Source Reader:** The central component. It must support text selection highlights. Highlights use a 20% opacity of the Indigo or Teal color to ensure the Newsreader serif font remains perfectly legible underneath.
- **Data Tables:** Border-less design. Use subtle zebra-striping only on hover to help the eye track across long rows of metadata.
- **Input Fields:** Minimalist style—only a bottom border in the default state, moving to a full teal outline on focus to minimize the "boxiness" of the forms.
- **Collapsible Panels:** Used for "Folders" and "Code Books." Use a chevron icon that rotates 90 degrees; labels should use `label-caps` for clear categorization.

---

## Implementation Notes

These are reconciliations and accessibility considerations identified when adopting the spec. The frontmatter above is the canonical source of tokens; this section captures decisions that aren't expressible in the token block.

- **Border color reconciliation:** The "Elevation & Depth" prose references `#E1E3E6` for 1px container borders. The closest token is `outline-variant: #bfc8c9` (more visible) or `surface-container-highest: #e1e3e4` (closer hex match, but it is a *fill* token by intent). **Decision pending** — flag this when starting Phase 3 (primitive components).
- **Coding chip "remove" affordance:** Spec says the remove icon appears only on hover. Hover-only reveals are inaccessible to keyboard and touch users. Implementation must also reveal the icon on `:focus-within` and on touch devices (e.g. via `@media (hover: none)`).
- **Source reader highlights:** 20% opacity Indigo/Teal over Newsreader needs validation against WCAG AA contrast for the underlying body text once implemented.

## Rollout Plan

Phased so each phase is independently shippable and reviewable:

1. **Design tokens** — CSS variables for color / type / spacing / radius driven from this spec's frontmatter.
2. **Typography setup** — Load Manrope, Newsreader, Inter; apply `body-main`, `reader-text`, `label-caps` to the right surfaces.
3. **Primitive components** — Buttons, chips, inputs, collapsible panels.
4. **Layout shell** — Three-pane architecture (sidebar / reader / inspector).
5. **Mode-by-mode polish** — Organize → Code → Refine → Classify → Analyze → Report.

Status: spec saved, no code changes yet.
