# Project Atlas — Master Handbook & AI Operating Manual

**Last Verified:** 2026-07-23
**Status:** Living Master Operating Manual & Primary Entry Point  
**Repository:** `iammagdy/WiseResume-TWC`  
**Production Domain:** `wiseresume.app`  

---

## 1. Executive Summary & Core Identity

WiseResume is a full-stack, Appwrite-native career platform. This handbook is the **primary entry point** for AI agents and human contributors.

All work on this repository must preserve `Project Atlas/` as the single, clean, reliable documentation source of truth.

---

## 2. Verified Current System Architecture

```txt
[Client Browser]
       │
       ├────► [Vercel Edge & SPA Hosting] (wiseresume.app)
       │          ├── React 18 / TypeScript 5 / Vite 6
       │          ├── Tailwind CSS v4 / Radix UI / shadcn/ui
       │          └── TanStack Query & Zustand
       │
       └────► [Appwrite Cloud Backend] (fra.cloud.appwrite.io)
                  ├── Appwrite Auth (User Accounts & Sessions)
                  ├── Appwrite Databases (`main` Database ID)
                  ├── Appwrite Storage (`avatars` & Asset Buckets)
                  └── Appwrite Serverless Functions
                         ├── ai-gateway (Consolidated AI Provider Proxy)
                         ├── admin-devkit-data (Admin Cross-User Operations)
                         └── admin-email, admin-visitor-analytics, etc.
```

* **Production URL:** `https://wiseresume.app`
* **Frontend Hosting:** Vercel
* **Backend:** Appwrite Cloud (Databases, Storage, Serverless Functions)
* **Auth:** Appwrite Auth exclusively
* **AI Architecture:** Most AI interactions route through the server-side Appwrite `ai-gateway`; `resume-section-ai` and `job-import` are documented server-side exceptions
* **Billing / Payments:** Disabled / Coming Soon

---

## 3. Required Reading Order for AI Agents

Before initiating any task, read these documents in order:

1. **[`skills/agent-bootstrap.md`](./skills/agent-bootstrap.md)** — Mandatory AI agent initialization & safety protocol.
2. **[`CURRENT_STATE.md`](./CURRENT_STATE.md)** — Verified production architecture & system snapshot.
3. **[`WHERE_WE_STOPPED.md`](./WHERE_WE_STOPPED.md)** — Active operational handover state, current focus & next tasks.
4. **[`RULES.md`](./RULES.md)** — Strict developer execution rules & definition of done.
5. **[`ATLAS_ROUTING_RULES.md`](./ATLAS_ROUTING_RULES.md)** — Master document routing rules & file placement matrix.
6. **[`SOURCE_OF_TRUTH_MAP.md`](./SOURCE_OF_TRUTH_MAP.md)** — Comprehensive master inventory map.
7. **[`DECISIONS.md`](./DECISIONS.md)** — Master Architectural Decision Records (ADR) log.
8. **[`architecture/overview.md`](./architecture/overview.md)** — Living system architecture overview.

---

## 4. Canonical Architecture & Feature Specifications

### Living Architecture Specs (`Project Atlas/architecture/`)
* **[`overview.md`](./architecture/overview.md)** — High-level architecture overview.
* **[`appwrite-architecture.md`](./architecture/appwrite-architecture.md)** — Core Appwrite backend architecture.
* **[`frontend-architecture.md`](./architecture/frontend-architecture.md)** — React/Vite/Tailwind frontend specs.
* **[`data-model.md`](./architecture/data-model.md)** — Database schema and collections.
* **[`auth-and-permissions.md`](./architecture/auth-and-permissions.md)** — Appwrite Auth & document-level security.
* **[`appwrite-functions.md`](./architecture/appwrite-functions.md)** — Serverless functions specification.
* **[`integrations.md`](./architecture/integrations.md)** — Third-party service integrations.

### Living Feature Specs (`Project Atlas/features/`)
* **[`dashboard.md`](./features/dashboard.md)** — Authenticated user dashboard.
* **[`portfolio.md`](./features/portfolio.md)** — Public & private portfolio publishing & security.
* **[`resume-editor.md`](./features/resume-editor.md)** — Interactive resume builder & PDF preview.
* **[`tailoring-hub.md`](./features/tailoring-hub.md)** — AI resume tailoring & ATS score calculation.
* **[`upload-import.md`](./features/upload-import.md)** — Client-side CV parsing (PDF.js / Mammoth.js).
* **[`preview-export.md`](./features/preview-export.md)** — PDF generation and printing.
* **[`cover-letters.md`](./features/cover-letters.md)** — AI cover letter generator.
* **[`jobs-applications.md`](./features/jobs-applications.md)** - Remote jobs and application tracker.
* **[`notifications.md`](./features/notifications.md)** — In-app notifications & top bar Bell popover.
* **[`devkit-admin.md`](./features/devkit-admin.md)** — Operations & DevKit administration.

---

## 5. Session Logs & Historical Evidence

* **[`MASTER_HANDOVER_2026.md`](./MASTER_HANDOVER_2026.md)** — Preserved chronological session handover log.
* **[`reports/`](./reports/)** — System audits, performance logs, and UX reviews.
* **[`archive/`](./archive/)** — Zero-data-loss repository for stale or superseded documentation.

---

## 6. Forbidden Actions & Hard Constraints

* Do NOT introduce non-Appwrite backends (e.g. Supabase, Kinde). WiseResume is Appwrite-native.
* Do NOT run target-all deploys (`target=all`). Always specify targeted function hubs (e.g. `--only=ai-gateway`).
* Do NOT delete documentation files. Move stale files into `Project Atlas/archive/`.
* Do NOT commit API secrets or credentials.
* Do NOT add browser-to-provider AI calls or new gateway bypasses. The existing `resume-section-ai` and `job-import` exceptions require a separately approved consolidation task.
