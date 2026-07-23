# WiseResume Current Production State Snapshot

**Last Verified:** 2026-07-24
**Status:** Canonical Production Snapshot - Broadcast Delivery Verified; Tailoring Verified Ready; Portfolio LCP Warning Retained
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
* **Frontend hosting:** Vercel. The current production deployment is `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` for documentation-only commit `e7e92aba0261a5e587c766654dc9bf601732072d`; it is `READY` and owns the production aliases. The latest verified code-bearing deployment remains `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` for product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`.
* **Backend:** Appwrite Cloud Databases, Storage, and Serverless Functions.
* **Authentication:** Appwrite Auth exclusively.
* **AI:** Most product AI features route through the server-side `ai-gateway`. The explicitly documented standalone exceptions are `resume-section-ai` and `job-import`; browser code must never call provider APIs directly.
* **AI routing:** Current Tailoring production evidence used DeepSeek `deepseek-chat`. Provider pools and fallback rules are defined server-side; do not infer one universal order for every feature.
* **Payments/billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary and deprioritized.
* **Owner-scoped collections:** `user_preferences`, `jobs`, and `job_applications` use document security, collection-level user create permission, and owner-only document read/update/delete permissions.
* **Realtime CSP:** The active frontend CSP allows `wss://fra.cloud.appwrite.io`.
* **Visitor country:** Browser tracking does not call GeoJS. Server-side enrichment may use Appwrite request metadata; unknown country is acceptable.
* **Workspace Broadcasts:** `broadcasts` is server-only with empty collection permissions. Authenticated clients call the JWT-validated Vercel endpoint `GET /api/broadcasts`; owner-only publish/expire actions run through `admin-devkit-data`.

## 3. Current Product Status

* **Critical functionality smoke sequence:** `CLOSED`; follow-up export, owner-permission, Realtime, GeoJS, Premium Cover Letter, and Tailoring content-integrity work is documented and closed.
* **Performance Phase 1:** Closed. Its retained authenticated Broadcast `active` schema warning was resolved and production verified on 2026-07-24.
* **Performance Phase 2:** Editor startup closed with a retained cold-run warning.
* **Performance Phase 3:** Closed for approved scope, but Public Portfolio cold-mobile LCP remains `5.860 s` median against the `<4.0 s` target.
* **Performance Phase 4 timing/recovery:** Bounded provider timing, async execution, result-only recovery, duplicate prevention, idempotency, and exactly-once charging are production verified.
* **Tailoring current status:** `VERIFIED_READY`. Project identity, chronology, current state, and URLs are now preserved at both gateway and frontend merge boundaries. One controlled production action created child resume `6a62910a0013a37009a3`, retained both source projects and their exact metadata, materially rewrote both descriptions, charged exactly two credits, and survived refresh, direct reopen, and export-preview rendering.
* **Premium Cover Letter:** Generation, save, update, durable persistence, owner permissions, and one two-credit charge are proven. The exact original browser refresh/reopen trace was not retained.
* **Broadcast current status:** `PASS_WITH_WARNINGS`. The HTTP 400 is removed in production, authenticated workspace requests return 200, public standalone routes remain silent, and server-side active/expiry filtering plus dismissal are covered by focused tests. Production contains zero Broadcast records, so no real announcement was mutated for live visibility testing.
* **Performance sequence:** `CLOSED_WITH_PORTFOLIO_LCP_WARNING`; the remaining known performance warning is Public Portfolio cold-mobile LCP.

## 4. Deployment State

* **Current Vercel deployment:** Documentation-only commit `e7e92aba0261a5e587c766654dc9bf601732072d` is live as `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` (`READY`); no product code changed between it and the verified Broadcast build.
* **Frontend code:** Commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42` remains the latest verified code-bearing deployment (`dpl_Hvot534UMdVDKrLwtDNuQHpiMigr`, `READY`).
* **Appwrite target:** `admin-devkit-data` only.
* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`, run `30051406249`.
* **Active deployment:** `6a629b8351abe36cd0c3`, status `ready`.
* **Source hash:** `21a8df1890e76655c36e403fc8c17813de11db4e22d6b77ecaba8a2539e97e02`.
* **Schema:** `broadcasts` has eight attributes total, zero collection permissions, `documentSecurity: false`, zero documents, and an idempotent post-apply plan of zero.
* **Parity:** Deployed `admin-devkit-data` source matches the repository implementation.

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
* [`qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md`](./qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md)
