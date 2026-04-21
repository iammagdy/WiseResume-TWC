# Phase 8 — Production Edge-Function Routing

**Last verified:** 2026-04-21
**Type:** stability fix
**Sources:**
- `src/lib/apiFnUrl.ts` (new)
- `src/lib/supabaseBridge.ts`
- `src/lib/edgeFunctions.ts`
- `src/integrations/supabase/edgeFunctions.ts`
- `supabase/config.toml` (`[functions.token-exchange] verify_jwt = false`)
- `supabase/functions/_shared/cors.ts` (allow-list includes `https://resume.thewise.cloud`)
- `public/.htaccess` (`connect-src` includes `https://*.supabase.co`)
- `CHANGELOG.md` 2026-04-21 "Fix sign-in on live site"

**Canonical owner:** `project-governance/ARCHITECTURE.md` §4 (Auth + Edge Functions)

---

## Why it exists

Every client call to a Supabase edge function — starting with the Kinde→Supabase auth bridge — used to be hard-coded to a relative `/api/fn/<name>` URL. That worked in dev because Vite proxies it to the Express server on `:5001`, which verifies the Kinde token and forwards to Supabase. It silently fell through to `index.html` on Hostinger because the static SPA host has no `/api/*` handler, so the bridge's `res.json()` threw on HTML, the exchange was marked failed, and `ProtectedRoute` displayed "Sign-in incomplete" to every user.

The pattern existed in v3.4 too but was masked by a stale-deploy bug (Task #29). Once the FTPS-transport fix actually shipped v3.5 to live, the latent routing bug surfaced.

## How it works now

A single helper, `apiFnUrl(fnName)`:

```ts
if (import.meta.env.DEV) return `/api/fn/${fnName}`;          // dev → Express :5001
const base = SUPABASE_URL?.replace(/\/+$/, '');
if (!base) return `/api/fn/${fnName}`;                        // safety fallback
return `${base}/functions/v1/${fnName}`;                      // prod → Supabase direct
```

All 17 client call sites import and use it. The dev path is byte-identical to the previous behaviour, so the Express server's local-only profile-upsert side effects continue to fire locally and the dev workflow is unchanged.

## Why no `apikey` header is needed

- `token-exchange` is configured `verify_jwt = false` in `supabase/config.toml`, so Supabase's gateway lets the request through on a `Authorization: Bearer <kinde-token>` header alone. Kinde verification happens inside the function via JWKS.
- Every other edge function is `verify_jwt = true` and the existing call sites already attach `Authorization: Bearer <bridge-supabase-jwt>`, which Supabase accepts in lieu of the anon key.
- CORS already allow-lists `https://resume.thewise.cloud` (`supabase/functions/_shared/cors.ts`).
- CSP `connect-src` in `public/.htaccess` already includes `https://*.supabase.co`.

## Why not an `.htaccess` proxy

`RewriteRule ^api/fn/(.*)$ https://.../functions/v1/$1 [P,L]` was rejected because:
1. Requires `mod_proxy` + `mod_proxy_http`, which Hostinger shared hosting often disables.
2. Adds a Hostinger→Supabase hop — extra latency and a single point of failure.
3. Obscures the request origin from Supabase's CORS / rate-limit logic.

The direct-call path is architecturally correct: the Express server was always a dev-experience convenience, never a load-bearing production component.

## Failure surface (post-fix)

| Scenario | Result |
| --- | --- |
| `VITE_SUPABASE_URL` missing in prod build | Helper falls back to `/api/fn/...` → Hostinger 200 HTML → bridge fails loudly with the same "Sign-in incomplete" card. We see the failure immediately rather than silently routing somewhere wrong. |
| `verify_jwt = true` flipped on `token-exchange` by accident | Supabase gateway returns 401 before the function runs; bridge fails loudly. |
| CORS allow-list pruned | Browser blocks the call; bridge fails loudly. |
| CSP `connect-src` pruned | Browser blocks the call; bridge fails loudly. |

## Verification

- `tsc --noEmit -p tsconfig.json` — clean.
- `vite build` — clean, 47s.
- `grep -rn '/api/fn/' src/` — only `apiFnUrl.ts` lines 22 and 26 (dev branch + safety fallback).
- Live `curl -i -X POST https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/token-exchange` returns `401 {"code":"MISSING_AUTH_HEADER"}` (without auth) and `401 {"code":"INVALID_KINDE_TOKEN"}` (with a fake Bearer) — confirming the function is reachable and behaves as expected for the bridge.
