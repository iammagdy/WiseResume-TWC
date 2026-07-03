# WiseResume Master Handbook — AI Agent & Developer Operating Manual

**Last Verified:** 2026-07-03  
**Status:** Canonical Living Entry Point  
**Repository:** `iammagdy/WiseResume-TWC`  
**Production Domain:** `wiseresume.app`  

---

## 1. What Is WiseResume?

WiseResume is an AI-powered, Appwrite-native resume builder and career optimization platform. It enables job seekers to create, tailor, analyze, and publish professional resumes, cover letters, and interactive public portfolios.

---

## 2. What Is Project Atlas?

`Project Atlas/` is the **single, reliable, authoritative documentation source of truth** for the entire WiseResume project.

All architecture rules, feature specifications, UI/UX guidelines, deployment procedures, security audit findings, and product decisions live inside `Project Atlas/`. 

* **Living AI Operating Manual:** This file (`MASTER_HANDBOOK.md`) is the required starting point for all developers and AI agents before performing work.
* **Historical Session Log:** `Project Atlas/MASTER_HANDOVER_2026.md` is preserved as a chronological session handover log for past context.

---

## 3. Required Reading Order for AI Agents

Before initiating any task, AI agents must read documents in this order:

1. **`Project Atlas/RULES.md`** — Critical developer rules and architecture constraints.
2. **`Project Atlas/MASTER_HANDBOOK.md`** — This handbook (system overview, task routing).
3. **`Project Atlas/CURRENT_STATE.md`** — Verified production stack snapshot (`wiseresume.app`, Appwrite, Vercel).
4. **Task-Specific Documentation** (see Routing Guide below).

---

## 4. Current Verified Production Truth Summary

| Component | Verified System Truth |
|---|---|
| **Primary Domain** | `wiseresume.app` |
| **Frontend Hosting** | Vercel (frontend assets and serverless routes) |
| **Backend Architecture** | Appwrite-Native (Databases, Storage, Functions) |
| **Authentication** | Appwrite Auth exclusively |
| **AI Architecture** | Appwrite `ai-gateway` function handles all AI calls |
| **Billing / Payments** | Disabled / Coming Soon |
| **Admin Operations** | Server-side Appwrite Functions (`admin-devkit-data`), no direct browser DB calls |

---

## 5. Task Routing Guide

Depending on the task requested, consult the relevant `Project Atlas/` subdirectories:

### 🎨 UI & Design System Tasks
* Read `Project Atlas/design-system/production/` for component libraries and design tokens.
* Refer to `Project Atlas/design-system/visual-reference/` for the exact product visual target.
* Follow Tailwind, Radix UI, and shadcn/ui component standards.

### ⚡ Appwrite & Backend Tasks
* Read `Project Atlas/architecture/backend.md` and `Project Atlas/architecture/appwrite-functions.md`.
* Refer to `appwrite-hubs/` for function source code location pointers.
* Ensure cross-user reads/writes use `admin-devkit-data` functions.

### 🧠 AI & Gateway Tasks
* Read `Project Atlas/ai/features-design.md` and `Project Atlas/security/antigravity/ai-gateway-abuse-audit.md`.
* Route all AI calls through Appwrite `ai-gateway`.

### 🚀 Deployment & Infrastructure Tasks
* Read `Project Atlas/deployment/DEPLOYMENT_GUIDE.md`.
* **CRITICAL:** Vercel deploys frontend from `main`. Do NOT alter deployment scripts or FTP paths without reading `DEPLOYMENT_GUIDE.md`.

### 🧪 QA & Security Verification Tasks
* Read `Project Atlas/qa/` for past E2E test reports and QA fix evidence.
* Read `Project Atlas/security/` for security cleanup audits and permissions guidelines.

### 📁 Documentation & Plan Tasks
* Update relevant files inside `Project Atlas/`.
* Append dated entries to `Project Atlas/CHANGELOG.md`.

---

## 6. Forbidden Actions

1. **Do NOT modify application logic** during documentation tasks.
2. **Do NOT introduce non-Appwrite backends** (e.g. Supabase, Kinde). WiseResume is Appwrite-native.
3. **Do NOT bypass `ai-gateway`** for AI features unless explicitly documented in Atlas.
4. **Do NOT run deleting FTP mirrors** against root directories.
5. **Do NOT delete documentation files.** Archive stale docs under `Project Atlas/archive/`.
6. **Do NOT commit credentials or secrets.**

---

## 7. Definition of Done (DoD)

A task is completed ONLY when:
1. Root cause is verified and fixed.
2. Unit / E2E test passes or explicit verification blocker is reported.
3. Relevant `Project Atlas/` documentation is updated.
4. Dated entry is recorded in `Project Atlas/CHANGELOG.md`.

---

## 8. Historical Log Reference

* `Project Atlas/MASTER_HANDOVER_2026.md` contains chronological session handovers and historical context from June 2026 development iterations.
