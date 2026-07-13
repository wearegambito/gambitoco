# Gambito — Design System

The design language behind gambito.co. A living reference for anyone building or
editing the site. There's also an interactive version at **`/style-guide/`**
(hidden, `noindex`) that renders these tokens as real swatches and components.

---

## 1. Creative direction

> A sophisticated presence in a **black classy dress** — intimidatingly composed
> at first glance, then warm and human the moment you engage.

- **The gambit.** A gambit is a confident opening move: risk a small piece for a
  decisive advantage. Every decision ladders back to helping founders move from
  **hesitation → action**. Chess language (openings, moves, the board) is a
  seasoning, never the whole meal.
- **Composed, then warm.** Deep, restrained, expensive up top; approachable,
  empathetic and jargon-free once you interact. Never cold, never loud.
- **Motion is the medium.** The beauty comes from movement — a scroll-scrubbed
  cinematic backdrop and physics-led transitions, not decoration.
- **One bold note.** A single coral accent, used like lipstick: sparingly,
  deliberately, only where it earns attention.

---

## 2. Colour

British racing green base · creamy beige ink · one coral accent. Defined as CSS
custom properties in `src/style.css` and `public/content.css` (`:root`).

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#032721` | Primary background (racing green) |
| `--bg-2` | `#063a2f` | Panels, cards, lifted surfaces |
| `--ink` | `#f0e7d4` | Primary text (cream) |
| `--ink-dim` | `#a3a58c` | Secondary text (sage) |
| `--ink-faint` | `#5c6b60` | Faint labels, hairline captions |
| `--ember` | `#fa4d56` | **Coral accent** — sparingly (emphasis, active, hover) |
| `--go` | `#3ecf8e` | Success / availability green — booking calendar dots only |
| `--line` | `rgba(240,231,212,0.12)` | Hairline borders & dividers |

**Rules of thumb**
- Coral is an accent, not a fill. Serif-italic emphasis words, active/today
  states, hover affordances. If a screen has coral in more than a couple of
  places, pull one back.
- Green (`--go`) is scoped to the booking availability UI (dots = open days).
  Not a general brand colour.
- Text on coral/cream buttons is `--bg` (dark on light). Text on dark is `--ink`.

---

## 3. Typography

Loaded from Fontshare. Three families, each with one job.

| Family | Weights | Role |
|---|---|---|
| **Cabinet Grotesk** (`--font-display`) | 500 / 700 / 800 | Display headings, numbers, buttons |
| **Satoshi** (`--font-body`) | 400 / 500 / 700 | Body copy, UI, labels |
| **Gambetta** (`--serif`) | 500 *italic* | Emphasis word inside headlines (the "accent") |

**Scale & usage**
- Display XL (hero H1): Cabinet 800, `clamp(2.6rem, ~7vw, ~5rem)`, line-height ~1, letter-spacing `-0.02em`.
- Display L / H2: Cabinet 800, `clamp(1.7rem, 2.4vw, 2.4rem)`, `-0.01em`.
- Serif emphasis: wrap one word per headline line in `<em>` → renders Gambetta italic, usually coral. **One accent word per line, max.**
- Body large: Satoshi 400, ~1.15–1.2rem, `--ink-dim`.
- Eyebrow / label: Satoshi 500, ~0.78rem, `letter-spacing: 0.24em`, uppercase, coral.
- `em` globally = Gambetta italic — never use `<em>` for generic italics, only the accent.

---

## 4. Layout, spacing & shape

- **Content widths:** prose `820px`, wide/section content `1200px`, full-bleed
  sections cap at `1500px`. Side padding `3rem` desktop / `1.4rem` mobile.
- **Section rhythm:** generous — roughly `6–12rem` vertical between sections.
- **Radius:** cards `16–20px`; pills & buttons `100px`; small chips `10–14px`.
- **Hairlines:** `1px solid var(--line)` for every divider/border.
- **Breakpoints:** `1024px` (tablet), `760px` (mobile), plus `720px` for a few
  content-page grids.

---

## 5. Components

### Buttons
- **Solid:** `background: var(--ink)`, `color: var(--bg)`, weight 700, pill radius. Fills coral on hover (via a `::before` wipe).
- **Ghost:** transparent, `1px` cream border at ~0.25 alpha, cream text. Fills on hover.
- **Magnetic:** hero/CTA solid buttons subtly track the cursor (`data-magnetic`).

### Service cards — the signature "glass"
Sticky-stacking translucent cards (`.s-card`):
```css
background: linear-gradient(160deg, rgba(240,231,212,0.09), rgba(6,58,47,0.28));
backdrop-filter: blur(24px) saturate(150%);
border: 1px solid rgba(240,231,212,0.16);
border-radius: 20px;
box-shadow: inset 0 1px 0 rgba(240,231,212,0.14), 0 24px 60px -24px rgba(0,0,0,0.45);
```
They pin (`position: sticky`) and scale/dim/blur as the next card arrives.

### Translucent chrome (header & footer)
The nav-on-scroll and the footer share one glass recipe — lighter, so the
background video reads through it:
```css
background: rgba(3, 39, 33, 0.6);
backdrop-filter: blur(16px);
border: 1px solid var(--line);   /* border-bottom on nav, border-top on footer */
```

### Work / case-study cards
`1200 / 630` media (matches uploaded thumbnails), transparent background, no
border, `16px` radius, subtle zoom on hover. External links open in a new tab
with a `↗` glass badge. On desktop they sit in a **horizontal scroll rail** that
the section pins and slides as you scroll; on mobile it's a native swipe rail.

### Booking calendar
Month grid, Monday-first. Days with open times get a green (`--go`) dot; today is
marked coral; selected day is coral-filled. Times appear beside the calendar on
desktop, below it on mobile.

### Forms & panels
Inputs on `--bg-2` with `--line` borders, `10px` radius, coral focus ring.
`.panel` = the plain lifted surface (`--bg-2` + hairline) for non-glass cards.

---

## 6. Motion

Powered by **GSAP + ScrollTrigger + Lenis** (smooth scroll). Everything is
scroll-driven, eased, and deliberate.

- **Scrubbed backdrop.** A page-wide video is seeked to scroll position (never
  auto-plays). It must be encoded with a **keyframe every ~4 frames** or seeking
  stutters — the CMS auto-optimises uploads to this (see §8).
- **Scene camera.** The backdrop pans/zooms scene-by-scene on a *single*
  continuous timeline, settling into its resting frame before the contact section.
  (One timeline only — separate scrub tweens on the same props fight each other.)
- **Word-scrub reveals.** Copy lights up word-by-word as it enters view.
- **Line reveals.** Headings rise per line from a clipped mask.
- **The easing.** Primary curve `--ease-out: cubic-bezier(0.19, 1, 0.22, 1)` — a
  quick, confident settle. Prefers-reduced-motion is fully respected.
- **Gotcha:** ScrollTrigger `pin`s add spacer height; Lenis caches its scroll
  limit, so we resync it on every refresh (`ScrollTrigger.addEventListener
  ("refresh", () => lenis.resize())`) or scrolling clamps short of a pinned section.

---

## 7. Voice & tone

- **Say it plainly.** If you wouldn't say it at dinner, don't write it.
- **Short, then sharp.** Lead plain, land pointed ("Launch is move one.").
- **Speak to the founder.** Name the hesitation, then offer the move.
- **Chess, lightly.** Openings, moves, the board — as seasoning.

Current hero: **"Less hesitation. More *conviction.*"**

---

## 8. How the design is wired

- **Stack:** Vite multi-page build. Entries: `index.html` (home), `admin/`,
  `book/`, `style-guide/`. Styles: `src/style.css` (home) and
  `public/content.css` (every other page — same nav/footer look).
- **Content:** Supabase-backed CMS (`/admin/`). The **homepage** live-fetches
  content (`src/cms.js`, `data-cms` attributes) so edits are instant. **Content
  pages** (services, offerings, insights, FAQ) are **statically prerendered** at
  build time (`scripts/prerender.mjs`) for SEO — they update on **Publish**
  (Netlify build hook). Nav labels, page titles, SEO and the background video are
  all CMS-editable.
- **Booking:** own availability + booking system (Supabase, atomic `book_slot`
  RPC, timezone-aware), replacing Calendly.
- **Video optimisation:** CMS video uploads are re-encoded in the browser
  (ffmpeg-wasm) to dense keyframes before upload, so the scrub stays smooth.
- **Hidden pages:** `/admin/` (CMS) and `/style-guide/` — both `noindex`,
  unlinked, and excluded from the sitemap & robots.

---

*Keep this in sync with `src/style.css` / `public/content.css` and the
`/style-guide/` page when tokens change.*
