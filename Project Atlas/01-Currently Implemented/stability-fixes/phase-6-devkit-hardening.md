# Phase 6 — DevKit Hardening (2026-04-18)

## Why
The admin DevKit had grown to ~12k LOC across 15 panels. An audit surfaced
several latent problems:
- Any uncaught render error in one panel would unmount the entire DevKit
  shell (sidebar, lock button, tab bar, header) — including the admin's
  unlocked session.
- Background polling (`setInterval`) in `OverviewPanel`, `AnalyticsPanel`,
  `LiveActivityPanel`, and `DeploymentPanel` kept firing edge function calls
  while the admin was on a different tab, burning quota and racing setState
  on an unmounted tree.
- `OverviewPanel` paginated through `admin-list-users` in a `while (true)`
  loop bounded only by the upstream `total` field — a runaway upstream count
  could spin forever.
- Edge function responses were unwrapped via dozens of unchecked
  `as { success?, error? }` casts, so transport failures, missing payloads,
  and `{ success: false, error }` payloads all went down different paths
  (sometimes silently).
- Three `.catch(() => {})` swallows in `UserDetailDrawer` left admins
  staring at empty audit-history / notes / identity tabs with no signal.
- `DevKitRunner` had six `as any` error-parsing casts that drifted from the
  actual edge function error shapes.

## What shipped

### Shared utilities (`src/lib/devkit/`)
| File | Exports | Purpose |
|---|---|---|
| `hooks.ts` | `useIsMounted`, `useAbortOnUnmount`, `useVisibleInterval` | Mount tracking, abort-on-unmount fetch controller, visibility-aware polling |
| `edgeResponse.ts` | `EdgeFunctionError`, `unwrapAdminResponse`, `tryUnwrapAdminResponse`, `formatEdgeError` | One validator for the `{ data, error }` invoke tuple, distinguishing transport errors, missing payloads, `{ success: false }`, and 404 ("not deployed") |

### Crash-safety boundary
`src/components/dev-kit/DevKitPanelBoundary.tsx` wraps the panel-rendering
slot inside `DevToolsPage`. A render error in any panel renders a scoped
"Try again" card; the rest of the DevKit shell stays mounted. The boundary
resets per tab via `key={activeTab}`.

### Per-panel fixes
- **OverviewPanel** — `while (true)` → bounded loop (`MAX_OVERVIEW_PAGES = 50`)
  with `isMounted()` guards between pages; switched to `unwrapAdminResponse`;
  visibility-aware 60 s auto-refresh.
- **AnalyticsPanel** — `unwrapAdminResponse` + unmount guard; clears stale
  data on range change so the chart never shows the wrong window during a
  refresh.
- **UserDetailDrawer** — three silent `.catch(() => {})` replaced with
  logged + toasted errors on `admin-audit-logs`, `admin-save-note (list)`,
  and `admin-get-identity`.
- **DeploymentPanel** — `fetchSweepStatus` now uses an abort-on-unmount
  controller and `isMounted()` guards; suppresses `AbortError`.
- **LiveActivityPanel** — both 30 s polling intervals converted to
  `useVisibleInterval` (pauses while tab hidden, resumes on focus,
  unmount-clean).
- **DevKitRunner** — all six `as any` casts replaced via a typed
  `RunnerError` interface and `toRunnerError(input)` helper.

### Verified already-correct
- `LiveActivityPanel` already gates AI-burning health checks behind an
  explicit "Run health check" button. The 30 s auto-loop only covers the
  lightweight admin functions.
- `PortfolioUsernamesPanel` `UserSearchInput` is debounced at 250 ms.

## Phase 2 follow-up (2026-04-18, same day)
The reviewer rejected the original "deferred" list as out-of-scope drift —
DevKit must have **zero known bugs**. This pass closes every item:

### `unwrapAdminResponse` adoption — complete
All admin panels now route every `edgeFunctions.functions.invoke` tuple
through `unwrapAdminResponse` / `tryUnwrapAdminResponse`, eliminating the
"transport vs payload vs `{success:false}`" three-way drift:
- `AppSettingsPanel`, `AuditLogPanel` (incl. `useVisibleInterval` for the
  poll loop + debounce cleanup), `CouponsPanel`, `WiseHireWaitlistPanel`,
  `EmailManagementPanel` (6 invoke sites incl. the diagnose-domain
  `useEffect`), `PortfolioUsernamesPanel` (via shared `invoke()` helper),
  `OnboardingFunnelPanel`, and `AdminUsersPanel` (`fetchUsers`,
  `handleBulkConfirm`'s 4 action variants, `handleExportCSV`'s pagination
  loop, and the audit-log write).

### Unmount-guard sweep — complete
Every panel touched in this pass added `useIsMounted()` and now gates
post-await `setState` calls + `finally` `setLoading(false)` behind
`isMounted()`. Eliminates the "set state on unmounted component" warnings
during fast tab-switching while a request is in flight.

### `DeploymentPanel` — full hardening parity
- `fetchDeploymentData` now `unwrapAdminResponse`s both `admin-github-status`
  and `admin-env-check` independently (one side failing no longer blocks the
  other) and `isMounted()`-guards every post-await `setState`.
- The sweep-status path no longer calls raw `fetch('/api/admin/...')` — it
  uses a new shared `adminApiFetch<T>(path, init)` helper in
  `src/lib/devkit/edgeResponse.ts` that mirrors `unwrapAdminResponse`'s
  error-normalization contract (HTTP status → `EdgeFunctionError`,
  `notDeployed` flag for 404s, JSON-parse failure → `EdgeFunctionError`).
  Keeps `AbortSignal` support for unmount cancellation.

### `AdminUsersPanel` bulk-action result table — shipped
After Apply Plan / Suspend / Unsuspend / Grant Trial completes, a
`<Dialog>` opens listing every targeted user with a green "OK" or red
"Fail" badge plus the per-row error reason (`formatEdgeError` output).
Replaces the old behavior of a single aggregated toast hiding which
specific users failed and why. The CSV-export audit-log write also no
longer blocks the export on its own failure — it surfaces a warning
toast instead.

## Phase 3 follow-up (2026-04-18, same day)

Validator identified remaining unmount-race surfaces; this pass closes every one.

### `UserDetailDrawer` — full invoke-site conversion + complete unmount-guard sweep

All 13 `edgeFunctions.functions.invoke` call sites in `UserDetailDrawer` converted to `unwrapAdminResponse` / `tryUnwrapAdminResponse`:

**Data-load `useEffect` paths (4 sites):**
- `admin-audit-logs` → `unwrapAdminResponse` + `cancelled` guard
- `admin-save-note (list)` → `unwrapAdminResponse` + `cancelled` guard
- `admin-list-user-content` → `tryUnwrapAdminResponse` + `cancelled` guard
- `admin-update-profile (get)` → `unwrapAdminResponse` + `cancelled` guard
- `admin-get-identity` → `unwrapAdminResponse` + `cancelled` guard

**Mutation handlers (12 async functions, 9 invoke sites):**
`admin-merge-identity`, `admin-update-profile`, `admin-set-plan`, `admin-grant-trial`,
`admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-save-note`,
`admin-save-note (delete)`, `admin-revoke-sessions`, `admin-delete-user`,
`admin-list-user-content (detail)` — each handler now:
1. Awaits the invoke tuple.
2. Calls `unwrapAdminResponse(tuple, fnName)`.
3. Immediately checks `if (!isMounted()) return;` before the first post-await `setState`.
4. Guards its `finally` setter (`setSavingPlan(false)`, `setMergingIdentity(false)`, etc.) with `if (isMounted()) setter(...)`.

`useIsMounted` declared once at component-function top; imports added for
`useIsMounted`, `unwrapAdminResponse`, `tryUnwrapAdminResponse`, and `formatEdgeError`.

### `DeploymentPanel` — contact_requests probe
`useEffect` that probes `supabase.from('contact_requests')` now declares a `cancelled`
flag and returns a cleanup that sets it, preventing `setContactTableOk` from firing
after the panel unmounts.

### `EmailManagementPanel.ComposeEmailForm` — full unmount safety
`ComposeEmailForm` (inline sub-component) was missing `useIsMounted` entirely:
- `isMounted = useIsMounted()` added.
- `handleSearch` debounced callback: `if (!isMounted()) return` as first statement inside the `setTimeout`, plus a cleanup `useEffect(() => () => clearTimeout(searchDebounceRef.current), [])` to cancel any pending debounce on unmount.
- `handleSearch` catch + finally both gate with `isMounted()`.
- `handleSend` success paths (wisehire-invite branch and email-actions branch) each check `if (!isMounted()) return` after `unwrapAdminResponse`.
- `handleSend` `finally { setSending(false) }` guarded with `if (isMounted())`.

### `LiveActivityPanel.runHealthChecksForDefs`
The health-check loop awaits up to N edge function calls sequentially. After
the loop completes it now checks `if (!isMounted()) return` before writing
`setFnHealth`, `setHealthRunning`, `setHealthCheckedAt`, and `setRecentErrors`.
`isMounted` added to the `useCallback` dependency array.

## Verification
- `tsc --noEmit` clean (all three passes).
- `vite build` clean (522 precache entries, no new warnings).
- Grep for `success === false` / `success !== false` / `as { success` across all dev-kit components: 0 hits.
