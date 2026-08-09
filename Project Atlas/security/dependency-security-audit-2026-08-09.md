# WiseResume Dependency Security Audit

**Date:** 2026-08-09  
**Scope:** read-only source, committed-lockfile, GitHub-access, and public OSV advisory review.  
**No dependency, lockfile, code, workflow, configuration, secret, deployment, commit, or push change was made.**

The local shell has neither `gh` nor `npm` on its PATH. No tooling was installed and no stored credential was inspected; committed lockfile graph analysis was used in place of `npm ls`/`npm audit`.

## 1. Executive Verdict

No confirmed WiseResume production exploit was established. The most important remediation candidate is stale Axios resolution in five deployed Appwrite hubs: the committed manifests permit the fixed 1.18.x line, while their locks resolve vulnerable 1.16.0/1.16.1 versions. This is a meaningful maintenance-security task, but the reviewed code does not meet the documented exploit preconditions for the Axios advisories (no Axios interceptors, proxy configuration, HTTP/2 or fetch-adapter streaming, or untrusted multipart field names were found).

The GitHub Dependabot REST inventory could not be read from this workspace: the GitHub CLI is absent, the available GitHub connector has no Dependabot-alert endpoint, and the repository's Dependabot page/API is not publicly readable. Therefore no current GitHub alert total or severity count is asserted below. The historical `71` count is not treated as current truth.

As a supplemental, reproducible check, the public OSV API was queried against every version in the committed root and 28 Appwrite-hub lockfiles. It found **72 manifest-advisory instances**: **23 high** and **49 moderate**, no critical or low. OSV inventory is useful for triage but is not a substitute for authenticated GitHub Dependabot inventory; GitHub may group, withdraw, or score alerts differently.

## 2. Current Dependabot Inventory

| Inventory source | Total | Critical | High | Moderate | Low | Status |
|---|---:|---:|---:|---:|---:|---|
| GitHub Dependabot, open alerts | not verified | not verified | not verified | not verified | not verified | blocked by unavailable authenticated alert-read path |
| OSV against committed locks (supplement) | 72 manifest instances | 0 | 23 | 49 | 0 | current lockfile evidence, not a GitHub replacement |

The OSV supplement comprises 17 root-manifest advisory/package pairs and 55 hub-manifest pairs. The 55 hub pairs are concentrated in `admin-devkit-data` (11), `admin-sentry` (1), `ai-gateway` (11), `job-import` (11), `resume-section-ai` (11), and `wisehire-gateway` (10).

## 3. Production Exposure Summary

| Exposure conclusion | Count | Basis |
|---|---:|---|
| Confirmed runtime exploitation | 0 | No advisory's documented attack preconditions were demonstrated in the reviewed code. |
| Likely runtime exposure | 0 | No public route or hub was found to pass the required attacker-controlled values into the vulnerable APIs. |
| Conditional / feature-specific | 3 root React Router advisories; 55 hub Axios/form-data instances | Runtime packages are present, but required conditions are absent or require a separate focused review. |
| Build/dev/test-only or transitive-not-reachable | 14 root package/advisory pairs | Brace expansion, IP-address, most Undici, PostCSS NanoID, and config-parser paths are tooling/transitive. |
| Major/breaking remediation candidate | 3 React Router pairs | Published fixes require the React Router v7 line. |

## 4. P0 Alerts

None. No confirmed or highly likely production exploitability was found.

## 5. P1 Alerts

| Package / advisory set | Locked versions and manifests | Severity | Actual WiseResume exposure | Safe remediation path | Risk |
|---|---|---|---|---|---|
| `axios` — `GHSA-42h9-826w-cgv3`, `GHSA-7q8q-rj6j-mhjq`, `GHSA-f4gw-2p7v-4548`, `GHSA-gcfj-64vw-6mp9`, `GHSA-hcpx-6fm6-wx23`, `GHSA-jqh4-m9w3-8hp9`, `GHSA-mmx7-hfxf-jppx`, `GHSA-mwf2-3pr3-8698`, `GHSA-pmv8-rq9r-6j72`, `GHSA-xj6q-8x83-jv6g` | 1.16.0/1.16.1 in `admin-devkit-data`, `ai-gateway`, `job-import`, `resume-section-ai`, `wisehire-gateway` | 2 high, 8 moderate; 50 manifest instances | Axios is used for outbound AI-provider, Resend, Appwrite/GitHub admin, job-import, and WiseHire calls. No Axios interceptors, proxy settings, fetch-adapter/HTTP2 streamed uploads, or untrusted multipart-to-JSON use were found. The prototype-related advisories additionally require prior process-wide prototype pollution. | Refresh each affected hub lock to Axios >= 1.18.0 (the manifests' `^1.4.0` ranges permit it). | **Medium**: semver-compatible, but outbound provider/auth/admin integrations need focused runtime checks. |

## 6. P2 Alerts

| Package / advisory | Scope and dependency chain | Exposure classification | Fixed version / remediation | Risk |
|---|---|---|---|---|
| `form-data` `GHSA-hmw2-7cc7-3qxx` | 4.0.5 in Axios trees in `admin-devkit-data`, `admin-sentry`, `ai-gateway`, `job-import`, and `resume-section-ai` | Conditional: CRLF injection requires untrusted multipart field names or filenames. `admin-deploy-hubs` appends fixed field names and a trusted archive stream; no other explicit FormData construction was found. | >= 4.0.6; consolidate with the Axios-lock batch. | Low–medium.
| `nanoid` `GHSA-28wg-ghj8-5hjv` | 5.1.6 via `docx`, used in browser DOCX generation | Conditional / feature-specific: the defect requires `nanoid/non-secure` with an attacker-controlled negative size; no direct NanoID import or non-secure API use was found. | >= 5.1.16 through a lock refresh compatible with the `docx` dependency range. | Low; export QA required.
| `js-yaml` `GHSA-5p4m-2wfm-xmqj` | 4.3.0 via ESLint, Vercel Python analysis, and Puppeteer config paths | Build/config only: vulnerable `!!omap` parsing of untrusted YAML was not found in product or hub code. | >= 4.3.1; the existing root override range already allows it. | Low.
| `undici` `GHSA-8xcm-r25x-g524`, `GHSA-m8rv-5g2x-5cg5`, `GHSA-v3r7-h72x-cjcm` | 6.27.0 nested under `@vercel/node` | Conditional Vercel/serverless dependency. The reviewed code does not import Undici or enable its retry/cache interceptors, construct blob-like body type values, or use cookie helpers. | >= 6.28.0 (and preserve the existing targeted `@vercel/node` override intent). | Low–medium; API build and targeted route checks required.

## 7. Dev/Test/Build-Only Alerts

| Package / advisory set | Chain | Classification | Safe direction |
|---|---|---|---|
| `brace-expansion` `GHSA-mh99-v99m-4gvg`, `GHSA-rgw5-rvv9-x895` | `minimatch` under ESLint, Sentry build tooling, Vercel NFT/Python analysis, and glob | `BUILD_OR_DEV_ONLY`; attack requires untrusted brace-pattern expansion. | Resolve to 2.1.4 where compatible; the older 1.x branch needs a parent update rather than a blind override. |
| `ip-address` `GHSA-22jq-vg5j-6vgg`, `GHSA-4xrf-jv44-h6hh`, `GHSA-mwp4-54f8-5fhr` | `@puppeteer/browsers` → `proxy-agent` → `socks-proxy-agent` → `socks` → `ip-address` | `BUILD_OR_DEV_ONLY`; advisories require that library to make SSRF/trust decisions. WiseResume's public URL-import route uses its own DNS-pinning and address-validation code, not this package. | >= 10.3.1 through Puppeteer/proxy-chain lock refresh. |
| `nanoid` `GHSA-2v37-7h3g-55p8` | 3.3.16 via PostCSS | `BUILD_OR_DEV_ONLY`; no NanoID custom generator is used by application code. | >= 3.3.17 through parent/lock refresh. |
| `undici` `GHSA-4cwx-7wf7-3272`, `GHSA-8xcm-r25x-g524`, `GHSA-jr45-8vmc-qm54`, `GHSA-m8rv-5g2x-5cg5`, `GHSA-v3r7-h72x-cjcm` | 7.28.0 through `jsdom`/test tooling | `BUILD_OR_DEV_ONLY`; no direct Undici import or interceptor use was found. | >= 7.29.0 through test-tooling lock refresh. |

## 8. Not Applicable Alerts

- `fast-uri` `GHSA-7p8r-x3mc-p8w7` (3.1.4 via `@vercel/static-config` → Ajv) is exploitable only when it is used for host-policy validation before a different Node URL consumer. There is no direct import or such policy path in WiseResume. The public URL-import route is an Appwrite-JWT-protected Vercel handler with its own URL/DNS validation and pinned request path.
- `react-router` `GHSA-337j-9hxr-rhxg` concerns React Router SSR hydration. WiseResume is a Vite SPA using `BrowserRouter`; no `StaticRouter`, `hydrateRoot`, `renderToString`, or server-rendered Router hydration path was found.
- The Undici cache/cookie/retry advisories are not presently reachable through documented use because the repository contains no direct Undici import, `interceptors.cache`, `interceptors.retry`, or cookie-helper usage.

## 9. Breaking / Deferred Alerts

| Package / advisory | Current usage | Why deferred | Classification |
|---|---|---|---|
| `react-router` `GHSA-wrjc-x8rr-h8h6` | Direct browser routing dependency via `react-router-dom` 6.30.4 | Fixed line is React Router 7.18.0; this is a framework migration, not a patch update. Existing login redirects use `safeInternalRedirect`, which rejects backslashes, control characters, protocol-relative paths, and external targets. | `P5 — BLOCKED / BREAKING MIGRATION` |
| `react-router-dom` `GHSA-jjmj-jmhj-qwj2` | Direct browser routing dependency, 6.30.4 | Advisory concerns open redirect leading to XSS. No confirmed user-controlled `to`/`navigate` target was established, but the direct public-browser dependency warrants a dedicated v7 migration plan and navigation regression review. | `P5 — BLOCKED / BREAKING MIGRATION` |

## 10. Dependency Chains

| Vulnerable package | Principal chain(s) |
|---|---|
| Axios | Direct hub dependency in five deployed hubs; 1.16.x locks despite `^1.4.0` manifests. |
| form-data | Direct `admin-deploy-hubs` dependency and Axios transitive dependency in five hubs. |
| NanoID 5 | `docx` → `nanoid` (browser DOCX export). |
| fast-uri | `@vercel/node` → `@vercel/static-config` → Ajv → `fast-uri`. |
| ip-address | `@puppeteer/browsers` → `proxy-agent` → `socks-proxy-agent` → `socks` → `ip-address`. |
| js-yaml | ESLint / Vercel Python analysis / Puppeteer config chains. |
| React Router | Root `react-router-dom` → `react-router`. |
| Undici | `@vercel/node` nested 6.27.0 and jsdom/test-tooling 7.28.0. |

## 11. Consolidated Fix Opportunities

1. Updating Axios lock resolution to >= 1.18.0 in five hubs potentially resolves **50** OSV manifest-advisory instances in one controlled batch.
2. Updating `form-data` to >= 4.0.6 across its five affected hub contexts resolves its high advisory while reviewing the same outbound-request surfaces.
3. Root lock refreshes can address NanoID, js-yaml, fast-uri, IP-address, brace-expansion, and Undici without changing application APIs when parent semver ranges permit; these should be split by runtime scope.
4. React Router is not a safe lockfile-only update. Treat all three router advisories as one separately planned v7 migration.

## 12. Recommended Fix Batches

| Batch | Packages / alerts | Expected files | Risk | Deployment impact |
|---|---|---|---|---|
| **1 — recommended first** | Axios >= 1.18.0 and form-data >= 4.0.6 in affected hub locks; 55 hub-manifest OSV instances | Only the six affected hub `package-lock.json` files if semver ranges already permit resolution | Medium | Eventual targeted Appwrite deploy only: `admin-devkit-data,admin-sentry,ai-gateway,job-import,resume-section-ai,wisehire-gateway`; never `target=all`. |
| 2 | Root runtime/Vercel lock refresh: NanoID, js-yaml, fast-uri, production Undici | `package-lock.json`, possibly `package.json` overrides only if a safe parent resolution is unavailable | Medium | Vercel deploy after approval; no Appwrite deploy unless hub manifests change. |
| 3 | Root build/test-only refresh: brace-expansion, IP-address, PostCSS NanoID, jsdom Undici | `package-lock.json` and only necessary parent manifests | Low | No production deployment required solely for local tooling; validate CI/build. |
| 4 | React Router v7 migration | Source, tests, `package.json`, lockfile, routing QA docs | High | Vercel deployment plus comprehensive browser QA; no Appwrite hub deployment expected. |

## 13. Validation Required Per Batch

- All batches: clean-install check, `git diff --check`, TypeScript, focused tests, production build, and a dependency-tree re-audit.
- Batch 1: `node --check` for each affected hub; focused outbound-call/auth tests; controlled AI, job import, admin DevKit, Sentry admin, and WiseHire smoke checks before any targeted hub deployment.
- Batch 2: Vercel API security tests (especially URL import), DOCX export QA, server/PDF checks, and browser smoke after Vercel deployment.
- Batch 3: lint/test/build only unless a changed package is bundled into production.
- Batch 4: routing/auth redirect, public portfolio, Jobs, editor, export, DevKit denial, and mobile/desktop browser regression QA.

## 14. Deployment Impact

- This audit made no deployment.
- Batch 1 would be Appwrite-hub-only and must use the six named targets, never `all`.
- Batch 2 and Batch 4 would be Vercel/frontend or Vercel API work; they do not imply an Appwrite deployment by themselves.
- Batch 3 normally requires no deployment.

## 15. Deferred Risks

- The current GitHub Dependabot inventory remains unverified until an authenticated GitHub alert-read path is supplied.
- React Router v6 security advisories remain deferred because a v7 migration requires separate design and regression planning.
- Deprecated locked packages: `@esbuild-kit/core-utils` and `@esbuild-kit/esm-loader` (merged into `tsx`), plus `glob` 10.5.0. These are maintenance items, not evidence of a current WiseResume production exploit.

## 16. Recommended Next Action

Authorize **Batch 1 only** after the owner can supply authenticated GitHub Dependabot read access or export so the exact GitHub alert set can be reconciled first. Then refresh only the six affected hub lockfiles, validate the named hub paths, and deploy only the affected targets after explicit approval.
