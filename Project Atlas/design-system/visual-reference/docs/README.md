# WiseResume / WiseHire — Design System

> A two-brand AI career platform: **WiseResume** for job seekers and **WiseHire** for recruiters, served from the same codebase (`thewise.cloud`).

This folder is a working reference for designing new screens, prototypes, slides and assets that match the live product. Tokens were lifted from `WiseResume-TWC/src/index.css` and `tailwind.config.ts`; logos and favicons were copied from `WiseResume-TWC/LOGO/` and `WiseResume-TWC/public/`.

---

## Index

| File / Folder | What's in it |
|---|---|
| `colors_and_type.css` | All color, type, radius, spacing, shadow + motion tokens as CSS variables. Drop into any HTML mock. |
| `assets/` | Logos, app icons, favicons, email logo. WiseResume + WiseHire. |
| `fonts/` | Font implementation references only; no binary font files. |
| `FONT_SYSTEM.md` | Official font rules, loading strategy, Tailwind mapping, and type scale. |
| `preview/` | Small visual cards that populate the Design System tab (colors, type, components, brand). |
| `ui_kits/wiseresume/` | High-fidelity recreation of the WiseResume job-seeker app — sidebar, dashboard, editor, AI sheets, applications. |
| `ui_kits/wisehire/` | High-fidelity recreation of the WiseHire recruiter console — pipeline, bulk screen, JD writer, brief generator. |
| `SKILL.md` | Agent Skill manifest. Cross-compatible with Claude Code's Skills system. |



## Production design-system layer

This package has been extended from a visual reference kit into a production design-system package. Use these files before implementing changes in the app:

| File | Purpose |
|---|---|
| `DESIGN_SYSTEM.md` | Main production design-system contract and rules. |
| `DESIGN_TOKENS.md` | Token definitions and Tailwind/CSS variable mapping guidance. |
| `COMPONENT_LIBRARY.md` | Core and product-specific component specifications. |
| `PRODUCT_FLOWS.md` | WiseResume and WiseHire flow behavior, states, and UX rules. |
| `MOBILE_RULES.md` | Mobile-first layout, navigation, form, and QA rules. |
| `ACCESSIBILITY.md` | Keyboard, focus, contrast, form, sheet/dialog, and reduced-motion rules. |
| `IMPLEMENTATION_GUIDE.md` | Safe phased rollout plan for Claude Code, Replit, Codex, or developers. |
| `AUDIT_CHECKLIST.md` | Checklist to audit the existing app before coding. |
| `CLAUDE_CODE_PROMPTS.md` | Ready-to-use prompts for audit, planning, token mapping, components, mobile, and accessibility. |

Recommended first step: run an audit using `AUDIT_CHECKLIST.md`, then ask the coding agent to produce a plan using `IMPLEMENTATION_GUIDE.md`. Do not implement the full system in one pass.

---

## Sources used

- **Codebase:** `WiseResume-TWC/` (locally mounted) — full Vite/React/TS/Tailwind/shadcn-UI project, the live product.
  - Tokens: `src/index.css` (lines 130-260), `tailwind.config.ts`
  - WiseResume landing: `src/components/landing/`, `src/pages/Index.tsx`, `src/pages/index-landing.css`
  - WiseHire landing: `src/components/landing/wisehire/`
  - WiseResume app: `src/components/dashboard/`, `src/components/editor/`, `src/components/ui/`, `src/components/layout/AppShell.tsx`, `src/components/layout/DesktopNav.tsx`
  - WiseHire app: `src/components/wisehire/`, `src/pages/wisehire/`
  - Brand: `src/components/brand/AppLogo.tsx`, `src/components/brand/AppIcon.tsx`
- **Logos:** `WiseResume-TWC/LOGO/Light.webp`, `Dark.webp`; `public/favicon.png`, `public/favicon-wisehire.png`, `public/logo-light.png`, `public/logo-dark.png`, `public/email-logo.png`
- **No Figma file was attached.** If you have one, drop it in and I'll recompile this with `get-design-context`.

---

## Product context

WiseResume / WiseHire is operated by **thewise.cloud**. Two distinct surfaces share one React codebase, one auth (Kinde), one Supabase backend, and one design system — but each ships with its own brand color, hero, pricing page, sidebar shell and route prefix.

### WiseResume (job-seeker)
AI career assistant for candidates. Core surfaces:

- **Landing** — `pages/Index.tsx` — Aurora-backed hero, typewriter headline ("Stand out as a [Software Engineer | Designer | …]"), product toggle (WiseResume ↔ WiseHire), feature ticker, scroll-stacked feature sections (Resume Builder → Tailoring → Portfolio → Interview Coach → Tracker), trust section, pricing, footer.
- **Dashboard** — `/dashboard` — hero CTA ("Optimize your resume. Get more interviews."), resume list, ATS-score ring, dashboard stats, what's-next card, onboarding checklist, applications widget.
- **Editor** — `/editor` — section-by-section resume editor (Contact, Summary, Experience, Skills, Education, Projects, etc.), live preview panel, AI floating button, "Tailor", "Boost", "ATS Scan", "Compare", "Career Path", "Gap Filler", "Keyword Highlighter" sheets.
- **AI Studio** — `/ai-studio` — hub for AI tools: cover letter, resignation letter, career assessment, interview coach.
- **Portfolio** — public portfolio site editor + share page.
- **Applications** — kanban-style job tracker.
- **Templates / Examples / Guides / Pricing / Settings**.

### WiseHire (recruiter)
AI hiring console for hiring teams. Routes live under `/wisehire/*`. Core surfaces:

- **Landing** — `/enterprises` — Indigo/Royal-Blue brand, "Hire Smarter. Screen Faster." headline, "Built for the [Hiring Manager | Recruiter | …]" typewriter, waitlist count-up, separate pricing.
- **Dashboard** — `/wisehire/dashboard` — pipeline summary, trial countdown badge.
- **JD Writer** — AI job description generator.
- **Brief Generator** — company-brief builder for clients.
- **Roles & Pipeline** — kanban candidate pipeline.
- **Bulk Screen** — drag-many-CVs-at-once screening with scorecards.
- **Scorecard Templates** — interview scorecard builder + public scorecard share view.
- **CV Masking** — anonymize candidate CVs.
- **Talent Pool** — search saved candidates.
- **Clients / Analytics / Settings / Subscription**.

The product toggle on the landing route (WiseResume ↔ WiseHire) is a single thread; each side keeps its own palette, sidebar, header and CTA flow once you're in the app.

---

## CONTENT FUNDAMENTALS

Voice is **direct, confident, and outcome-oriented**. The product is an AI assistant; it sounds like a sharp colleague who already knows your goal and tells you the next move — not a chatbot.

### Tone & POV

- **Address the user with imperatives or "your".** "Stand out as a Software Engineer." "Optimize your resume." "Get more interviews." Rarely "we"; never "our system" — the AI is implicit.
- **"AI" is a verb, not a feature.** "AI that builds, tailors, and lands your next job." "AI rewrites vague bullets into quantified achievements." Lead with what it *does*, not that it's powered by it.
- **WiseHire mirrors the tone but pivots to the buyer:** "Hire Smarter. Screen Faster." "Built for the Hiring Manager." "AI that screens candidates, writes job descriptions, and surfaces your best hires — in minutes, not hours."

### Casing

- **Sentence case** for body, paragraphs, tooltips, helper text, descriptions.
- **Title Case for buttons & primary CTAs:** "Get Started Free", "Build a Resume", "Optimize for a Job", "Join the Waitlist", "See it in action".
- **Marketing headlines** are *sentence-cased with intentional periods*: "Optimize your resume." / "Get more interviews." — short clauses, full stops.
- **UPPERCASE eyebrows** with wide letter-spacing (0.12em) above headlines: "AI-POWERED CAREER PLATFORM", "01 — RESUME BUILDER".

### Length & rhythm

- **Hero headline:** 4–8 words across two lines max.
- **Subhead:** one sentence, ≤ 12 words, ending in a verb or noun phrase.
- **Feature bullets:** verb-led, ≤ 14 words. Quantify when possible:
  - "AI rewrites vague bullets into measurable, recruiter-ready results"
  - "Live ATS score that updates with every edit"
  - "Before/after comparison shows exactly what changed"
- **Empty-states & friendly nudges** are conversational, short, and often end in a CTA verb: "No resumes yet — let's create one!", "Loading your latest resume…"

### Trust strip pattern

Three short, capsule-cased benefits with a `CheckCircle2` icon: "Free to start · No credit card · AI-powered". WiseHire uses: "Invite-only access · 7-day free trial · No credit card · 500+ on the waitlist".

### Emoji & special chars

- **No decorative emoji in product UI.** Icons (Lucide) carry semantic weight; emoji do not.
- **Em-dash (—)** is heavily used for rhythm in headlines and bullets. Em-dash, not hyphen-minus.
- **Ellipsis (…)** is the single-character ellipsis, not three dots, in loading toasts.
- **Curly quotes** only in long-form (terms, guides). Editor labels stay straight.

### Examples in the wild

> "Stand out as a Software Engineer." (hero)
> "AI-Powered Career Platform" (eyebrow)
> "Free to start · No credit card · AI-powered" (trust)
> "Build a Resume" / "Optimize for a Job" (dashboard CTAs)
> "Watch AI turn weak bullets into quantified achievements — with a live ATS score that updates as you write."
> "No resumes yet — let's create one!" (empty)
> "Hire Smarter. Screen Faster." (WiseHire hero)
> "Now in early access" (WiseHire pill)

---

## VISUAL FOUNDATIONS

### Color

**WiseResume brand is Crimson Red `#9E1B22` (HSL 357 71% 36%).** It carries: primary buttons, focus rings, eyebrows, active nav, brand pill, logo accent, hero glow. Hover deepens (`/90`), active deepens further (`/80`). The crimson family ranges from `#fff5f5` (light landing bg) to `#9E1B22` core to `#7a1218` (deep press).

**WiseHire brand is Royal Blue `#1D4ED8` with a bright `#3B82F6` companion.** Same role: primary buttons, sidebar active, pipeline accents. WiseHire landing pages adopt a pale-blue body fallback (`#f0f5ff` light, `#060912` dark).

The two brands **never mix in product surfaces** — the active route's brand owns the entire screen. On the landing route they live side-by-side via the product toggle, and the favicon, OG image, brand pill, hero glow and CTA color all swap together.

Surfaces use a **near-neutral, gray-leaning palette** (not warm cream). Light mode: `#ffffff` body, `#f3f4f6` cards. App-shell goes one shade grayer (`#F7F7F8` body, `#EFEFEF` cards) to differentiate from the white landing. Dark mode: `#111114` landing body, `#0C0C0E` app body, `#161618` surface, `#1F1F23` elevated, `#2A2A30` border.

Semantic colors are flat and standard: success `#22c55e`, warning `#f59e0b`, error `#ef4444`, info `#3b82f6` (light) / `#60a5fa` (dark).

### Type

### Font package note

The design system uses **Inter** as the single product UI typeface, but the package does not include binary font files. Use `FONT_SYSTEM.md` and `fonts/` for implementation guidance. Production should load Inter through `@fontsource/inter` or the approved app-level font pipeline; preview files may use Google Fonts for convenience.

**Inter** is the only typeface. 400/500/600/700/800 are all in use. Display, body, mono and UI are all Inter — there is no serif, no display-only face, no monospace exception (kbd uses system mono fallback). Inter is self-hosted in production via `@fontsource/inter` to avoid blocking Google Fonts on FCP; the design system loads it from Google Fonts CDN for convenience.

**Scale is heavy at the top, conventional below.** Hero headlines use `font-extrabold (800)`, `letter-spacing: -0.035em`, `font-size: clamp(1.9rem, 9vw, 5.5rem)`. H1 `700`, H2/H3 `600`, body `400/500`. Eyebrows are `0.8rem`, `600`, `uppercase`, `letter-spacing: 0.12em`. Captions and labels are `0.75rem` to `0.8125rem`, `500`, often `text-muted-foreground`.

### Spacing & layout

Tailwind 4px-grid scale (`0.25rem` steps). App-shell padding uses `px-edge` (`px-3 md:px-4`). Cards: `p-4` to `p-6`. Sections: `py-8` mobile, `py-16` desktop. Container max-width is `1280px` (`xl`) or `1400px` (`2xl`); landing hero is centered with `max-w-4xl` on the headline. Min touch target is `44px` across the board — buttons, nav items, icon buttons all hit the floor.

### Backgrounds

The landing surface is **dark by default with a moving Aurora canvas** behind everything — a fixed full-viewport WebGL layer; section backgrounds default to transparent so it bleeds through. A radial crimson (or blue, on WiseHire) glow sits at the top of the hero (`radial-gradient(ellipse 80% 55% at 50% 0%, var(--lp-hero-glow) 0%, transparent 65%)`). No hand-drawn illustrations, no repeating patterns, no photographic backgrounds anywhere — backgrounds are color, gradient, or canvas.

App-shell screens are flat — no aurora, just `--app-bg` with optional `decorative glow` blobs (`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/6 blur-3xl pointer-events-none`) softly tinting the hero card.

### Animation

Framer Motion everywhere. Easing is consistently a custom **`cubic-bezier(0.16, 1, 0.3, 1)` (ease-out cubic with overshoot)** or a spring `{ type: 'spring', stiffness: 400, damping: 20-22 }`. Durations: 150ms for hover, 220ms for default transitions, 350ms for sheet/dialog in. Hero content stagger: parent `staggerChildren: 0.08`, items `{ opacity: 0, y: 16 } → { opacity: 1, y: 0 }`.

Signature motions:
- **Typewriter cursor** in hero headlines — 3px wide, primary color, 1s blink.
- **Gradient-shimmer** on `.gradient-text` and `.gradient-text-crimson` — 4s ease infinite, 300% background-size, panning gradient.
- **Count-up** on stat numbers (WiseHire waitlist count) — ease-out cubic, 1.4s.
- **Scroll-snap stacked feature cards** on landing.
- **`active:scale-[0.97]`** on every button.
- **CTA pulse** — 2.8s box-shadow ring breathing on primary CTAs.

Reduced motion is honored — `useReducedMotion()` short-circuits animations, replaces typewriter with the final word, kills count-ups.

### Hover, focus, press

- **Hover (primary):** `bg-primary/90`. **Press:** `bg-primary/80`, `active:scale-[0.97]`.
- **Hover (ghost/outline):** `bg-muted`.
- **Hover (cards):** `border-color: hsl(var(--primary) / 0.22); transform: translateY(-3px); background: rgba(255,255,255,0.05)` on dark / `rgba(158,27,34,0.04)` on light.
- **Focus:** `outline-none; ring-2 ring-primary ring-offset-2 ring-offset-background`. Inputs also get `box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1)`.
- **Disabled:** `opacity-50; pointer-events-none`.

### Borders

`1px solid hsl(var(--border))` is the universal divider/border. The border color stays low-contrast (~12-15% delta from surface). Cards always combine **border + soft shadow** — never one without the other. There's no thick decorative border, no double-border, no left-only accent border anywhere in the product.

### Shadow system

Five soft, low-spread tiers from `tailwind.config.ts`:
```
soft-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04)
soft:    0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)
soft-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)
soft-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)
soft-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)
```
Plus brand glows: `glow-primary: 0 4px 14px -2px hsl(var(--primary) / 0.25)` on CTAs, `glow-accent` on amber chips. Inner shadow is rare — only `inset 0 1px 0 hsl(var(--foreground) / 0.05)` on a few elevated icon containers.

### Transparency & blur

Glass surfaces use **opaque cards** (not translucent) in the app; the "glassmorphism" name in the codebase is a legacy of an older system. Headers do still use `backdrop-blur(12px)` with `bg-background/95`. Mobile-drawer scrims use `bg-black/40 backdrop-blur-sm`. **Native app builds disable `backdrop-filter` entirely** for WebView perf — substitute with solid card.

### Corner radii

The system rounds **a lot**.
- `rounded-md` (8px) — kbd, small chips, tooltips
- `rounded-lg` (12px) — most inputs, secondary buttons, list items
- `rounded-xl` (16px) — primary buttons, nav items, sheets, AI cards
- `rounded-2xl` (20px) — cards, hero CTA panels, dashboard tiles
- `rounded-3xl` (24px) — featured / hero panels
- `rounded-full` — chips, badges, pills, avatars

No square corners anywhere. The brand pill (`Now in early access` / `AI-Powered Career Platform`) is always `rounded-full` with a subtle border + glow.

### Card anatomy

```
border: 1px solid hsl(var(--border));
background: hsl(var(--card));
border-radius: 1rem (1.25rem on larger cards);
box-shadow: var(--shadow-soft);
padding: 1rem to 1.5rem;
```
On dark mode the card surface uses `hsl(240 3% 9%)` (app-shell) or `#111118` (landing). Hover lifts via `translateY(-2px to -3px)` with a brand-tinted border.

### Imagery

Brand imagery is the **3D rounded-square app icon** (red doc + ruby spark on WiseResume; purple-blue doc + spark on WiseHire). No photographs in marketing. No illustrations. Iconography (see below) is line-based via Lucide.

### Layout rules

- Sticky `lg:` header `h-14` with backdrop-blur on landing; `h-14` mobile top bar with hamburger.
- Desktop sidebar `w-60` for WiseHire, top-nav `h-14` for WiseResume — same product, different shell intentionally.
- Safe areas honored on iOS (`env(safe-area-inset-top)`, `pb-safe`).
- One column on mobile, 2-column on tablet, 3-4 column grids on desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- Resume editor uses a **right-side live preview panel** on desktop (resizable), full-screen on mobile via sheet.

---

## ICONOGRAPHY

**Lucide React** (`lucide-react` package, MIT) is the single icon library — used everywhere in the codebase. Stroke icons, `1.5px` stroke weight by default, `currentColor` fill, sized via Tailwind classes (`w-4 h-4`, `w-5 h-5`, sometimes `w-3.5 h-3.5` in chips). The CDN version is identical: `https://unpkg.com/lucide@latest`.

Common icons (every one appears in the WiseResume codebase):
- Navigation: `Home`, `FileText`, `Sparkles`, `BarChart3` / `BarChart2`, `Globe`, `Settings`, `Search`, `Menu`, `X`, `ChevronRight`, `ChevronDown`, `ArrowRight`, `ArrowLeft`
- Actions: `Plus`, `Wand2`, `Sparkles`, `RefreshCw`, `Download`, `Share`, `Edit`, `Trash2`, `Save`, `Copy`, `Eye`
- Status: `CheckCircle2`, `Circle`, `AlertCircle`, `Info`, `Lock`, `ShieldCheck`, `Zap`, `Star`
- WiseHire: `Users`, `Building2`, `Briefcase`, `ClipboardList`, `FileSearch`, `TrendingUp`, `Brain`
- Theme: `Sun`, `Moon`
- Auth: `LogOut`, `User`, `CreditCard`

In HTML mocks, **load Lucide from CDN**:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="sparkles" class="w-4 h-4"></i>
<script>lucide.createIcons();</script>
```

**Logos:** the 3D app icon (red for WiseResume, purple for WiseHire) is the brand mark. `assets/wiseresume-logo-light.webp` / `wiseresume-logo-dark.webp` are the high-res versions (512×488). Favicons (`wiseresume-favicon.png`, `wisehire-favicon.png`) are 32×32 reductions. `logo-light.png` / `logo-dark.png` are alternate horizontal lockups (still the icon, sized for email/header).

**No emoji** in product UI. **No Unicode dingbats.** The em-dash (—), bullet (·), middle dot (·), arrow (→) and check (✓) appear occasionally in copy but never replace a proper icon. There is no custom icon font; no SVG sprite sheet; no inline hand-drawn SVG. If Lucide is missing a glyph, fall back to a placeholder — never invent.

---

## Caveats / known substitutions

- **Fonts.** Inter is shipped via Google Fonts CDN here for convenience. Production uses `@fontsource/inter` (self-hosted woff2). If you need pixel-perfect mocks, the substitution is exact — same family, same weights — but render in a real browser, not a PDF/screenshot pipeline.
- **Aurora background.** The landing pages have a WebGL aurora canvas. Mocks in this system use a simpler static radial gradient as a stand-in. Flagged.
- **No Figma file** was provided; everything here is sourced from code. If a Figma library exists, attach the URL and I'll cross-check.

---

## Complete package update

This full package now combines the production documentation layer with the interactive visual preview.

### Start here for AI agents

Use `design.md` as the single-file brief for AI agents such as Stitch, Claude Design, Claude Code, Replit, Codex, v0, or Lovable.

Recommended agent reading order:

1. `design.md`
2. `VISUAL_REFERENCE_GUIDE.md`
3. `DESIGN_SYSTEM.md`
4. `DESIGN_TOKENS.md`
5. `COMPONENT_LIBRARY.md`
6. `PRODUCT_FLOWS.md`
7. `MOBILE_RULES.md`
8. `ACCESSIBILITY.md`
9. `IMPLEMENTATION_GUIDE.md`
10. `AUDIT_CHECKLIST.md`
11. `CLAUDE_CODE_PROMPTS.md`
12. `interactive-preview/WiseResume Design System.html`

### Interactive preview

Open this file in a browser:

```txt
interactive-preview/WiseResume Design System.html
```

Use the preview as the visual reference for colors, typography, spacing, components, dashboard patterns, editor patterns, AI sheet behavior, score rings, and WiseResume/WiseHire brand switching.

### Implementation warning

The interactive preview is not a production app implementation. Do not copy preview code directly into the app without review. Production implementation should follow `DESIGN_TOKENS.md`, `COMPONENT_LIBRARY.md`, `MOBILE_RULES.md`, `ACCESSIBILITY.md`, and `IMPLEMENTATION_GUIDE.md`.
