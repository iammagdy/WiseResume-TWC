# WiseResume Current Production State Snapshot

**Last Verified:** 2026-07-23
**Status:** Canonical Production Snapshot - Tailoring Content-Integrity Blocker Open
**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `https://wiseresume.app`

---

## 1. System Overview

WiseResume is a full-stack, Appwrite-native application for resume building, AI tailoring, cover letter generation, and portfolio publishing.

```txt
[Client Browser]
  |
  +-- Vercel: React 18 / TypeScript 5 / Vite 6 SPA
  |
  +-- Appwrite Cloud (fra.cloud.appwrite.io)
      +-- Appwrite Auth
      +-- Appwrite Databases (main)
      +-- Appwrite Storage
      +-- Appwrite Functions
          +-- ai-gateway
          +-- resume-section-ai
          +-- job-import
          +-- portfolio, admin, email, and jobs hubs
```

## 2. Current Stack and Architecture

* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui, TanStack Query, and Zustand.
* **Frontend hosting:** Vercel. The latest verified code-bearing production deployment is GitHub deployment `5579487506` for commit `66df7a3978c79a525742a6c07ab2836a4ca0cadf`.
* **Backend:** Appwrite Cloud Databases, Storage, and Serverless Functions.
* **Authentication:** Appwrite Auth exclusively.
* **AI:** Most product AI features route through the server-side `ai-gateway`. The explicitly documented standalone exceptions are `resume-section-ai` and `job-import`; browser code must never call provider APIs directly.
* **AI routing:** Current Tailoring production evidence used DeepSeek `deepseek-chat`. Provider pools and fallback rules are defined server-side; do not infer one universal order for every feature.
* **Payments/billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary and deprioritized.
* **Owner-scoped collections:** `user_preferences`, `jobs`, and `job_applications` use document security, collection-level user create permission, and owner-only document read/update/delete permissions.
* **Realtime CSP:** The active frontend CSP allows `wss://fra.cloud.appwrite.io`.
* **Visitor country:** Browser tracking does not call GeoJS. Server-side enrichment may use Appwrite request metadata; unknown country is acceptable.

## 3. Current Product Status

* **Critical functionality smoke sequence:** `PASS_WITH_WARNINGS`; follow-up export, owner-permission, Realtime, GeoJS, and Premium Cover Letter work is documented and closed.
* **Performance Phase 1:** Closed with the authenticated Broadcast `active` schema warning.
* **Performance Phase 2:** Editor startup closed with a retained cold-run warning.
* **Performance Phase 3:** Closed for approved scope, but Public Portfolio cold-mobile LCP remains `5.860 s` median against the `<4.0 s` target.
* **Performance Phase 4 timing/recovery:** Bounded provider timing, async execution, result-only recovery, duplicate prevention, idempotency, and exactly-once charging are production verified.
* **Tailoring current status:** `PRODUCT_BUG`. A rich production result dropped project start/end dates because those values are omitted from the project context sent to the model. No product fix was made during the verification task.
* **Premium Cover Letter:** Generation, save, update, durable persistence, owner permissions, and one two-credit charge are proven. The exact original browser refresh/reopen trace was not retained.

## 4. Deployment State

* **Frontend code:** Commit `66df7a3978c79a525742a6c07ab2836a4ca0cadf` is the latest verified code-bearing Vercel deployment.
* **Appwrite target:** `ai-gateway` only.
* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`, run `30042810382`.
* **Active deployment:** `6a627b81bff27daaf366`, status `ready`, runtime timeout `180 s`.
* **Source hash:** `244f6be15693770dc1c6129a8e258c4fc956a6ddd04793522edc314ab712adc0`.
* **Parity:** Deployed `ai-gateway` source matches the repository implementation.

## 5. Operational Rules

1. Pushes to `main` may trigger Vercel through Git integration. Do not change Vercel settings or environment variables without explicit authorization.
2. Appwrite functions deploy through `.github/workflows/deploy-appwrite-hubs.yml` or `scripts/deploy_hubs.cjs`.
3. Never use `target=all`; deploy only explicitly approved function targets.
4. Production is Vercel plus Appwrite. Hostinger deployment material is historical unless the owner explicitly assigns a separate legacy-domain task.
5. Do not replace Appwrite Auth/backend architecture, reactivate billing, change AI routing/models/credits, or alter schemas/permissions without a scoped owner-approved task.

## 6. Evidence

* [`WHERE_WE_STOPPED.md`](./WHERE_WE_STOPPED.md)
* [`deployment/current-deployment.md`](./deployment/current-deployment.md)
* [`reports/performance/production-performance-audit-2026-07-22.md`](./reports/performance/production-performance-audit-2026-07-22.md)
* [`reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md`](./reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md)
* [`qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md`](./qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md)
