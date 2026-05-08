# admin-config

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/admin-config/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` (Task #52)

---

## What it does

Consolidated router for the 5 legacy admin configuration functions. Replaces (5 → 1):

- `get-settings` ← was `admin-get-settings`
- `update-settings` ← was `admin-update-settings`
- `feature-flags` ← was `admin-feature-flags`
- `integrations` ← was `admin-integrations`
- `env-check` ← was `admin-env-check`

**Auth:** `requireAdminAuth` runs ONCE at the top of `serve` for all actions.

## Dispatch

- **Primary:** `body.action` ∈ `{"get-settings","update-settings","feature-flags","integrations","env-check"}`
- **Fallback:** `x-admin-config-action` request header — used when the inner handler also reads its own `body.action` (feature-flags inner: `list/upsert/delete`; integrations inner: `get_resend_bounces/get_deploy_status/trigger_deploy`).

## Parity behavior

The router buffers the body once as text and hands the text string to each handler. Each handler does its own `JSON.parse` so per-handler error envelopes (success:false vs Internal server error) match the originals byte-for-byte.

**Single documented deviation:** auth runs before body parse, so unauthenticated calls with malformed body now return 401 instead of 500. CI Playwright spec asserts the new behavior.

## DB tables / external services

- `app_settings` (get/update), `feature_flags` (feature-flags inner)
- Resend (bounces report), GitHub Actions API (deploy status / trigger)
- `invalidateOpenRouterAdminCache()` called after `update-settings` for known AI-routing keys

## Critical

`env-check` masking surface is security-sensitive — do NOT add or remove keys from `REQUIRED_ENV_VARS` without owner sign-off.
