# Playwright & Vitest E2E Test Suite Specification

**Last Verified:** 2026-07-03
**Status:** Living QA Architecture & Suite Specification
**Location:** `Project Atlas/qa/PLAYWRIGHT_E2E_SUITE.md`

---

## 1. Executive Summary & Test Inventory Mapping

This document specifies the location boundaries, test runner conventions, and output routing policies for automated testing in `iammagdy/WiseResume-TWC`.

---

## 2. Directory Governance Matrix

| Directory | Role & Governance Rules | Examples & File Types |
|---|---|---|
| **Root `tests/`** | **Executable Test Code**: Runnable Playwright E2E test specs (`*.spec.ts`), Vitest unit tests (`*.test.cjs`), test runners (`runner.ts`), and test scenarios. Must remain in root `tests/`. **Outside Atlas**. | `tests/p0-readiness.test.cjs`, `tests/ai-health-auth.test.cjs`, `tests/providers.ts` |
| **Root `reports/`** | **Generated Machine Output**: Automatically generated JSON test results, HTML test runner reports, and traces produced by test runners. **Outside Atlas**. | `reports/e2e-results-*.json`, `reports/index.html` |
| **`Project Atlas/qa/`** | **Living QA Strategy & Suite Maps**: Human-written QA strategies, test suite inventory maps, Playwright setup runbooks, and test output location policies. | `qa/test-suite-map.md`, `qa/test-output-locations.md`, `qa/PLAYWRIGHT_E2E_SUITE.md` |
| **`Project Atlas/reports/`** | **Categorized Human Audit Reports**: Formatted, human-readable QA audit reports, performance reviews, UI/UX stabilization summaries, and DevKit audits. | `reports/ui-ux/`, `reports/performance/`, `reports/devkit/`, `reports/landing/` |
| **`Project Atlas/archive/`** | **Historical Archive**: Stale, legacy, or superseded point-in-time QA audit reports. Strictly non-canonical. | `archive/historical-audits/` |

---

## 3. Playwright E2E Test Suite Execution Rules

1. **Local E2E Execution**: Playwright E2E tests run against the local dev server (`vite dev` on port 5173 or local preview server).
2. **Headless & Turnstile Limitations**: Cloudflare Turnstile bot detection on public contact forms rejects headless browser automation. Turnstile verification must be verified manually in production.
3. **No Root Markdown Noise**: Automated test runs MUST output machine JSON/HTML results exclusively into root `reports/`. AI agents and automated test runners MUST NOT write Markdown files or scratch logs directly to root `/` or `Project Atlas/` root.

---

## 4. Related QA Specifications

* [`Project Atlas/qa/test-suite-map.md`](./test-suite-map.md) — Executable test directory mapping.
* [`Project Atlas/qa/test-output-locations.md`](./test-output-locations.md) — Generated test output routing policy.
* [`Project Atlas/RULES.md`](../RULES.md) — Test & QA governance rules.
