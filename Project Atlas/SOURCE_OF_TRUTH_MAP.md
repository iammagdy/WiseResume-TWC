# Atlas Source Of Truth Map

**Last verified:** 2026-05-12
**Type:** index
**Sources:**
- `package.json`
- `src/lib/appwrite.ts`
- `src/lib/appwrite-collections.ts`
- `src/lib/appwrite-bridge.ts`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/DEPLOYMENT_GUIDE.md`
**Canonical owner:** this file

---

This map is the A-to-Z guide for where app truth lives inside `Project Atlas/`. Future agents should start here after opening `Project Atlas/README.md`.

## A. Platform Identity

- Product umbrella: The Wise Cloud.
- Product surfaces: WiseResume for job seekers, WiseHire for HR/recruiting, Wise AI for AI capabilities.
- Repository: `iammagdy/WiseResume-TWC`, default branch `main`.
- Current app version in code: `4.1.5` from `package.json`.

## B. Current Architecture

- Frontend: React 18, TypeScript 5, Vite 6, Tailwind, Radix UI, shadcn/ui.
- Runtime backend for the web app: Appwrite Cloud.
- Appwrite endpoint: `https://fra.cloud.appwrite.io/v1`.
- Appwrite project ID: `69fd362b001eb325a192`.
- Appwrite database ID: `main`.
- Collection inventory: `src/lib/appwrite-collections.ts` currently lists 96 live collections.
- Storage inventory: `src/lib/appwrite-collections.ts` currently lists the `avatars` bucket.
- Express server: small stub/health layer; do not treat it as the main product backend.

## C. AI Truth

- AI routes go through the Appwrite `ai-gateway` Function unless Atlas documents a specific exception.
- The frontend route list for AI/ops function names is in `src/lib/appwrite-bridge.ts`.
- Active AI improvement plans live in:
  - `Project Atlas/02-Planned/ai-routing-rollout.md`
  - `Project Atlas/02-Planned/ai-quality-and-grounding.md`
  - `Project Atlas/02-Planned/tailor-tool-quality-backlog.md`

## D. Admin DevKit Truth

- Cross-user DevKit reads and writes must use server-side Appwrite Functions.
- `admin-devkit-data` is the key admin data Function.
- Browser-side Appwrite database reads must not be used for other users' protected documents.
- Current DevKit state and active queue live in `Project Atlas/MASTER_HANDOVER_2026.md`.

## E. Deployment Truth

- Mandatory deployment guide: `Project Atlas/DEPLOYMENT_GUIDE.md`.
- `resume.thewise.cloud` deploys to Hostinger `resume/`.
- `thewise.cloud` landing uploads one file to FTP root with `put`, not a deleting mirror.
- `quran.thewise.cloud` belongs to the separate `iammagdy/wisequran` repo.
- Never run `mirror --delete` against FTP root `.` from this repo.

## F. Product And Feature Truth

Use `Project Atlas/01-Currently Implemented/` for verified live or partially-live behavior.

Main areas include:

- pages and flows under `01-Currently Implemented/pages/`;
- Appwrite Function cards under `01-Currently Implemented/edge-functions/`;
- collection/table cards under `01-Currently Implemented/database-tables/`;
- frontend structure under `01-Currently Implemented/frontend-layer/`;
- backend and critical systems under the matching folders.

Use `Project Atlas/02-Planned/` only for work that is not fully shipped yet.
Use `Project Atlas/03-Ideas/` only for non-committed ideas.
Use `Project Atlas/04-For You (Plain Language)/` for owner-facing summaries.
Use `Project Atlas/05-Migration to Appwrite/` for migration records and verification notes.

## G. Governance Truth

- Canonical governance: `Project Atlas/GOVERNANCE.md`.
- Short execution rules: `Project Atlas/RULES.md`.
- Maintenance protocol: `Project Atlas/MAINTENANCE.md`.
- Change history: `Project Atlas/CHANGELOG.md`.

## H. How To Resolve Conflicts

1. Check the current code, workflows, Appwrite Function source, or live logs.
2. Update the relevant Atlas file.
3. Record the change in `Project Atlas/CHANGELOG.md`.
4. Delete or ignore any external Markdown that disagrees with Atlas.

## I. What Must Not Return

Do not reintroduce these as canonical docs:

- root `README.md`, `CHANGELOG.md`, or runbooks;
- `project-governance/`;
- `Routing AI Providers/`;
- `wise-templates/`;
- standalone `specs/**/*.md` docs;
- `.agents/skills/**/*.md` as project truth;
- `docs/**/*.md` as project truth.

If a future tool needs templates or specs, they must either live outside this repo or be summarized into the Atlas with a clear non-canonical label.
