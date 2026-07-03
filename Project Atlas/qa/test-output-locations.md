# Test Output Locations & Artifact Governance

**Last Verified:** 2026-07-03
**Status:** Canonical Test Artifact Spec
**Classification of Root `reports/`:** `GENERATED_TEST_OUTPUT`

---

## 1. Governance & Storage Policy

* **Generated Machine Output**: Automated test execution outputs (e.g. Playwright JSON test results, HTML reports, traces, screenshot artifacts, and function audit dumps) MUST remain in root `reports/`.
* **Tooling Compatibility**: Test runners and reporting tools automatically output artifacts to root `reports/`. Leaving generated machine artifacts in root `reports/` prevents breaking test reporting tooling.
* **Human QA Reports**: All human-written QA reports, manual audit writeups, and QA summaries MUST be placed in `Project Atlas/qa/` or `Project Atlas/reports/` living subdirectories. Stale human reports MUST be archived under `Project Atlas/archive/imported-reports/`.
* **No Random Root QA Docs**: Agents MUST NOT create random Markdown report files in root or root `reports/`.

---

## 2. Root `reports/` Artifact Inventory

| Artifact / Path | Format | Classification | Description |
|---|---|---|---|
| `reports/e2e-results-*.json` | JSON | `GENERATED_TEST_OUTPUT` | Timestamped Playwright E2E test execution result dumps. |
| `reports/e2e-results.json` | JSON | `GENERATED_TEST_OUTPUT` | Latest Playwright E2E test result summary. |
| `reports/e2e-html/` | HTML | `GENERATED_TEST_OUTPUT` | Interactive Playwright HTML test report folder (`index.html`). |
| `reports/appwrite-functions-audit-latest.json` | JSON | `GENERATED_TEST_OUTPUT` | Automated Appwrite function deployment and health audit output. |

---

## 3. Living QA & Report Locations in `Project Atlas/`

* **Human QA Strategy & Suite Guides**: [`Project Atlas/qa/`](./)
* **Living UI/UX Audits**: [`Project Atlas/reports/ui-ux/`](../reports/ui-ux/)
* **Living Performance Audits**: [`Project Atlas/reports/performance/`](../reports/performance/)
* **Living DevKit Audits**: [`Project Atlas/reports/devkit/`](../reports/devkit/)
* **Living Landing Audits**: [`Project Atlas/reports/landing/`](../reports/landing/)
* **Archived Historical Audits**: [`Project Atlas/archive/historical-audits/`](../archive/historical-audits/)
