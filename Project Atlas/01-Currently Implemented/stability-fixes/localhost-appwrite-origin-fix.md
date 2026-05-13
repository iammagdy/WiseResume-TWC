# Localhost Appwrite Origin Fix

**Last verified:** 2026-05-13
**Type:** stability fix
**Sources:**
- `src/main.tsx`
- `src/pages/AuthPage.tsx`
- `src/lib/appwrite.ts`
- Appwrite response headers from `https://fra.cloud.appwrite.io/v1`

**Canonical owner:** `Project Atlas/MASTER_HANDOVER_2026.md`

---

## Problem

Local sign-in failed with the browser toast `Failed to fetch` when the app was opened on `http://127.0.0.1:5000/auth`.

## Verified root cause

The failure was not caused by invalid credentials, a bad Appwrite endpoint, or the local Express server.

The Appwrite project accepts `http://localhost:5000` as a registered Web platform origin, but rejects `http://127.0.0.1:5000`.

Verified directly against the live Appwrite endpoint:

- `Origin: http://127.0.0.1:5000` returned `403 general_unknown_origin`
- message: `Invalid Origin. Register your new client (127.0.0.1) as a new Web platform`
- `Origin: http://localhost:5000` returned normal CORS headers with `Access-Control-Allow-Origin: http://localhost:5000`

Because `AuthPage` talks to Appwrite directly from the browser, the browser surfaced the network-level block as `Failed to fetch`.

## Fix

Added an early DEV-only redirect in `src/main.tsx`:

- if the app is opened on `127.0.0.1`
- rewrite the current URL to `localhost`
- preserve path, query string, and hash
- redirect before any Appwrite auth or data calls run

This keeps local development aligned with the Appwrite Web platform configuration without changing production behavior.

## Scope

- Affects local development only
- No production behavior change
- No Appwrite schema or function changes

## Verification

- Confirmed Appwrite rejects `127.0.0.1` and accepts `localhost`
- Added the redirect before React bootstraps the app
- Local frontend and API server remained healthy after the change
