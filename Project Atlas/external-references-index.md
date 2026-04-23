# External References — Audits, Plans, Postmortems & Runbooks Outside the Atlas

**Last verified:** 2026-04-23
**Type:** index
**Sources:**
- `docs/audits/` (engineering audits)
- `docs/landing/` (landing-page audits + diagnoses + verification reports)
- `docs/ops/` (operational runbooks)
- `docs/issues/` (per-feature issue logs and fix plans)
- `docs/features/` (feature design notes)
- `docs/product/PRD.md` (product requirements)
- Top-level `*_AUDIT.md` files
- `docs/AI_TOOLS_AUDIT.md`, `docs/db-unused-index-analysis.md`, `docs/openrouter2-deployment.md`, `docs/tailor-tool-backlog.md`, `docs/ai_features_design.md`

**Canonical owner:** the source files themselves (this is an index — see `MAINTENANCE.md` § "What this folder is"; the Atlas indexes external sources rather than duplicating them).

---

## Why this file exists

The Atlas's design rule (`Project Atlas/README.md`) is that `project-governance/`, `Routing AI Providers/`, `specs/`, and `docs/` remain the **canonical sources**, and the Atlas is the **index over them** plus the missing per-page / per-function / per-table reference cards. That rule is correct — moving these files into the Atlas would break their existing in-repo references, governance citations, and CI hooks.

But it also meant a number of audits, postmortems, runbooks, and plan documents lived outside the Atlas with no single place to discover them. Future agents (and the owner) had to grep for them. This file is that single discovery point: every plan / audit / postmortem / runbook outside the Atlas is catalogued below with its file path and a one-line summary, so the Atlas becomes the gathering point without files needing to be moved.

---

## Engineering audits — `docs/audits/`

| Document | Summary |
|---|---|
| [`docs/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md`](../docs/audits/2026-04-21-ai-tools-reliability-and-ui-audit.md) | Read-only audit of AI tools' reliability and the surrounding UI states (loading, error, empty, retry copy, partial-failure handling). |
| [`docs/audits/2026-04-22-editor-page-control-and-crash-audit.md`](../docs/audits/2026-04-22-editor-page-control-and-crash-audit.md) | Editor page audit covering control flow, crash points, AI toast surfacing, and recovery behaviour. |

## Landing-page audits & diagnoses — `docs/landing/`

| Document | Summary |
|---|---|
| [`docs/landing/audit-report-2026-04-18.md`](../docs/landing/audit-report-2026-04-18.md) | Pre-fix landing audit: paint timing, layout shifts, sequencing of hero / CTA / trust badges, crash-reporting library boot cost. |
| [`docs/landing/audit-report-post-fix.md`](../docs/landing/audit-report-post-fix.md) | Post-fix verification (Task #23) confirming the landing-page paint sequence after the deferred-Sentry fix. |
| [`docs/landing/phase-6-verification.md`](../docs/landing/phase-6-verification.md) | Landing overhaul Phase 6 verification report (with vitest output sibling `phase-6-vitest-output.txt`). |
| [`docs/landing/scroll-stack-flicker-diagnosis.md`](../docs/landing/scroll-stack-flicker-diagnosis.md) | Diagnosis of the scroll-stack flicker / "vibration" issue on the landing page. |

## Operational runbooks — `docs/ops/`

| Document | Summary |
|---|---|
| [`docs/ops/api-key-encryption-rotation.md`](../docs/ops/api-key-encryption-rotation.md) | BYOK API-key encryption migration & rotation runbook for `public.user_api_keys`. |
| [`docs/ops/auth-refresh-token-reuse-interval.md`](../docs/ops/auth-refresh-token-reuse-interval.md) | Lowering Supabase Auth's `security_refresh_token_reuse_interval` (AUTH-5) — out-of-band setting, not in code. |
| [`docs/ops/pwa-removal-verification.md`](../docs/ops/pwa-removal-verification.md) | PWA removal status and the returning-visitor recovery path (Task #15, 2026-04-22). |
| [`docs/ops/stale-v3.4-postmortem.md`](../docs/ops/stale-v3.4-postmortem.md) | Postmortem of the v3.4 silent-stale-deploy incident. **Already referenced from** `01-Currently Implemented/stability-fixes/phase-7-deploy-and-devtools-hardening.md`. |

## Per-feature issue logs and fix plans — `docs/issues/`

| Document | Summary |
|---|---|
| [`docs/issues/interview-feature-fix-plan.md`](../docs/issues/interview-feature-fix-plan.md) | Fix plan for the interview-prep feature. **Already referenced from** Atlas. |
| [`docs/issues/interview-feature-issues.md`](../docs/issues/interview-feature-issues.md) | Interview-prep feature open issues log. **Already referenced from** Atlas. |
| [`docs/issues/portfolio-feature-issues.md`](../docs/issues/portfolio-feature-issues.md) | Portfolio feature open issues log. **Already referenced from** Atlas. |

## Feature design notes — `docs/features/`

| Document | Summary |
|---|---|
| [`docs/features/trial-resume.md`](../docs/features/trial-resume.md) | Trial-resume feature design. **Already referenced from** Atlas. |

## Product specs — `docs/product/`

| Document | Summary |
|---|---|
| [`docs/product/PRD.md`](../docs/product/PRD.md) | WiseResume Product Requirements Document — source of truth for current product behaviour. **Sits alongside** `project-governance/PRODUCT.md`; PRD is the legacy single-product document, governance is the supreme cross-product source. |

## Audit & analysis docs at repo root and `docs/`

| Document | Summary |
|---|---|
| [`AI_AUDIT.md`](../AI_AUDIT.md) | AI-tools security audit covering `supabase/functions/_shared/aiClient.ts` (2252 LOC) and the AI edge functions. |
| [`AUTH_AUDIT.md`](../AUTH_AUDIT.md) | Authentication audit for the Supabase project (`jnsfmkzgxsviuthaqlyy`, eu-central-1). |
| [`BACKEND_AUDIT.md`](../BACKEND_AUDIT.md) | Backend audit (April 18, 2026). |
| [`DATABASE_AUDIT.md`](../DATABASE_AUDIT.md) | Database audit for the Supabase project (`jnsfmkzgxsviuthaqlyy`, eu-central-1). |
| [`docs/AI_TOOLS_AUDIT.md`](../docs/AI_TOOLS_AUDIT.md) | Read-only audit of every AI-powered Supabase edge function in the repo. |
| [`docs/db-unused-index-analysis.md`](../docs/db-unused-index-analysis.md) | Unused-index audit (Apr 21, 2026): the 32 indexes the performance advisor flagged, and why each was kept. |
| [`docs/openrouter2-deployment.md`](../docs/openrouter2-deployment.md) | OpenRouter 2 managed-provider deployment runbook (Tasks #13 / #14). |
| [`docs/tailor-tool-backlog.md`](../docs/tailor-tool-backlog.md) | Tailor tool — backlog & health audit (combined reference). |
| [`docs/ai_features_design.md`](../docs/ai_features_design.md) | 8 planned AI features design doc. **Already linked from** `Project Atlas/02-Planned/ai-features-8-pack.md` and from the top-level Atlas `README.md`. |

---

## Maintenance

When a new audit, postmortem, runbook, or plan file is added under `docs/` or at the repo root, **add a row to the appropriate table above** in the same task. Do not move the file into the Atlas — keep the canonical source where it is and let this index point to it.

When a referenced file is renamed or deleted, update or remove its row here.
