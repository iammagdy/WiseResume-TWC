# Operational scripts

Small, dependency-free Node scripts that run in CI and locally to keep the
edge function deploy honest. None of these touch user data or burn AI credits;
they probe public surface only.

| Script | Purpose | Auth required |
| --- | --- | --- |
| `check-edge-functions-deployed.mjs` | Compare `supabase/functions/` against the project's deployed function list via Management API. Fails if any local function never shipped. | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` |
| `smoke-test-edge-functions.mjs` | Probe every admin function + the 5 high-traffic public functions for CORS preflight + 401-on-no-auth + 400-on-bad-action (multi-action routers). | None — fully unauthenticated. |
| `check-supabase-migration-drift.mjs` | Detect SQL migrations that exist locally but were never applied to production. | `DATABASE_URL` |
| `check-no-sourcemaps.mjs` | Build-time guard: fail the build if `dist/` ships any `.map` files. | None |
| `copy-pdf-ocr-assets.mjs` | Pre-build copy step for pdf.js / Tesseract worker assets. | None |

## Smoke test (`npm run smoke:functions`)

Runs after every successful deploy in
`.github/workflows/deploy-edge-functions.yml`. You can also run it locally any
time to confirm production is healthy:

```bash
npm run smoke:functions
# or, against a different project:
SUPABASE_PROJECT_REF=otherref npm run smoke:functions
```

### What it checks

42 edge functions, ~98 individual checks, in three phases:

1. **CORS preflight (OPTIONS)** — every function must return 200/204 with
   `Access-Control-Allow-Origin: https://resume.thewise.cloud` and
   `Access-Control-Allow-Methods` containing `POST`.
2. **Multi-action router dispatch** — `parse-job`, `admin-devkit-data`, and
   `admin-email` must reject missing/unknown `action`/`module` with a 400
   whose body matches the documented error message.
3. **Per-route auth** — every function must return 401 (or 500 with an
   authorization-related message in the body, for the documented "AuthError
   leaks past `wrapHandler` as 500" pattern) when called with no Bearer
   token.

### Expected "green" output

```
[smoke-test-edge-functions] base: https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1
[smoke-test-edge-functions] origin: https://resume.thewise.cloud
[smoke-test-edge-functions] timeout: 15000ms
[smoke-test-edge-functions] concurrency: 10
[smoke-test-edge-functions] coverage: 42 functions

[1/3] CORS preflight (OPTIONS) — 42 functions must accept https://resume.thewise.cloud
  [PASS] parse-job: CORS preflight — 200 https://resume.thewise.cloud
  ... (42 lines) ...

[2/3] Top-level dispatch — 5 multi-action 400-checks
  [PASS] parse-job rejects missing action — 400 "action is required: ..."
  ... (5 lines) ...

[3/3] Per-route auth — 51 routes must return 401 (or 500-with-auth-message) when called without auth
  [PASS] parse-job/url — 401 "Missing authorization header"
  [PASS] parse-job/linkedin — 500 (known auth-leak) "Missing authorization header"
  [PASS] admin-list-users — 401 "Unauthorized"
  ... (51 lines) ...

[smoke-test-edge-functions] 98/98 checks passed
[smoke-test-edge-functions] OK — all 42 functions responded as expected.
```

### Exit codes

| Exit | Meaning |
| --- | --- |
| `0` | Every check passed. |
| `1` | At least one check failed. The trailing `FAIL — N check(s) failed:` block lists each failed route with `expected vs actual status` and a body excerpt so the cause is obvious from the workflow log. |
| `2` | Configuration / network error before any check could run (DNS, totally unreachable host, malformed env). |

### Common failure causes

- **`status=404`** — the deploy didn't roll that function out. Re-run the
  "Deploy Supabase Edge Functions" workflow, or check that the function
  directory is actually present in `supabase/functions/`.
- **`status=500` with no auth-related message** — the function is crashing
  at startup. Check the Supabase Dashboard logs for that function.
- **`acao=(missing)`** — the CORS allow-list in
  `supabase/functions/_shared/cors.ts` no longer permits
  `SMOKE_TEST_ORIGIN` (default `https://resume.thewise.cloud`).
- **`status=400 expected=401`** — a multi-action router stopped enforcing
  auth on one of its branches. Inspect that function's `requireAuth` /
  `requireAdminAuth` placement.

### Adding a new function to the smoke test

Open `scripts/smoke-test-edge-functions.mjs` and append to `FUNCTIONS`:

- **Single-action function** (one CORS + one 401 check):
  ```js
  { name: 'my-new-function' },
  ```
- **Multi-action router** (CORS + per-route auth + dispatch validation):
  ```js
  {
    name: 'my-router',
    routes: [
      { body: { action: 'foo' }, label: 'my-router/foo' },
      { body: { action: 'bar' }, label: 'my-router/bar' },
    ],
    dispatchChecks: [
      {
        label: 'my-router rejects missing action',
        body: {},
        expectStatus: 400,
        expectErrorIncludes: 'action is required',
      },
    ],
  },
  ```

If a function's auth gate sometimes returns 500 instead of 401 (because
`requireAuth` is thrown outside the local try/catch and `wrapHandler`
re-emits it as 500), opt that route in explicitly with
`allowAuthLeakAs500: true`. The default is `false` (strict) — any 500 to
an unauthenticated POST fails the smoke test unless explicitly opted in,
and even then the body must mention `authorization`/`unauthorized`. A
bare 500 with no authorization-related body text is always a fail. Today
the opted-in routes are: `parse-job/linkedin`, `score-resume`,
`analyze-resume`, `generate-cover-letter`, and `agentic-chat`. When their
`requireAuth` calls are eventually moved inside the local try/catch, the
opt-in becomes a no-op and the smoke test tightens automatically.

### Out of scope

Authenticated probes (admin-only data shapes, AI calls, email sends, write
operations) are intentionally excluded — they need real DevKit credentials,
cost money, and risk side effects. If we ever want them, they belong in a
separate workflow gated on `workflow_dispatch` only.
