# Appwrite remediation — schema, permissions, targeted hub deploy + smoke tests (2026-06-23)

**Last verified:** 2026-06-23
**Type:** stability-fix reference card (production runbook record)
**Branch / PR:** `claude/serene-ride-nk2c6t` / PR #122 (executes the post-merge runbook of the already-merged PR #120)
**Environment:** PRODUCTION — Appwrite project `69fd362b001eb325a192`, database `main`
**Sources:**
- `scripts/setup_tailoring_lineage_schema.cjs`, `scripts/setup_visitor_events_schema.cjs`, `scripts/setup_audit_logs_collection.cjs`
- `appwrite-hubs/track-visitor-event/src/main.js`, `src/lib/auditLogger.ts`
- `scripts/deploy_hubs.cjs`, `.github/workflows/deploy-appwrite-hubs.yml`
- Live Appwrite inspection via the Appwrite MCP (`tables_db_*`, `functions_*`)

**Canonical owner:** Project Atlas maintainer.

---

## Scope

Applied the additive Appwrite **schema + permission + targeted-deploy** half of the
PR #120 remediation that could not run in the PR's CI (no Appwrite egress there).
Everything here is **additive and reversible-safe**: no collection/attribute was
deleted, no permission was loosened beyond the two intended grants, `admin_audit_logs`
was not touched, and only the four named functions were deployed (never `target=all`).

---

## 1. Schema (additive — all attributes optional, all reached `available`)

| Collection | Added | Already present (left as-is) |
| :- | :- | :- |
| `tailor_history` | `tailor_result`(65535), `source_resume_id`(36), `job_title`(256), `company`(256), `job_url`(2048), `job_description`(5000), `applied_sections`(2048), `intensity`(32), `status`(32), `score_before`(int 0–100), `score_after`(int 0–100) | `tailored_resume_id`(36) + `tailored_resume_id_idx`; `user_id` |
| `visitor_events` | `referrer`(512), `os`(32) | 11 existing columns |
| `audit_logs` | `anon_id`(64); key index `category_idx` on `category` | `user_id`, `action`, `category`, `metadata`, `action` index |

Existing attributes were detected and skipped (additive-only). `category`/`metadata`
on `audit_logs` already existed at larger sizes (128 / 4000) than the script's
nominal 32 / 8192 and were left unchanged — Appwrite cannot resize in place and the
larger sizes are harmless.

## 2. Permissions

- **`audit_logs`** collection permission set to **`create("users")`**, `rowSecurity = false`,
  **no read role** (reads happen server-side via the API key in `admin-onboarding-funnel`).
  - Root cause it fixes: the collection already existed but with **empty permissions**,
    so the **client-side** `logAudit()` writes (`src/lib/auditLogger.ts`, which writes with
    the authenticated user session) were rejected — leaving the onboarding funnel empty
    ("all unknown"). This is the only collection-permission change made.
  - **`admin_audit_logs` (admin actions) was NOT modified** — it is a different collection.

## 3. Functions deployed (only these four — never `target=all`)

`track-visitor-event`, `ai-gateway`, `admin-onboarding-funnel`, `admin-devkit-data`.

- **`track-visitor-event`** did not exist in Appwrite and was **not registered in
  `deploy_hubs.cjs`** (the PR #120 source added the function but not its deploy entry),
  so `--only=track-visitor-event` errored `Unknown hub id`. PR #122 additively:
  - adds it to the `HUBS` registry, and
  - adds a `syncVariablesForHubs` branch that sets its `APPWRITE_API_KEY` variable from
    the deploy secret (databases write), keeping the key server-side.
  - Execute permission is forced to **`any`** by `desiredFunctionSettings` (guests must
    call it pre-login). Deployed via the **Deploy Appwrite Hubs** workflow with
    `target=track-visitor-event`.
- **`ai-gateway` / `admin-onboarding-funnel` / `admin-devkit-data`** were redeployed from
  the branch source (fresh tarball builds); all live and healthy.

### `track-visitor-event` API-key note
On this Appwrite instance the **dynamic function key** (`APPWRITE_FUNCTION_API_KEY` via
function `scopes`) is **not injected** — the function returned `500 "APPWRITE_API_KEY is
not configured"` with scopes alone. Existing `APPWRITE_API_KEY` variables are stored
`secret:true` (unreadable) and there is no project-key-mint tool, so the working value
was injected from the repo's `APPWRITE_API_KEY` secret by the deploy workflow (never
exposed). The static variable is what the function uses at runtime.

## 4. `ai-gateway` Appwrite VCS "Build failed" — investigation

- The repeated red "Build failed" statuses are **Appwrite git-integration (`type:vcs`)
  auto-builds** (`buildSize:0`, logs aborting at "Build cache hit → Environment preparation
  finished"). They are **transient/infra, decoupled from production**: the identical source
  **builds cleanly via tarball** (manual + workflow deploys are `ready`), and the live
  deployment always served a healthy build.
- The VCS build re-fires on **every push** because the Appwrite GitHub App re-attaches the
  function's git connection at push time — clearing the function-level provider fields
  (via `functions_update` or the managed deploy) does **not** durably stop it. The durable
  fix is **Console-side**: ai-gateway → Settings → Git → Disconnect, or remove the Appwrite
  GitHub App's repo access. This is cosmetic (real CI is green; production unaffected).

## 5. Smoke tests

1. **Visitor pipeline — PASS.** A `track-visitor-event` execution returned
   `200 {"ok":true,"written":1}` and a `visitor_events` row landed with `referrer` and
   `os` populated. The collection was empty (0 rows) beforehand — confirming the old
   browser-direct writes were all silently rejected (the bug this function fixes). DevKit
   Visitors now populates; floods are `skipped:'rate_limited'`.
2. **Onboarding funnel — root cause fixed; breakdowns populate over time.** `audit_logs`
   is now writable by `role:users` and carries `category`/`metadata`/`anon_id` + a
   `category` index. Historical rows are absent (writes were rejected before), and the
   funnel read path needs DevKit auth, so non-`unknown` breakdowns appear as authenticated
   users generate onboarding events post-fix.
3. **ai-gateway — deployed & healthy.** The "honest score" change (no fixed 55→78; returns
   `null` → real client compute) is live; the deploy's own smoke probe returned
   `Smoke ai-gateway: HTTP 200`. The end-to-end `tailor-resume`/`agentic-chat` paths need
   an authenticated user session + credits — verify from the app.
4. **No "unknown attribute" 400s — resolved.** Every collection now carries the attributes
   its writers use; the function also strips unknown optional fields and retries.

## Follow-ups for the owner (config, not code)

- **Disconnect ai-gateway's Appwrite Git integration** in the Console to stop the cosmetic
  red "Build failed" statuses on future pushes (see §4).
- The single synthetic `visitor_events` smoke row (a `page_view` to `/`) was left in place
  (no data deletion); remove it if undesired.
