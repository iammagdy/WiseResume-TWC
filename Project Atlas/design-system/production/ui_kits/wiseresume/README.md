# WiseResume UI Kit

High-fidelity recreation of the WiseResume job-seeker app. Tokens, components, and layout match `WiseResume-TWC/src/components/` — cosmetic-only, no real persistence or routing.

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry — renders the kit. Two screens (Dashboard, Editor) with click-through navigation + AI sheet overlay. |
| `styles.css` | All app-shell styles. Imports `../../colors_and_type.css`. Scopes everything under `.wr-shell`. |
| `Primitives.jsx` | `Icon`, `Button`, `Card`, `Pill`, `ScoreRing`. Inline-SVG Lucide icons. |
| `TopNav.jsx` | Desktop top navigation (Home, Editor, AI Tools, Activity, Portfolio) with credits chip, search, avatar. |
| `Dashboard.jsx` | Dashboard view: hero CTA, quick action chips, resume list, stat tiles, what's-next, daily tip. |
| `Editor.jsx` | Resume editor: section sidebar, experience form with bullet boost, live preview, AI float button. |
| `AISheet.jsx` | "Boost this bullet" AI sheet — prompt chips, thinking state, suggested rewrite, apply/retry. |

## Screens demonstrated

1. **Dashboard** — typical returning-user view with hero CTA, resume cards (with ATS score rings), stats, and What's Next.
2. **Editor** — Experience section with 3 roles (1 expanded, 2 collapsed), bullet boost callouts, live preview panel, sticky header with breadcrumb + ATS ring + Save indicator + ATS Scan / Tailor / Export.
3. **AI Sheet (overlay)** — invoked from the "Ask Wise AI" float button or any "Boost" inline button. Three states: idle → thinking (dot bounce) → done with diff (orig red strike-through → green suggestion).

## How to use these components

The components attach to `window` (Babel scope isolation requires it). To embed in your own page, include the React + Babel scripts, then the kit's JSX files in this order:

```html
<link rel="stylesheet" href="styles.css" />
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="..." crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="..." crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="..." crossorigin></script>
<script type="text/babel" src="Primitives.jsx"></script>
<script type="text/babel" src="TopNav.jsx"></script>
<script type="text/babel" src="Dashboard.jsx"></script>
```

Then in your inline `<script type="text/babel">` you can use `<TopNav>`, `<Dashboard>`, `<Editor>`, `<AISheet>`, `<Icon>`, `<Button>`, `<Card>`, `<Pill>`, `<ScoreRing>` directly.

## Known cosmetic omissions

- **Mobile bottom-tab bar** is not recreated — the codebase has one (`BottomTabBar.tsx`) but desktop top-nav covers the primary surface and the kit's design is intentionally desktop-first.
- **Aurora background** is dropped in favor of flat app-shell colors (app routes don't use aurora in production either).
- **Drag-to-reorder** on experience items is omitted (cosmetic-only kit).
