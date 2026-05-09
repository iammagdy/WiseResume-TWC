# Replit Preview Login Fix — 2026-05-09

**Last verified:** 2026-05-09
**Type:** bug fix
**Sources:**
- `src/hooks/usePublicPortfolio.ts` — `isAppHostname()`
- `src/AppInterior.tsx` — `customDomainHostname` logic (line 238)
- Appwrite project `69fd362b001eb325a192` — Web Platforms

---

## Symptoms

1. Opening any path in the Replit preview (e.g. `/auth?mode=login`) showed "Portfolio not found for this domain" — the full-page portfolio-not-found fallback rendered instead of the normal app.
2. After the first bug was fixed, attempting to sign in produced a browser toast "Failed to fetch" and no session was created.

---

## Root causes

### Bug 1 — Wrong hostname classification

`AppInterior.tsx` line 238:
```ts
const customDomainHostname = !isAppHostname(window.location.hostname)
  ? window.location.hostname
  : null;
```
When `customDomainHostname` is non-null the entire render tree is replaced by `<CustomDomainPortfolioWrapper>`. `isAppHostname()` only listed `localhost`, `127.0.0.1`, and `thewise.cloud` — Replit preview domains (`*.replit.dev`, `*.picard.replit.dev`) were treated as custom portfolio domains.

### Bug 2 — Unregistered Appwrite Web Platform

Appwrite v1.9 rejects auth requests (`POST /v1/account/sessions/email`) from browser origins not registered as a Web Platform for the project, returning `403 general_unknown_origin`. `*.replit.dev` had never been added to the project.

---

## Fixes applied

| # | File / Resource | Change |
|---|-----------------|--------|
| 1 | `src/hooks/usePublicPortfolio.ts` | Added `'replit.dev'` and `'replit.co'` to the `isAppHostname()` allowlist |
| 2 | Appwrite project platforms | Registered `*.replit.dev` as a Web Platform via `POST /v1/projects/69fd362b001eb325a192/platforms` (platform id `69ff12a22ab4a137e3b0`) |

---

## Verification

- `/auth?mode=login` in Replit preview renders the sign-in form correctly.
- `curl POST /v1/account/sessions/email` with `Origin: https://*.replit.dev` now returns `401 user_invalid_credentials` (correct — wrong test password) instead of `403 general_unknown_origin`.
