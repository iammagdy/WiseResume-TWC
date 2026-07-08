# Executive Summary

## Overall status

**PARTIAL — not ready for launch certification.** TypeScript passes and the repository has substantial unit coverage, but one P1 user-flow break and one P1 deployment-safety defect are confirmed. Production browser QA, authenticated flows, Appwrite permissions, environment variables, and live function versions remain `UNKNOWN`.

## Top risks

| Rank | Severity | Risk |
|---|---|---|
| 1 | P1 | Upload-by-URL posts to missing `/api/fetch-url`; the route is absent under `api/`. |
| 2 | P1 | Appwrite manual deploy defaults to `all`, contradicting the explicit targeted-deploy safety rule. |
| 3 | P1 | Production critical flows have no current browser evidence from this run. |
| 4 | P2 | Public visit completion accepts an unbound client-supplied `visitDocId`. |
| 5 | P2 | Credit increments are read-modify-write and may lose updates under concurrent AI calls. |
| 6 | P2 | Separate AI hubs duplicate gateway routing/credit policy, increasing drift risk. |
| 7 | P2 | Atlas route/file contracts are stale (`/portfolio/editor`, `/preview/:id`, old file names/workflow). |
| 8 | P2 | Custom-domain behavior is active in routing while Atlas calls it Coming Soon/manual. |
| 9 | P2 | Public/server environment and Appwrite permission state cannot be proven from source alone. |
| 10 | P2 | Lint/test completion was not obtained; build passes with 1.47 MB and 1.02 MB heavy feature chunks. |

## Top user-facing bugs

1. P1: URL resume import cannot succeed against this repository deployment because `/api/fetch-url` does not exist.
2. P2: Atlas describes `/portfolio/editor`, but the application route is `/portfolio`.
3. P2: Atlas describes `/preview/:resumeId`; application routing uses `/preview` and state/query behavior.
4. P2: Feature-gated routes redirect with toast-only explanation, which is weak for accessibility and deep-link recovery.
5. P2: Arabic catalog parity test fails because `topBar.notifications` is missing; protected Arabic route parity is also unclear.
6. P2: Public custom-domain portfolio routing can activate globally for any non-app hostname, while its operational state is unclear.
7. P3: QR scanner copy/status feedback is toast-only.
8. P3: Several product surfaces expose broad feature density inconsistent with Atlas progressive disclosure goals.
9. UNKNOWN: LinkedIn/OAuth production success.
10. UNKNOWN: PDF/DOCX export download integrity, Arabic output, and selected-template fidelity.

## Top backend/integration risks

1. P1: deploy workflow defaults to all hubs and runs broad schema setup.
2. P2: missing Vercel `/api/fetch-url` contract.
3. P2: `track-portfolio-view` update does not bind `visitDocId` to username/session token.
4. P2: AI usage counters are non-atomic read-modify-write operations.
5. P2: `resume-section-ai` and `job-import` independently implement auth, credits, idempotency, and provider fallback.
6. P2: source documentation names `.github/workflows/deploy-ai-hubs.yml`, which does not exist.
7. UNKNOWN: deployed source hashes match current sources.
8. UNKNOWN: required Appwrite attributes/indexes and `documentSecurity` settings match setup scripts.
9. UNKNOWN: function execute permissions are auth/public as intended.
10. UNKNOWN: Resend, Turnstile, Sentry, provider keys, and HMAC secrets are configured consistently.

## Top UI/UX issues

1. No accepted screenshots were captured; visual conformance is unverified.
2. Route/spec drift makes navigation and support documentation unreliable.
3. Toast-only feature-gate feedback disappears after redirect.
4. Large protected route catalog increases navigation and information-density risk.
5. Arabic route parity is inconsistent.
6. Loading skeleton coverage is broad, but real error/empty-state quality is unverified.
7. Responsive behavior at 390×844 is unverified.
8. Keyboard/focus behavior for sheets/dialogs is unverified.
9. Dark/light and RTL visual consistency is unverified.
10. Premium/free copy consistency is unverified with billing intentionally disabled.

## Top security/privacy concerns

1. Public visit updates trust a client-provided document ID.
2. In-memory API rate limits are per-instance and not durable across serverless scaling.
3. Multiple server surfaces hold Appwrite API keys; live scopes need console verification.
4. Public portfolio payload sanitization is implemented in multiple places and can drift.
5. Job URL ingestion is an SSRF-sensitive surface requiring allow/deny and redirect tests.
6. Public contact/chat endpoints depend on Turnstile and shared secrets whose live state is unknown.
7. Admin deployment capability has high blast radius and needs strict execute permissions.
8. Impersonation depends on correctly paired HMAC secrets and server-only collections.
9. File parsing/OCR executes on untrusted documents and needs resource-limit browser tests.
10. QR and external-link handling needs continued scheme allowlisting; current URL detection is HTTP(S)-only and safe in the inspected scanner path.

## Safe based on code evidence

- Appwrite JWT validation is present in `job-import` and `resume-section-ai`.
- Both separate AI hubs implement credit checks, rate limits, and idempotency logic.
- Public portfolio code intentionally filters sensitive fields.
- QR scanner URL classification only promotes `http`/`https` to a clickable URL.
- TypeScript completed with exit code 0.

## Blocked / unknown

- Browser QA, authenticated flows, downloads, OAuth, Turnstile, Appwrite Console permissions, live hashes, live secrets, provider fallbacks, cold starts, and real mobile/RTL behavior.

## Deployment/manual requirements

- Fixing `/api/fetch-url` requires a Vercel deployment.
- Fixing the workflow requires workflow review only; do not run it until the default-all behavior is removed.
- Credit atomicity or visit-token changes may require Appwrite hub/Vercel deployment and possibly schema support.
- Appwrite Console verification is required for execute permissions, collection permissions, indexes, and environment variables.

## Recommended order

1. Batch 1: repair URL import contract and remove default-all deployment behavior.
2. Batch 2: bind portfolio visit updates, harden durable rate limits, and verify production Appwrite permissions/secrets.
3. Batch 3: run authenticated desktop/mobile/Arabic browser QA and export evidence.
4. Batch 4: reconcile Atlas route/function/deployment documentation.
