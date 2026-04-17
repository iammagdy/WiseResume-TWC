# Project Atlas

A single, navigable, A‑to‑Z reference for the entire Wise Cloud platform — WiseResume + WiseHire.

**Last verified:** 2026-04-17
**Built from sources:**
- `replit.md`
- `README.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `project-governance/CONSTITUTION.md`
- `project-governance/PRODUCT.md`
- `project-governance/ARCHITECTURE.md`
- `project-governance/BRANDING.md`
- `project-governance/DECISIONS.md`
- `project-governance/WORKFLOW.md`
- `Routing AI Providers/` (entire folder)
- `specs/001-wisehire-hr-platform/`
- `specs/002-wise-ai-agent-evolution/`
- `docs/ai_features_design.md`
- `docs/issues/`
- `supabase/functions/EDGE_FUNCTION_AUDIT.md`
- `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/functions/_shared/authMiddleware.ts`
- `supabase/functions/` (directory listing)
- `supabase/migrations/` (directory listing)
- `src/AppInterior.tsx` (route map)
- `src/integrations/supabase/types.ts` (table list)
- `src/pages/`, `src/components/`

---

## What this folder is

The Atlas exists so that:

1. The non‑technical owner can understand the whole app **without reading code**.
2. A fresh agent in a fresh Replit can pick up the project and know **what is built, what is planned, and what is just an idea** — without guessing.
3. Documentation is **structured**, not scattered. Every claim cites a source file. Every doc has a "last verified" stamp.

The Atlas does **not** replace `project-governance/`, `Routing AI Providers/`, `specs/`, or `docs/`. Those remain the canonical sources. The Atlas is the **index over them** plus the missing per‑page / per‑function / per‑table reference cards.

---

## Source‑of‑truth hierarchy

If anything in the Atlas ever conflicts with a higher‑tier source, **the Atlas is wrong and must be fixed**.

| Tier | Source | Used for |
|---|---|---|
| 1 | The current codebase (`src/`, `supabase/`, `server/`) | Runtime behavior — always wins |
| 2 | `project-governance/` | Constitution, product scope, architecture invariants — **supreme over all other docs** |
| 3 | `specs/`, `Routing AI Providers/`, `docs/` | Committed plans and feature specs |
| 4 | `replit.md`, root `ARCHITECTURE.md`, root `README.md`, `CHANGELOG.md` | Working notes and recent feature history. **Subordinate to `project-governance/`.** When these disagree with governance, governance wins and the working note must be updated. |
| 5 | `Project Atlas/` | Index + reference cards over tiers 1–4 |
| 6 | `legacy-docs/` | Historical context only — never authoritative |

Practical consequence: every Atlas card names a "Canonical owner". That owner is **always** in tier 1, 2, or 3 — never in tier 4 or 5. Any Atlas card that elevates a tier-4 source above governance is a defect and must be fixed.

---

## Navigation

```
Project Atlas/
├── README.md                       ← you are here
├── MAINTENANCE.md                  ← update protocol + the five hard rules
├── _templates/                     ← doc & reference-card templates
│
├── 01-Currently Implemented/       ← what is built and live today
│   ├── README.md                   ← index
│   ├── platform-overview.md        ← one-page product summary
│   ├── critical-systems/           ← 10 deep-dive system docs
│   ├── pages/                      ← reference card per page (~56)
│   ├── edge-functions/             ← reference card per Supabase function (~93)
│   ├── database-tables/            ← reference card per table (~30+)
│   └── frontend-layer/             ← stores, hooks, integration libs
│
├── 02-Planned/                     ← committed-to but not built
│   ├── README.md
│   └── one summary card per plan (links back to source spec)
│
├── 03-Ideas/                       ← discussed/sketched, not committed
│   ├── README.md
│   └── one-line entries with source
│
└── 04-For You (Plain Language)/    ← owner-facing mirror of 01-03
    ├── README.md
    ├── glossary.md
    └── plain-English summaries of each major area
```

---

## Who reads what

| If you are… | Start here |
|---|---|
| The non-technical owner | `04-For You (Plain Language)/README.md` |
| A fresh agent picking up the project | This file → `01-Currently Implemented/platform-overview.md` → critical-systems |
| Looking up one page / function / table | `01-Currently Implemented/pages/`, `…/edge-functions/`, `…/database-tables/` |
| Wondering "is this built or planned?" | If it's not in `01-Currently Implemented/`, check `02-Planned/` then `03-Ideas/` |
| Editing the Atlas | `MAINTENANCE.md` first |

---

## Canonical source links (do not duplicate — link to these)

- Constitution → `project-governance/CONSTITUTION.md`
- Product scope and tier limits → `project-governance/PRODUCT.md`
- Full architecture inventory → `project-governance/ARCHITECTURE.md`
- Branding rules → `project-governance/BRANDING.md`
- Decision log → `project-governance/DECISIONS.md`
- AI routing rollout (entire program) → `Routing AI Providers/README.md`
- WiseHire roadmap (Phases 1–4) → `specs/001-wisehire-hr-platform/spec.md`
- Wise AI agent evolution (Phases 2–3) → `specs/002-wise-ai-agent-evolution/spec.md`
- 8 planned AI features → `docs/ai_features_design.md`
- Edge function call sites → `supabase/functions/EDGE_FUNCTION_AUDIT.md`
- Generated DB types → `src/integrations/supabase/types.ts`
- Route map → `src/AppInterior.tsx`
