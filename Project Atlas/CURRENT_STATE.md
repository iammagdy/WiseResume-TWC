# WiseResume Current Production State Snapshot

**Last Verified:** 2026-07-21
**Status:** Canonical Verified System Snapshot - GeoJS Browser Lookup Removed
**Repository:** `iammagdy/WiseResume-TWC`  

---

## 1. System Overview

WiseResume is a full-stack, Appwrite-native web application designed for resume building, AI tailoring, cover letter generation, and portfolio publishing.

```txt
[Client Browser]
       │
       ├────► [Vercel Frontend Hosting] (wiseresume.app)
       │
       └────► [Appwrite Cloud Backend]
                  ├── Appwrite Auth (User Management & Sessions)
                  ├── Appwrite Databases (User Data & Portfolios)
                  ├── Appwrite Storage (Resumes & Assets)
                  └── Appwrite Functions
                         ├── ai-gateway (Consolidated AI Provider Proxy)
                         ├── admin-devkit-data (Admin Data Operations)
                         └── admin-email, admin-moderation, etc.
```

---

## 2. Verified System Stack

* **Primary Production Domain:** `wiseresume.app`
* **Frontend Framework:** React, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel (main branch auto-deploys to production; latest verified code-bearing deployment `dpl_EwaBNSHJ2LSF6NiKnMfjnhzPro3n` for commit `d6f0709e`).
* **Backend Database & Storage:** Appwrite Databases and Appwrite Storage.
* **Authentication:** Appwrite Auth exclusively.
* **AI Provider Routing:** All AI calls go through the server-side Appwrite `ai-gateway` function, with DeepSeek-first routing and Groq / OpenRouter / NVIDIA fallback support.
* **Payments & Billing:** Billing features are currently **disabled** or marked **Coming Soon**.
* **WiseHire:** Secondary/deprioritized product module.
* **Owner-Scoped Collections:** `user_preferences`, `jobs`, and `job_applications` use Appwrite document security with collection-level `create("users")` and owner-only document read/update/delete permissions.
* **Realtime CSP:** The active frontend CSP allows Appwrite Realtime via `wss://fra.cloud.appwrite.io`.
* **Visitor Country Tracking:** Browser visitor tracking does not call GeoJS or any third-party GeoIP endpoint. Country may be enriched server-side by Appwrite ingestion metadata when available; unknown country is acceptable analytics fallback.

---

## 3. Deployment Policy & Rules

1. **Frontend Deployment (Vercel):**
   * Pushes to `main` trigger Vercel deployment workflows for the web application.
   * Do not touch Vercel environment variables or build settings without explicit authorization.

2. **Backend Function Deployment (Appwrite):**
   * Appwrite functions located in `appwrite-hubs/` deploy manually or via dedicated GitHub Action workflows (`deploy-ai-hubs.yml`).
   * Avoid "target-all" deployments. Deploy targeted function directories only when required.

3. **Domain File System Rules:**
   * Never run deleting FTP operations against web root paths. WiseResume frontend deploys to `resume/` or Vercel edge routes.

---

## 4. Design & Refactoring Guidelines

* **Target Visual Standard:** `Project Atlas/` visual reference specs define the production design target.
* **Refactoring Scope:** Controlled frontend visual and UI/UX refactors are encouraged.
* **Strict Prohibition:** Backend rewrites, auth provider replacements, and database schema breaking changes are strictly forbidden unless requested by the project owner.
