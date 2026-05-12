# Atlas Governance

**Last verified:** 2026-05-12
**Type:** governance
**Sources:**
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/RULES.md`
- `Project Atlas/DEPLOYMENT_GUIDE.md`
- Current Appwrite-native repository state
**Canonical owner:** this file and `Project Atlas/RULES.md`

---

## One Source Of Truth

`Project Atlas/` is the only documentation source of truth for WiseResume, WiseHire, The Wise Cloud, architecture, deployment, AI routing, agent rules, and operational state.

Documentation outside `Project Atlas/` must not be treated as project truth. If useful historical context is found outside the Atlas, move or summarize the durable part into the Atlas, then remove the external document.

The current codebase and live service state still matter: when the Atlas and code disagree, inspect the code and logs, fix the Atlas, and record the correction here or in the relevant Atlas file. Do not preserve stale documentation just because it exists.

---

## Current Platform Truth

- Production architecture is Appwrite-native: Appwrite Auth, Appwrite Databases, Appwrite Storage, and Appwrite Functions.
- The frontend is React 18, TypeScript 5, Vite 6, Tailwind, Radix UI, and shadcn/ui.
- AI calls go through the consolidated Appwrite `ai-gateway` Function.
- Admin DevKit cross-user reads and writes must go through Appwrite admin Functions, especially `admin-devkit-data`; browser SDK calls must not read other users' protected documents.
- Production secrets live in Appwrite Function variables or GitHub Secrets as appropriate. Replit is development only and must not hold production secrets.
- The mobile app is legacy and not migrated to Appwrite; do not touch `mobile/` during web Appwrite cleanup unless the task explicitly targets mobile.
- PDF export is still pending Appwrite rebuild and may return a 503 placeholder.

---

## Agent Rules

- Read `Project Atlas/MASTER_HANDOVER_2026.md`, `Project Atlas/RULES.md`, and this file before making project changes.
- Do not guess routes, functions, collections, providers, deployment paths, or root causes. Inspect the files, logs, and live errors first.
- Preserve working behavior while cleaning or migrating old patterns.
- Explain high-risk changes before implementation.
- Keep communication plain enough for a non-technical owner to make decisions confidently.
- Never copy Kinde, Supabase, or legacy governance claims into new work unless a current Atlas file explicitly says that legacy surface is still active.

---

## Branding And Product Boundaries

Approved names:

- The Wise Cloud: platform umbrella.
- WiseResume: job-seeker career product.
- WiseHire: HR and recruiting product.
- Wise AI: AI capability layer.

Avoid old or external builder branding. If removing branding may break a feature, stop and verify before changing it.

WiseHire and WiseResume share infrastructure but must keep account-type boundaries intact. HR-only routes and actions must not become visible to job-seeker accounts, and job-seeker surfaces must not leak into HR-only workflows.

---

## AI And Security Rules

- AI endpoints must enforce authentication where required, rate limiting, credit or plan checks where applicable, and payload limits.
- `score-resume` remains deterministic and must not become a paid AI call without an explicit Atlas decision.
- BYOK keys and platform provider keys must never be exposed in browser output or logs.
- Provider fallback should use real failure information, not guessed availability.
- Usage dashboards and health panels should show recorded events and provider attribution, not estimates.

---

## Deployment Rules

`Project Atlas/DEPLOYMENT_GUIDE.md` is mandatory before touching workflows, FTP paths, Hostinger deployment, or GitHub Actions deployment logic.

The critical deployment invariant:

- `resume.thewise.cloud` deploys to Hostinger `resume/`.
- `thewise.cloud` landing deploys one file to FTP root using `put`, not a deleting mirror.
- `quran.thewise.cloud` belongs to the separate `iammagdy/wisequran` repo.
- Never run `mirror --delete` against `.` from this repo.

---

## Documentation Rules

For any accepted project change:

- Update the relevant Atlas file under `Project Atlas/`.
- Update `Project Atlas/CHANGELOG.md` with a dated entry.
- If the change affects what the owner experiences or needs to know, add or update a plain-language file under `Project Atlas/04-For You (Plain Language)/`.
- Do not create new docs outside `Project Atlas/`.
- Do not reintroduce `project-governance/`, `docs/`, `Routing AI Providers/`, `wise-templates/*.md`, root Markdown runbooks, or standalone spec Markdown as canonical documentation.

---

## Useful Historical Rules Kept From The Old Governance Folder

The old `project-governance/` folder was removed because it contradicted the Appwrite-native Atlas and still described Kinde/Supabase as current. The durable rules retained here are:

- inspect the real codebase before changing behavior;
- avoid guessing;
- explain high-risk changes clearly;
- preserve working behavior;
- keep product/account boundaries strict;
- document accepted changes;
- never weaken auth, privacy, or deployment safety casually.
