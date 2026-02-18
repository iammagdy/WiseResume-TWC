
# Version 2.1 + "See It in Action" Landing Section

## What we're doing — two clean, contained changes

### Change 1: Bump version + add v2.1.0 changelog entry (`public/changelog.json`)

The app version is **dynamically read** from `changelog.json[0].version` in `SettingsPage.tsx` (line 172) and by `BugReportDialog.tsx` + `FeatureRequestDialog.tsx`. There is no separate version constant — the JSON is the single source of truth.

The plan:
- Add a new entry at the **top** of the array as the first element, marked `"latest": true`
- Change the existing `v2.0.0` entry's `"latest": true` to `"latest": false` (only one entry should carry the badge)
- New entry version: `"v2.1.0"`, date: `"2026-02-18"`
- 6 items covering: Public Portfolio Website launch, premium hero + themes redesign, Case Studies + Services sections, resume ↔ portfolio sync mode, AI portfolio content helpers, and URL branding fix

### Change 2: "See It in Action" two-card landing section in `src/pages/Index.tsx`

**Current problem:** The `<EditorDemo>` component already internally renders its own "See It in Action" title + phone mock. The landing page just drops `<EditorDemo />` as a section. This makes it impossible to add a sibling Portfolio card next to it at the same layout level.

**Solution:**
1. Remove the `h2` and `p` title/subtitle from inside `EditorDemo.tsx` — the phone frame animation stays, just strip the header text out (it becomes a pure visual widget)
2. In `Index.tsx`, replace the `<EditorDemo>` section with a new **"See It in Action" section** that contains:
   - A shared section header: "See It in Action" + subtitle
   - Two cards side by side on desktop, stacked on mobile:
     - **Card A — AI Resume Editor**: wraps the existing `<EditorDemo />` phone frame, card title "AI-Enhanced Editor", 1-line desc, "Try the AI Editor →" CTA
     - **Card B — Public Portfolio**: a new lightweight animated mock showing a portfolio hero assembling (avatar circle + name bar + role badge + 3 section rows fading in sequentially, then a theme color cycling indicator), card title "Public Portfolio Website", 1-line desc, "Build Your Portfolio →" CTA

**Portfolio card animation design** (pure CSS + framer-motion, no external deps):
- Phone/browser frame (same 260px width style as EditorDemo for visual consistency)
- Inside: avatar circle pulses in → name bar slides in → role badge fades in → 3 section rows slide in sequentially (Experience, Skills, Projects labeled)
- In the corner, 3 small color dots cycle (representing themes: accent, teal, orange) — one highlights at a time on a 2s interval
- The whole sequence loops with a 3s hold then restarts
- Respects `useReducedMotion` — if reduced motion, shows static final state

**Layout:**
```
mobile (< lg):         desktop (≥ lg):
┌──────────────┐       ┌──────────────┐ ┌──────────────┐
│  AI Editor   │       │  AI Editor   │ │  Portfolio   │
│   card       │       │    card      │ │    card      │
├──────────────┤       └──────────────┘ └──────────────┘
│  Portfolio   │
│   card       │
└──────────────┘
```

Each card is wrapped in a `Card` (uses `glass-elevated` from the design system), with consistent padding, rounded corners, and the CTA buttons use the existing `Button` component.

---

## Files Changed

| File | Change |
|---|---|
| `public/changelog.json` | Prepend `v2.1.0` entry (6 items), flip `v2.0.0` `latest` to false |
| `src/components/landing/EditorDemo.tsx` | Remove the internal `h2` + `p` header (lines 108–109) so it becomes a pure phone-frame widget |
| `src/pages/Index.tsx` | Replace the single `<EditorDemo>` section with a new two-card "See It in Action" section; add a new inline `PortfolioDemo` component |

---

## Detailed content for the changelog entry

```json
{
  "version": "v2.1.0",
  "date": "2026-02-18",
  "latest": true,
  "items": [
    {
      "title": "Public Portfolio Website — Now Live",
      "description": "Turn your resume into a beautiful personal website in one click. Share a real link — not just a PDF — with recruiters, clients, or your network."
    },
    {
      "title": "Premium Portfolio Hero + Themes",
      "description": "The public portfolio page has been completely redesigned with a bold hero, animated avatar glow, role pill badge, sticky header on scroll, and curated themes (Minimal, Bold Dark, Glass Pro, Classic Clean)."
    },
    {
      "title": "Case Studies + Services Sections",
      "description": "Add portfolio-only sections — Case Studies (with challenge, outcome, and tech used) and Services (with category, description, and optional pricing) — that live alongside your resume content."
    },
    {
      "title": "Resume ↔ Portfolio Sync Mode",
      "description": "Choose between Auto-sync (portfolio reflects resume changes in real time) or Locked (snapshot your resume content so your portfolio stays fixed while you keep editing)."
    },
    {
      "title": "AI Portfolio Content Helpers",
      "description": "AI can now generate your About section, write a Case Study from a project description (challenge + outcome), and craft availability headlines — all with preview-then-confirm flows so you stay in control."
    },
    {
      "title": "Portfolio URL Branding",
      "description": "Your portfolio link now shows your real custom domain everywhere in the app — no more wiseresume.lovable.app references."
    }
  ]
}
```

---

## PortfolioDemo component (inline in Index.tsx)

The new `PortfolioDemo` component lives inside `Index.tsx` (no new file needed). It uses:
- `useState` for `animStep` (0–5) and `themeIndex` (0–2)
- `useEffect` with timeouts to advance `animStep` through: 0=blank → 1=avatar in → 2=name in → 3=role badge → 4=sections fade → 5=hold → reset
- A separate `useEffect` cycling `themeIndex` every 2s for the theme dot switcher
- `useReducedMotion()` respected: if true, skip directly to `animStep = 5`
- Visual: same phone-frame container style as EditorDemo, but shows a simplified portfolio layout inside:
  - Top: avatar circle + name + role badge
  - Below: 3 compact section rows (labeled "Experience", "Skills", "Projects") with placeholder bars
  - Bottom-right: 3 small color dots (red/teal/orange) cycling highlight

This keeps the animation fully in CSS+Framer+React state — zero additional dependencies.

---

## What is NOT changed

- The public `/p/:username` routes — untouched
- The EditorDemo animation logic — only its header text is removed
- All existing feature cards, chips, hero, and scroll behavior in Index.tsx — additive only
- SettingsPage changelog dialog — reads from the same JSON, will automatically show v2.1.0 as "Latest"
- BugReportDialog + FeatureRequestDialog — will automatically pick up "v2.1.0" from changelog.json[0].version
- Any portfolio editor, DB, or hook code — no changes
