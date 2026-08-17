# WR-2026-08-17 Comprehensive Trust Audit

**Status:** fixed and verified locally; coordinated release required
**Scope:** WiseResume web UI, onboarding, resume sharing, PDF/export, analytics, ATS/readiness and job-match signals, AI prompts and reconciliation, Appwrite hubs, schema permissions, credit accounting, authentication-adjacent flows, avatar privacy, referral/share UX, and WiseHire
**Production changes:** none

## Executive result

The audit found multiple high-impact trust-boundary failures: browser-enforced resume-share passwords, anonymous collection permissions in canonical schema scripts, caller-controlled coupon entitlements, unauthorised WiseHire company provisioning, non-atomic OTP attempts, automatic paid AI matching, unredacted AI inputs, job-import SSRF exposure, and AI tailoring that could introduce unsupported facts. Each confirmed issue was repaired in the local working tree with focused regression coverage.

All frontend assertions and every backend hub test file pass, along with whole-repository ESLint, TypeScript, production/server builds, no-sourcemap checks, Arabic coverage, dependency audit, and the recorded visual/PDF checks. One export-browser teardown hook timed out only during the concurrent full frontend/backend run; its complete eight-test file passed immediately in isolation. No code, schema, function, secret, or configuration was deployed; production is not remediated until the release plan below is completed. This is a verified local result within the evidence below, not a universal “100%” guarantee across every browser, device, external ATS, AI answer, or undeployed production path.

## XYZ requirement matrix

`X` is the requested product area, `Y` is the audit evidence/impact, and `Z` is the implemented disposition and verification status.

| X — requirement | Y — evidence and user impact | Z — local disposition and verification |
|---|---|---|
| UI/UX, English/Arabic, mobile, accessibility | Public landing comparison, mobile navigation, Arabic `lang=ar`/`dir=rtl` and overflow checks, plus UI/translation regression tests. Misleading labels and several weak action descriptions were found. | Copy and labels now describe the real action; Arabic/English strings were reconciled; keyboard/semantic component coverage remained green. Public visual evidence passed. This is not a claim of formal WCAG certification. |
| Security and privacy | Critical browser/server trust failures existed in schema permissions, shares, coupons, OTPs, signup, URL imports, AI inputs, credits, and predictable public avatar URLs. | Server-authoritative authorization, cryptographic/persistent controls, redaction, transactional accounting, fail-closed validation, random avatar IDs with disclosure, and focused security tests added. All 44 hub test files and the dependency audit pass. |
| Onboarding | Uploaded CVs were not uniformly validated by signature/type/size and invited WiseHire signup authority was incomplete. | Strict upload validation and verified-email invite/approval binding added; related frontend/backend suites pass. The public invite-carrying UX remains a declared residual. |
| PDF and other exports | Active/oversized PDF content, one-page truncation, inconsistent Letter/A4/page numbering, hobbies omissions, and client-trusted branding entitlement were found. | Bounded JavaScript-disabled rendering, complete one-page scaling, authoritative Premium branding, consistent paper/page settings, and hobby coverage added. Rendered Letter evidence, PDF metadata, export tests, and production build pass. |
| Backend and data integrity | Anonymous collection policies, non-atomic counters, SSRF, caller-selected entitlements, idempotency gaps, and partial provisioning could corrupt authority or spend. | Canonical schemas and hubs now use server-only/owner-scoped access, transactions, bounded retries, DNS/redirect validation, and content-aware idempotency. Hub and schema-policy regression coverage passes. |
| ATS/readiness results | Section-completion heuristics and provider self-scores were presented as employer ATS authority. | Labels now say resume readiness/section completion or keyword alignment; match values are deterministic from visible resume/job evidence. Help, analytics, achievements, editor, marketing, and Arabic/English copy no longer promise vendor-specific ATS outcomes. |
| AI prompts and content rewriting | Generic messages, stale prompts, aggressive “perfect match” language, forged tailoring output, and a Wise AI Studio payload-routing defect could omit user context or invent identities, skills, metrics, salary claims, company facts, or confidence. | Feature-specific schemas and factual-integrity rules, nested payload allowlists, source-first reconciliation, immutable protected fields, same-bullet metric grounding, safe follow-up fixes, and refreshed prompt snapshots added. Prompt/truthfulness and tailoring suites pass; qualitative prose still requires review. |
| Smart recommendations | Suggestions encouraged adding metrics without first establishing evidence and activity/readiness heuristics were mislabeled as AI or ATS authority. | Recommendations now ask for verified evidence, truthful job terms, and review. Deterministic activity insights and readiness wording replace false AI/ATS claims; dedicated nudge/dashboard tests pass. |
| Operational controls and analytics | Analytics export, comparison details, and a headshot control did not work; referrals advertised unimplemented rewards; current application statuses were labeled like a conversion rate. | Safe CSV export, working job-comparison details, and truthful current-status analytics were implemented. Non-working controls and fictional referral rewards were removed; the route remains a working WiseResume share page. |
| Release and authenticated E2E boundary | The chosen in-app browser shared an active production Appwrite session belonging to another user; replacing it with the supplied test account could mutate that session. | No sign-out, account replacement, production mutation, deployment, or secret/configuration change was made. Protected behavior is covered locally by component/integration/hub tests; isolated staging browser smoke tests remain required. |

## Finding register

| ID | Severity | Finding | Local disposition |
|---|---:|---|---|
| WR-SEC-001 | Critical | Canonical `ai_credits` and remote-jobs schema scripts granted anonymous collection access, enabling quota tampering or feed poisoning if applied. | Server-only/owner-scoped permissions reconciled; schema regression tests added. |
| WR-SEC-002 | Critical | Coupon redemption accepted caller-selected plan/duration when a coupon lacked an override. | Server-owned entitlement mapping and atomic redemption/usage enforcement added. |
| WR-SEC-003 | Critical | Password-protected resume shares exposed the token/resume relation to the browser and gated content only after direct reads. | Server-authoritative share/content/comment access, hash-only tokens, scrypt passwords, short-lived capabilities, persistent throttling, and owner-authenticated mutations added. |
| WR-SEC-004 | High | Any authenticated WiseHire user could create a company without a valid invite/approved account. | Verified-email invite/approval binding plus atomic provisioning and conflict-safe idempotency added. |
| WR-SEC-005 | High | Password-reset OTPs used `Math.random` and non-atomic attempt checks. | Cryptographic OTP generation and atomic capped attempt handling added. |
| WR-SEC-006 | High | Job import could reach unsafe network targets and its reader fallback/credits/idempotency were not a single trustworthy boundary. | DNS-vetted/pinned targets, redirect revalidation, explicit reader disclosure, fail-closed idempotency lease, transactional charge/refund, and concurrent first-document protection added. |
| WR-AI-001 | High | Opening Jobs/Applications could silently send an unredacted resume to AI and charge credits for every uncached job. | Automatic AI loop removed; deterministic local matching used; AI requires explicit privacy-gated action. |
| WR-AI-002 | High | Generic gateway messages and tailoring structured output could bypass feature prompts or add forged identities, skills, metrics, and self-scores. | Unknown feature rejected; strict schemas/scores; source-first reconciliation; immutable fields; source-only skills; same-bullet metric grounding; model-only rows dropped. |
| WR-AI-003 | High | Resume-section idempotency omitted relevant context and credit writes could race or charge invalid output. | Content/context-aware idempotency, deterministic credit document IDs, transaction-safe reserve/refund, response validation, and collision handling added. |
| WR-AI-004 | High | Wise AI Studio sent tool inputs inside `payload`, but the gateway read root fields only, so several tools could generate from missing context. | Per-tool nested payload allowlists, exact JSON schemas, source/metric normalization, unknown-task rejection, and safe failure/refund behavior added. |
| WR-EXP-001 | High | Server PDF generation admitted oversized/active documents and branding entitlement was not uniformly authoritative. | Authenticated bounded rendering, JavaScript disabled, page/node/output/concurrency/rate caps, correct Letter/A4 mapping, complete one-page scaling, and server-verified Premium branding removal added. |
| WR-TRUTH-001 | Medium | Completion heuristics and provider self-scores were presented as ATS/match authority. | Product labels changed to resume readiness/section completion and keyword alignment; keyword/match scores derive deterministically from resume/job evidence; unsupported provider before/after scores removed. |
| WR-TRUTH-002 | Medium | Marketing, editor actions, and smart recommendations contained unverified performance statistics or encouraged unsupported metrics. | Fake outcome statistics removed; prompts, recommendations, demos, and bilingual copy now require verified source evidence and human review. |
| WR-UX-001 | Medium | Onboarding and public/export paths incompletely validated files or omitted supported resume sections/hobbies. | Signature/type/size validation, complete shared-resume rendering, and hobby coverage in supported exports added. |
| WR-PRIV-001 | Medium | Error/URL telemetry and several AI surfaces could expose contact data or recovery parameters. | Sensitive URL/error sanitization, contact redaction with local placeholder restoration, and consistent AI disclosure gating added. |
| WR-PRIV-002 | Medium | Profile avatar file IDs were derived from account IDs while the files were intentionally world-readable for public portfolios/exports. | New IDs are random, replacement is rollback-safe, owned previous files are cleaned up, and upload surfaces disclose direct-link visibility. |
| WR-UX-002 | Medium | Several visible actions were dead or fictional, including analytics export, multi-job details, AI headshot, and unimplemented referral rewards. | Working export/details were implemented; dead controls and unsupported rewards/statistics were removed or relabeled. |

## Important implementation boundaries

- Tailoring treats original resume data as authoritative. The model may rewrite narrative, but cannot create identities, protected dates/organisations, source-absent skills, URLs, or unsupported numeric claims.
- Public shares and feedback are function-only. The coordinated migration intentionally removes legacy direct browser permissions.
- Credit reservation happens before expensive/provider work and is refunded on every validated failure path. Concurrent identical job imports receive a pending response instead of a second charge/provider call.
- ATS/readiness and job-match values are product heuristics, not guarantees about every external hiring system.
- PDF rendering accepts only an authenticated user, applies server-side entitlement, blocks external requests and page JavaScript, and enforces bounded work.

## Verification evidence

| Check | Result |
|---|---|
| Full Vitest | 212 files passed, 1 skipped; 1,190 tests passed, 1 todo. One concurrent teardown hook timed out; the affected 8-test export file then passed in isolation. |
| Backend hub tests | All 44 test files passed. One company-briefing expectation was updated to match the new source-gating contract and rerun green. |
| TypeScript | `tsc --noEmit` passed |
| Whole-repository lint | `npx eslint .`: 0 errors, 0 warnings |
| Production build | Vite transformed 5,883 modules and built successfully; no source maps in `dist` |
| Server build | `dist/server.mjs` bundled successfully (61.6 kB) |
| Dependency audit | `npm audit --audit-level=high`: 0 vulnerabilities |
| Arabic coverage | 13 critical surfaces localized; catalog parity and placeholder checks passed |
| Focused truthfulness UI/locale tests | 54 passed |
| Focused AI/resume-section truthfulness tests | 9 passed |
| PDF | Product page-plan/render fixture produced two readable Letter pages; PDF metadata reported no JavaScript |
| Visual UI | Production/local desktop comparison, mobile menu, and Arabic `lang=ar`/`dir=rtl` with no horizontal overflow passed |

Evidence files:

- `Project Atlas/assets/export-audit/landing-comparison.png`
- `Project Atlas/assets/export-audit/landing-mobile-menu.png`
- `Project Atlas/assets/export-audit/pdf-export-1.png`
- `Project Atlas/assets/export-audit/pdf-export-2.png`

Expected build warnings: several existing application chunks exceed Vite's 500 kB advisory threshold. This is a performance follow-up, not a failed build or security bypass.

## Known residuals

1. **Production remains unchanged.** Every locally fixed production-relevant vulnerability remains present until its matching schema/function/API/frontend release is completed.
2. **Semantic AI limits.** Deterministic reconciliation can prove protected-field, skill, and metric grounding; metric-free qualitative prose remains prompt-constrained and cannot be fully proven by string-level validation.
3. **WiseHire invite UX.** The server securely supports invited signup, but public signup pages still need to carry the invite through authentication before the user journey is complete.
4. **Distributed throttling.** Some older provider/runtime throttles remain process-local; security-critical public-share guessing uses persistent storage. A shared limiter is recommended for uniform multi-instance abuse control.
5. **Authenticated visual QA boundary.** The active in-app production browser belonged to another user and offered no isolated/incognito session, so signing in with the supplied test account could replace a real session. Protected flows were covered by component/integration/hub tests; isolated staging browser smoke tests remain required and are not reported as passed here.
6. **External-system limits.** Resume readiness and keyword alignment are transparent product heuristics, not a guarantee that every employer ATS will parse, rank, or select a resume identically. The recorded visual checks are not a formal WCAG certification or an exhaustive browser/device matrix.
7. **Bundle size.** Existing OCR/document-export/dev-tool chunks trigger Vite's advisory warning and should be profiled/code-split separately.
8. **Intentional unavailable product areas.** Online plan payment and custom portfolio domains remain visibly marked unavailable/coming soon; they were not fabricated during this audit because they require external billing/domain provisioning decisions.
9. **Public avatar delivery.** Avatar files remain readable by anyone who has the hard-to-guess direct URL so public portfolios and exported documents can render them without a session. The UI now discloses this, URLs are random, and removal deletes the stored file, but a private/public-copy architecture would be required for strict unpublished-avatar confidentiality.

## Coordinated release plan

Do not deploy only the frontend or only one side of the share/credit contracts.

1. Back up current Appwrite collection definitions/permissions and confirm required secrets without logging secret values.
2. Run the idempotent schema reconcilers for AI credits, discount/coupon redemption, remote jobs, WiseHire, AI runtime receipts, and resume-share security. Repair any resume with a missing/invalid owner before removing legacy share permissions.
3. Deploy the changed hubs through the explicit-target workflow: `ai-gateway`, `resume-section-ai`, `job-import`, `public-share`, `coupons`, `email-service`, `wisehire-gateway`, `job-feed-sync`, and `admin-devkit-data` where runtime-receipt/support changes require it.
4. Deploy the PDF API/server and frontend in the same maintenance window as the share migration. Confirm the purpose-specific public-share token secret is present, 32+ characters, and distinct from the Appwrite API key.
5. Run staging smoke tests for: share create/open/password/wrong-password throttle/revoke/comment; coupon max-use/replay; WiseHire invited and non-invited signup; OTP fifth-attempt/concurrency; safe and blocked job imports; AI disclosure/redaction/credit/refund/idempotency; tailoring protected facts; Letter/A4/one-page/Premium branding exports; English and Arabic layouts.
6. Inspect safe runtime receipts and credit totals for one controlled request per AI hub. Do not record prompts, tokens, contact data, or resume content in the evidence.
7. Promote only after staging passes, then repeat read-only production smoke checks and monitor authorization, rate-limit, credit, provider, and PDF-render errors.

## Rollback guidance

- Keep the previous frontend/API/hub artifacts available.
- If share rollout fails, restore the previous application and collection permissions together; never leave a new direct-read client against server-only collections or a legacy client against the new function-only contract.
- If credit/schema reconciliation fails, stop AI traffic before rollback to avoid double charging or divergent counters.
- Schema rollback must be permission-aware and reviewed; do not delete migrated token/password hashes or transaction records as an automatic rollback step.
