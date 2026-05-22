# WiseHire UI Kit

High-fidelity recreation of the WiseHire recruiter console. Tokens match `WiseResume-TWC/src/components/wisehire/` and `src/pages/wisehire/`. Cosmetic-only — no real data.

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry. 4 screens connected via the left sidebar nav. |
| `styles.css` | All styles. Imports `../../colors_and_type.css`. Scoped under `.wh-shell`. |
| `Primitives.jsx` | `Icon`, `Button`, `Card`, `Pill`, `ScoreBar`, `Avatar`. |
| `Sidebar.jsx` | `<WHSidebar>` — fixed 232px left nav with brand, trial countdown badge, 11 nav items, user row. |
| `Dashboard.jsx` | `<WHDashboard>` — "Good morning, Jordan" hero, KPI tiles, active roles list, top-scored candidates, recent activity, AI suggestion card. |
| `Pipeline.jsx` | `<Pipeline>` — 4-column kanban (Applied / Screening / Interview / Offer) with candidate cards (avatar, score bar, tags). |
| `BulkScreen.jsx` | `<BulkScreen>` — CV drop zone, AI filter chips, anonymize toggle, ranked candidate rows with match/miss pills. |
| `JDWriter.jsx` | `<JDWriter>` — split layout: form (basics, must-have skills, tone) on the left + AI-drafted JD doc on the right with bias-check card. |

## Screens demonstrated

1. **Dashboard** — recruiter overview: morning greeting, screening shortcut, KPIs, active roles, top scored, AI suggestion ("3 candidates haven't moved in 4+ days").
2. **Pipeline** — kanban board for one role (Senior Frontend Engineer) with 8 candidates across 4 stages. Each card has avatar, name, AI score bar, skill tags.
3. **Bulk Screen** — drop-many-CVs workflow. Score-≥-80 filter, anonymized view toggle, 5 ranked candidates with match/miss breakdown and "Top match" badge on rank #1.
4. **JD Writer** — generative JD authoring. Inputs panel + draft document with section highlights. Bias-check status card. "Regenerate" CTA.

## How to use these components

```html
<link rel="stylesheet" href="styles.css" />
<!-- React + Babel scripts -->
<script type="text/babel" src="Primitives.jsx"></script>
<script type="text/babel" src="Sidebar.jsx"></script>
<script type="text/babel" src="Dashboard.jsx"></script>
<script type="text/babel" src="Pipeline.jsx"></script>
<script type="text/babel" src="BulkScreen.jsx"></script>
<script type="text/babel" src="JDWriter.jsx"></script>
```

Then `<WHSidebar>`, `<WHDashboard>`, `<Pipeline>`, `<BulkScreen>`, `<JDWriter>`, `<Icon>`, `<Button>`, `<Card>`, `<Pill>`, `<ScoreBar>`, `<Avatar>` are globally available.

## Known cosmetic omissions

- **Scorecard Templates, CV Masking, Talent Pool, Clients, Analytics** sub-routes are in the sidebar but the kit's screens only cover Dashboard / JD Writer / Pipeline / Bulk Screen. Clicking those nav items returns to Dashboard. Pattern follows the same shell.
- **Drag-and-drop** on the kanban is omitted — cards are static.
- **Public scorecard share view** (`/wisehire/scorecard/:id`) is omitted.
