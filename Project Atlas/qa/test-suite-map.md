# QA & Executable Test Suite Map

**Last Verified:** 2026-07-03
**Status:** Canonical QA Map
**Classification of Root `tests/`:** `EXECUTABLE_TEST_CODE`

---

## 1. Governance & Execution Rule

* **Executable Test Code**: All runnable test code, Playwright specifications, Vitest unit tests, and test fixtures MUST remain in root `tests/` (and `src/**/*.test.ts`).
* **Test Runners**: Test runner configuration (`vitest.config.ts`, `playwright.config.ts`) depends on root `tests/`. Do NOT move executable test files into `Project Atlas/`.
* **Knowledge & Strategy**: All human-written QA strategy, test suite maps, manual verification checklists, and audit summaries MUST reside in `Project Atlas/qa/`.

---

## 2. Directory Structure of Root `tests/`

| Subdirectory | Purpose | Classification |
|---|---|---|
| `tests/e2e/specs/` | Playwright E2E test specifications (`*.spec.ts`) covering auth, editor, export, portfolio, and admin flows. | `EXECUTABLE_TEST_CODE` |
| `tests/e2e/fixtures/` | Sample resumes, PDFs, DOCX files, and mock payloads used during E2E testing. | `EXECUTABLE_TEST_CODE` |
| `tests/hubs/` | Serverless Appwrite Function unit and integration tests (`*.test.cjs`). | `EXECUTABLE_TEST_CODE` |
| `tests/model-comparison/` | Benchmarking scripts and model routing verification scenarios (`providers.ts`, `runner.ts`, `scenarios.ts`). | `EXECUTABLE_TEST_CODE` |
| `tests/setup/` | Test environment bootstrap and global setup modules (`globalSetup.ts`). | `EXECUTABLE_TEST_CODE` |

---

## 3. QA Documentation Map in `Project Atlas/qa/`

* [`PLAYWRIGHT_E2E_SUITE.md`](./PLAYWRIGHT_E2E_SUITE.md) — Comprehensive E2E test inventory and execution guide.
* [`test-suite-map.md`](./test-suite-map.md) — Canonical mapping of executable test directories and rules.
* [`test-output-locations.md`](./test-output-locations.md) — Location mapping for generated test outputs vs human QA reports.
