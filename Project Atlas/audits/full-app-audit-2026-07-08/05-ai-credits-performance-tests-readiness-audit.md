# AI, Credits, Performance, Tests, and Readiness

## AI reliability

- DeepSeek-first defaults are represented in gateway/catalog code, with Groq/OpenRouter/NVIDIA fallbacks.
- Separate `resume-section-ai` and `job-import` pools duplicate this logic.
- Both separate hubs now include auth, credits, rate limiting, and cross-instance idempotency caches; Atlas text claiming no credit lock is stale.
- Malformed JSON, unchanged output, provider timeout, fallback visibility, and prompt-injection outcomes require live contract tests; status is `UNKNOWN`.

## Finding P2-AI-01 — Credit charging can lose concurrent increments

See P2-BE-03. This affects free/Pro limits and total usage accuracy. Premium `-1` unlimited behavior exists in code but needs live plan-document verification.

## Performance

- Route-level lazy loading is extensive.
- Production build passes, but warns about chunks over 500 kB. Largest observed: `doc-export` 1,471.86 kB, `ocr` 1,018.99 kB, and `DevToolsPage` 539.13 kB (minified). Real mobile performance remains `UNKNOWN`.
- Client-side PDF.js, Mammoth, OCR, HTML capture, and export are inherently heavy; test large documents on low-memory mobile devices.
- Appwrite/Vercel cold starts and public portfolio latency are `UNKNOWN`.

## Tests

- 198 `test/spec` files were inventoried across source, root tests, and hubs.
- `npx tsc --noEmit`: PASS, exit 0.
- `npm run build`: PASS in 2m31s; 5,815 modules transformed; no source maps; large-chunk and stale Browserslist-data warnings.
- `npm run lint`: TIMEOUT after 184s; no pass claim.
- `npx vitest run --reporter=dot`: FAIL after 212.34s. 155 files passed, 3 failed, 1 skipped; 910 tests passed, 2 failed, 1 todo.
- Failures: Arabic/English catalog parity (`topBar.notifications` missing from Arabic), OTP password-reset test preview expected success but received none, and Puppeteer export suite `afterAll` timeout while closing the browser.
- Playwright was not run because the product-design browser procedure requires approval before standalone Playwright fallback after in-app browser failure.
- Critical missing/required tests: missing API contract detection, workflow no-`all` guard, credit concurrency, SSRF redirect/private-IP matrix, visit completion binding, authenticated export download, Arabic export, tailoring unchanged-output, and live route smoke tests.

## Production readiness classification

**PARTIAL**

Not `READY_FOR_BROAD_USER_TESTING` because a confirmed P1 flow break and P1 deploy hazard remain. After Batch 1, successful build/lint/unit/hub tests and Appwrite console checks, the next valid state is `READY_FOR_OWNER_VERIFICATION`, followed by broad authenticated browser testing.

## Finding P2-TEST-02 — Current unit suite is red

Severity: P2  
Area: Localization/auth/export test reliability  
Evidence: Vitest summary above.  
Impact: Arabic notification copy parity is demonstrably incomplete; password-reset preview behavior may have drifted; export capture tests can hang in cleanup.  
Recommended fix: Restore catalog parity, reconcile OTP preview response contract, and make Puppeteer setup/teardown deterministic. Re-run the full suite before any readiness promotion.  
Deployment required: Vercel/Appwrite depends on root cause. Browser QA: Yes for Arabic notification and password reset.
