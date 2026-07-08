# Security, Privacy, Abuse, and Permissions Audit

## Finding P2-SEC-01 — Public visit updates are not bound to the original visit

Severity: P2  
Area: Public portfolio analytics  
User impact: A party possessing another visit document ID can overwrite its timing and section fields.  
Backend/Appwrite impact: Integrity loss in `portfolio_visits`; analytics may be corrupted.  
Evidence: `api/track-portfolio-view.ts:195-203` accepts `action=visit_end` and directly calls `updateDocument(..., visitDocId, ...)` before resolving or checking `username`. The create response returns `visitDocId` to the browser.  
Files: `api/track-portfolio-view.ts`, `src/hooks/usePortfolioTracking.ts`  
Routes: `/p/:username`, `/ar/p/:username`  
Reproduction: Start a visit, capture its returned ID, then POST `visit_end` using that ID with a different username and altered timing. Production result is `UNKNOWN` until browser/API QA.  
Recommended fix: Issue a signed, short-lived completion token bound to visit ID and username, or re-read and verify immutable ownership fields before update.  
Fix class: Vercel backend.  
Deployment required: Yes, Vercel.  
Manual Appwrite action: No unless a token/nonce attribute is added.  
Browser QA required: Yes.

## Finding P2-SEC-02 — Serverless rate limits are instance-local

Severity: P2  
Area: Abuse controls  
User impact: Attackers can exceed intended limits across cold starts/instances, increasing spam and provider cost.  
Evidence: `api/track-portfolio-view.ts` and AI hubs use module-level `Map` objects for rate limits. Serverless instances do not share this memory.  
Files: `api/track-portfolio-view.ts`, `appwrite-hubs/job-import/src/main.js`, `appwrite-hubs/resume-section-ai/src/main.js`, `appwrite-hubs/ai-gateway/src/main.js`  
Reproduction: Distribute requests across concurrent/cold instances; live verification is `UNKNOWN`.  
Recommended fix: Use an atomic Appwrite-backed window/token bucket or platform rate limit, with IP/user privacy controls.  
Fix class: Backend/schema.  
Deployment required: Appwrite and/or Vercel.  
Manual Appwrite action: Likely.  
Browser QA required: No; API load test required.

## Finding P2-SEC-03 — SSRF-sensitive job fetching needs explicit network-boundary proof

Severity: P2  
Area: Job URL import  
User impact: A bypass could expose internal metadata or make the function scan private services.  
Evidence: `appwrite-hubs/job-import/src/main.js:395,432` performs server-side URL fetches and follows redirects. Authentication exists, but comprehensive private-IP/DNS-rebinding tests were not established in this run.  
Files: `appwrite-hubs/job-import/src/main.js`, `tests/hubs/`  
Routes: `/jobs`, `/tailoring-hub`  
Reproduction: Test loopback, RFC1918, link-local, IPv6, encoded-IP, DNS rebinding, and redirect-to-private targets.  
Recommended fix: Resolve every hop, reject non-public addresses/protocols, cap redirects/body/time, and add regression tests.  
Fix class: Appwrite function.  
Deployment required: Appwrite if gaps are confirmed.  
Manual Appwrite action: No.  
Browser QA required: No.

## Confirmed controls

- `resume-section-ai` validates an Appwrite JWT via `Account.get()` (`main.js:275-290`).
- `job-import` derives the user from the validated JWT rather than trusting the submitted `userId` (`main.js:50-66`).
- Public portfolio implementations contain explicit sensitive-field filtering; exact live payload remains `UNKNOWN`.
- Admin routes are nested under `ProtectedRoute` and `AdminRoute` in `src/AppInterior.tsx:439-443`; function execute permissions remain `UNKNOWN`.
- QR scanner promotes only `http(s)` URLs to links (`src/pages/QrScanPage.tsx:16-25`).

## Manual security verification required

- Appwrite execute permissions for every hub.
- Collection `documentSecurity`, document permissions, indexes, and API key scopes.
- DevKit lockout, Act As issuance/revocation/audit, and no secret/token leakage.
- Public portfolio password brute-force, token expiry, payload sanitization, Turnstile, contact spam, chat prompt injection, and CORS/trusted origins.
- PDF/DOCX/OCR size, decompression/resource exhaustion, malformed files, and export authorization.

