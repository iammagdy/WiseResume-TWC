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

## What's deferred
- Adopting `unwrapAdminResponse` across the remaining panels (AdminUsersPanel,
  AppSettingsPanel, AuditLogPanel, CouponsPanel, EmailManagementPanel,
  PortfolioUsernamesPanel, WiseHireWaitlistPanel) is a mechanical follow-up
  with no functional change — kept out of this pass to keep the diff
  reviewable.
- AdminUsersPanel bulk-action result table (per-row outcomes).
- Migrating remaining `setInterval` callers to `useVisibleInterval`.

## Verification
- `tsc --noEmit` clean.
- `vite build` clean (522 precache entries, no new warnings).
