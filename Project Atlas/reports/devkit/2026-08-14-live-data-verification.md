# DevKit Live Data Verification

**Date:** 2026-08-14

**Production:** [https://wiseresume.app/devkit](https://wiseresume.app/devkit) [1]

**Repository baseline:** `iammagdy/WiseResume-TWC`, static-audit baseline `d31c803070e509c98f93e95b0421ab2eb530a4d4`; current `main` during verification `b41933854ffe83974e2fe95b781e100f8ba218fa`.

**Verification mode:** Authenticated, read-only production verification. No fixes, application-code edits, Appwrite changes, schema or permission changes, deployments, destructive DevKit actions, or production-data mutations were performed.

## Verdict

The DevKit is **LIVE_PARTIALLY_VERIFIED_WITH_CONFIRMED_MISMATCHES**. Core authentication and administrative data surfaces were reachable, and several values were internally consistent across Home, Data Integrity, Users, Diagnostics, Mission Control, and Appwrite Functions. However, the verification did not establish independent equality for every KPI because the protected Function response bodies were not replayed or copied outside the live UI. Two production mismatches were directly observed: the AI-health surfaces report different health dimensions, and the AI Health traffic card labelled “last 50 calls” displayed only 44 attributed calls. A third internal consistency issue was visible in Data Integrity: 44 Auth Users versus 33 Verified plus 10 Unverified, which totals 43.

The App Overview and Onboarding Funnel data cards remained in skeleton/loading states and did not render values, error states, or explicit unavailable states during repeated captures. This prevents verification of their charts and live counts and is itself an operational observability gap, but it is **not evidence that a false zero was displayed**. The 5,000-event visitor bound was explicitly disclosed in production, and the Observability panels used explicit empty-state text rather than silent zero-valued cards.

> This report distinguishes a live production observation from a code-confirmed risk. A static finding is not promoted to a live mismatch unless the production session reproduced the behavior or exposed the relevant state directly.

## Evidence and comparison method

The authenticated session was active as the admin account `magdy.saber@outlook.com`. The browser loaded Appwrite account/JWT resources and protected `admin-devkit-data` Function executions. The comparison therefore uses three evidence levels: **independent live corroboration** where a separate panel or diagnostic check reported the same value; **backend-backed UI evidence** where the panel disclosed its Function/collection source; and **unavailable** where a protected response body or independently replayable aggregate was not captured. No credentials, tokens, secret values, or raw protected payloads were recorded.

| Evidence level | Meaning in this report |
|---|---|
| Independent live corroboration | A separate live diagnostic or panel reported the same underlying value or state. |
| Backend-backed UI | The panel explicitly identified Appwrite or a protected Function source, but the raw response was not independently replayed. |
| Code-only | The repository statically proves a behavior or risk, but the live session did not reproduce it. |
| Unavailable | The panel stalled, did not expose the needed value, or safe read-only evidence was insufficient. |

## Confirmed Production Mismatches

| Area | UI value and label | Direct/backend evidence available | Status | Root cause or interpretation |
|---|---|---|---|---|
| Data Integrity | `Auth Users 44`; `Verified 33`; `10 pending` unverified | Diagnostics separately reported `Users API reachable. Total auth users: 44`; the displayed verified and unverified subtotals sum to 43 | **MISMATCH** | The totals appear to come from different classifications, snapshots, or filtering rules. The live UI does not explain the missing one user. |
| AI Health traffic | `Traffic Distribution · last 50 calls`; Groq `5% (2)` plus DeepSeek `95% (42)` | The displayed provider counts sum to 44, not 50; recent execution list showed 10 completed entries | **MISMATCH** | The label describes a 50-call window while the rendered attributed distribution contains 44 calls. The backend may omit unattributed/unsupported providers, or the aggregation and label use different populations. |
| AI Health vs AI Keys | Provider Health: OpenRouter `174 ms`, Groq `238 ms`, DeepSeek `274 ms`, NVIDIA `80 ms`, each `Ping successful`; AI Keys OpenRouter Slot 1 `Rate Limited` | AI Keys identifies its source as real provider completion ping and Appwrite Function Variables; Mission Control/AI Health uses provider reachability/ping status | **MISMATCH_OF_HEALTH_DIMENSION** | `/models` or reachability success does not prove that a configured key/model can complete a request. This is the live manifestation of P2-02. |
| Appwrite Functions parity | `ai-gateway` and `admin-devkit-data`: `Enabled · Needs Redeploy`, with source/deployed hash prefixes differing | The Functions inventory directly displayed source SHA-256 and deployed hash comparisons; Diagnostics only confirmed deployed/enabled | **MISMATCH** | Deployment existence/auth-posture checks and source-hash parity are different checks. Mission Control’s `28/28 deployed · no new drift` does not negate the hash-drift result. |

## Metrics That Match

The following values were internally corroborated in the live session, but should not be interpreted as an independent raw-database export unless explicitly stated.

| Metric | UI value and label | Backend/Appwrite evidence | Range/timezone | Result | Data quality |
|---|---|---|---|---|---|
| Auth users | Home `Total Users 44`, Data Integrity `Auth Users 44`, Users `Total 44` | Diagnostics Users API: total auth users `44`; Data Integrity source label `Appwrite` | Snapshot at approximately 13:33–13:42 GMT+3 | **MATCH** | Backend-backed; exact for the returned Users API total, but no independent raw export was retained. |
| Verified users | `Verified 33` | No separate raw Users API response body captured | Same snapshot | **UNAVAILABLE for independent equality** | Displayed value is live, but independent verification is blocked. |
| Total resumes | `Total Resumes 69` | Data Integrity identified Appwrite; no separate collection aggregate was replayed | Same snapshot | **UNAVAILABLE for independent equality** | Exactness cannot be certified from the protected UI response alone. |
| Orphaned resumes | `31 orphaned resumes`; `31 orphaned hidden from active count` | Data Integrity identified Appwrite; no independent resume/profile join was replayed | Same snapshot | **UNAVAILABLE for independent equality** | Derived count; exactness not independently proven. |
| Plans and suspension | Users: `Premium 7`, `Pro 1`, `Suspended 0` | Backend source is protected `admin-devkit-data`; Diagnostics confirmed relevant `profiles` and `subscriptions` collections exist | Same snapshot | **PARTIAL** | UI values loaded and were internally consistent, but effective-plan versus legacy-plan source semantics were not exposed. |
| Active today | Users: `8 Active Today`; label clarifies `Profile updates today` | No independent profile update query captured | “Today” as rendered by panel; timezone not shown | **PARTIAL** | It is not a login/DAU metric despite the “today” label. |
| Visitor range | Visitor Deep Dive: `262` visits, `43` unique visitors, `43 new · 0 returning` | Protected visitor analytics backend; live panel disclosed `5,000 events in collection` | Selected `7d`; timezone not shown | **PARTIAL** | Real live values with a disclosed event cap; not a global exact total outside the cap. |
| Visitor today/live | `16` visits today, `8` unique today, `1 live` at approximately 13:36; later Mission Control `0 active sessions in last 5 minutes` | Same visitor backend for panel; Mission Control uses its own live-visitor check | Visitor panel selected `7d`; Mission Control rolling 5-minute window | **PARTIAL** | Different windows and polling times explain why these values are not expected to match exactly. |
| Visitor breakdowns | EG `594` visits; desktop `85.9%`, mobile `14.1%`; Chrome `82.8%`, Safari `14.8%`, Firefox `2.4%` | Protected visitor analytics backend | Selected `7d`; timezone not shown | **PARTIAL** | Internally coherent UI breakdowns, bounded by the disclosed 5,000-event collection cap. |
| Mission Control database | `Appwrite database reachable · 0 errors (1h)` | Mission Control’s live database health check | Rolling one hour | **MATCH** | Reachability/error health only; not a proof of every collection query. |
| Diagnostics inventory | `47 healthy, 0 warning, 0 broken, 0 not configured` | Diagnostics checked Users API, Function deployment/enabled state, collection existence and attributes | Checked 8/14/2026 13:42:18 GMT+3 | **MATCH** | Exact for the diagnostics checks performed; not source-hash parity or business-metric validation. |
| Observability telemetry | `No invocations recorded in the last 24h` | Telemetry panel’s protected backend query | Rolling 24h; the panel also labels 1h and 24h request windows | **MATCH for displayed empty state** | Explicit empty state; the 500-row cap was not stress-tested. |
| Observability errors | `No errors in this window` | Error Stream protected backend query | `All` severity, 24h; updated about seven seconds before capture | **MATCH for displayed empty state** | Explicit empty state; the 100-row cap was not stress-tested. |
| Deployment existence | Diagnostics reported key Functions deployed and enabled; Mission Control reported `28/28 ... deployed` | Appwrite Functions inventory | Point-in-time snapshot | **MATCH for existence** | Does not imply source/deployed hash parity. |

## Zero-on-Error Production Risk

The static audit confirmed that `handleOverviewStats`, `handleGlobalStats`, and `countUniqueTodayVisitors` can convert certain Users API, database, or visitor-query failures into empty collections or numeric zero values [2]. This exact failure behavior was **not reproduced in production** because the verification did not intentionally break services and the relevant panels either loaded real values, rendered explicit empty states, or stalled in skeleton state.

The live result is therefore **CONFIRMED_CODE_ONLY**, not `CONFIRMED_LIVE`. The App Overview remained unresolved without showing zero; Onboarding remained unresolved without showing zero; Observability displayed “No invocations recorded” and “No errors in this window” rather than silent numeric zeros. The remaining production risk is real but unquantified: a future source failure may still be presented as a valid zero in the code paths identified by the static audit. The appropriate operational interpretation of the current session is **UNVERIFIED failure semantics**, not “zero means no data.”

## Chart Verification

App Overview was selected for the `7d` range and showed the expected controls (`Today`, `24h`, `7d`, `30d`, `90d`, CSV, Refresh), but its KPI and chart cards remained skeleton placeholders in two captures approximately five seconds apart. No numeric series, chart, error message, empty state, or truncation disclosure appeared. The chart is therefore **UNAVAILABLE**, and no conclusion about signups, DAU, WAU, stickiness, page views, top pages, referrers, countries, devices, or mixed analytics-source parity can be made from this live session.

Visitor Deep Dive did render real breakdowns and top pages. It showed `/dashboard 58`, `/jobs 53`, `/ 43`, `/auth 34`, and `/auth/verify-email 17`, plus country, device, and browser distributions. The visitor chart/breakdown is **PARTIAL** rather than globally exact because the panel explicitly disclosed a 5,000-event collection bound. The Onboarding Funnel disclosed stage names and its `audit_logs` source but rendered no counts or daily series, so stage-reach versus strict sequential conversion remains **CONFIRMED_CODE_ONLY**.

The AI traffic card’s provider distribution is the one chart-like production mismatch directly observed: the “last 50 calls” label and 44 displayed attributed calls do not describe the same visible population. This should be treated as a live data-label mismatch until the backend aggregation contract is documented.

## Timezone / Range Verification

The live UI disclosed ranges but not an effective timezone or exact start/end timestamps. Visitor Deep Dive used `7d`, with separate “today” values and a live count. Onboarding used `Last 14 days` and `Daily` aggregation. App Overview used `7d`. Observability used rolling 24h and described a separate 1h request window. Mission Control live visitors used a rolling five-minute window.

The static audit found separate UTC bucket logic in onboarding and server-local `setHours`/range helpers in central analytics and visitor paths [2]. No midnight-boundary or cross-panel same-window experiment was safely reproducible during this session. The timezone discrepancy is therefore **CONFIRMED_CODE_ONLY** and the runtime impact is **UNVERIFIED**. The different live-visitor values are not by themselves a mismatch because the panels use different windows and capture times.

## AI Health Verification

The live evidence confirms that the product exposes at least two distinct AI-health concepts without a fully shared taxonomy. AI Health/Mission Control showed provider ping success and low transport latency. AI Keys & Models showed at least one configured OpenRouter slot as `Rate Limited` under a panel explicitly described as a real provider completion ping. Recent AI executions shown in AI Health were marked `completed`, but that list is not proof that every configured key/model slot is completion-healthy.

The appropriate status interpretation is therefore: **catalog/reachability healthy; at least one configured completion slot rate-limited; aggregate completion health not globally certified**. This is `CONFIRMED_LIVE` for P2-02. No “Test All Keys” operation was run, no key was changed, and no provider was intentionally disrupted.

## Deployment / Function Status Verification

The Appwrite Functions inventory was the strongest direct deployment evidence captured. It displayed function IDs, runtime `node-22`, deployment IDs, updated timestamps, source SHA-256 values, deployed hash prefixes, and status pills. `ai-gateway` and `admin-devkit-data` were both `Enabled · Needs Redeploy` with differing source/deployed hash prefixes. `ai-health`, `admin-visitor-analytics`, and `admin-onboarding-funnel` were shown `Enabled · In Sync`.

Diagnostics independently confirmed that the important Functions were deployed and enabled, while Mission Control reported `28/28 auth-posture pass · 28 deployed · no new drift`. These results are not contradictory: Diagnostics and Mission Control check availability/posture, whereas the Functions panel checks source/deployed hash parity. The live conclusion is **deployed and reachable does not equal source-parity synchronized**. No deploy control was activated.

## DevKit Token / Session Verification

The live gate required the authenticated Appwrite admin session and did not request a DevKit password. Diagnostics stated that `DEVKIT_PASSWORD` is present as an optional legacy fallback and that primary DevKit authentication uses Appwrite session verification and signed tokens. The session was accepted, the route remained authenticated, and no token or credential material was exposed in the captured UI or console evidence.

The static audit’s revocation finding remains **CONFIRMED_CODE_ONLY**: signed-token verification checks signature, purpose, and expiry but does not revalidate current admin status or a revocation record [2]. A stolen valid token was not replayed, and no revocation or privilege-removal test was attempted in production.

## Static Audit Findings Reclassified

| Finding | Classification | Live verification rationale |
|---|---|---|
| **P1-01 — Metric-source failures can render as valid zero values** | **CONFIRMED_CODE_ONLY** | The fallback-to-zero behavior is confirmed in code, but no live source failure was induced and no false zero was displayed. App Overview and Onboarding stalled; Observability used explicit empty states. |
| **P1-02 — Bounded overview statistics can be misread as global exact totals** | **DOWNGRADED** | The live user population was 44, below the 500-user cap, so the cap did not truncate the observed user set. The absence of a visible cap disclosure remains a semantic risk for larger populations and derived resume/orphan totals, but no live truncation was reproduced. |
| **P2-01 — Effective-plan fallback can count the wrong population** | **CONFIRMED_CODE_ONLY** | Users showed Premium 7 and Pro 1, but the response did not expose effective-plan versus legacy-plan counts and no independent profile/subscription aggregation was captured. No live plan-count mismatch was reproduced. |
| **P2-02 — AI health labels combine transport reachability and completion health** | **CONFIRMED_LIVE** | AI Health marked all provider pings successful while AI Keys marked OpenRouter Slot 1 `Rate Limited` under a real completion-probe surface. |
| **P2-03 — Cross-panel date/time conventions are not canonicalized** | **CONFIRMED_CODE_ONLY** | Separate UTC/server-local/range implementations are confirmed in code, but the live panels did not expose timezone or effective boundaries and no midnight discrepancy was reproduced. |
| **P2-04 — Signed DevKit tokens lack revocation/current-admin revalidation** | **CONFIRMED_CODE_ONLY** | Static inspection confirms signature/purpose/expiry validation without current-admin or revocation lookup. No safe production replay or privilege-revocation test was performed. |
| **P2-05 — Bounded telemetry/error lists make “none found” ambiguous** | **DOWNGRADED** | The 500-row telemetry and 100-row error caps are confirmed in code, but live empty states were explicit and truthful for the selected windows. The cap’s effect on a populated/over-cap window was not reproduced. |

## Final Fix Priority

**Priority 1 — Make availability and scope explicit.** The highest-value remediation remains a typed per-metric envelope distinguishing exact zero, unavailable, partial, stale, and truncated, with effective range, timezone, source, scanned count, and request ID. This addresses P1-01, the remaining P1-02 semantic risk, and P2-05. The live skeleton-only App Overview and Onboarding states reinforce the need for a visible timeout/error state, but no fix was implemented in this task.

**Priority 2 — Reconcile metric semantics.** The 44-versus-43 Data Integrity subtotal discrepancy, the AI `last 50` versus 44-call distribution discrepancy, and effective-plan versus legacy-plan ambiguity should be resolved by returning the population definition and exact count source with each card. The 500-user bound should be propagated to all derived KPIs or replaced with an exact aggregate.

**Priority 3 — Separate AI health taxonomy.** Keep reachability/catalog status separate from configured-key completion status, and show provider, model, slot, probe time, and failure class. The live OpenRouter rate-limit observation demonstrates why this is operationally important.

**Priority 4 — Reconcile deployment posture and session hardening.** Treat source/deployed hash drift as distinct from deployed/enabled status, and add current-admin/revocation revalidation for signed DevKit tokens. These are code and operational hardening priorities; no deployment or Appwrite change was made here.

## Scope Boundary and Stop Point

This was a verification-only task. No product code, Appwrite Function, schema, permission, environment variable, secret, account, production record, deployment, or destructive DevKit action was changed. The final state is a report of observed production evidence and reclassified findings. Any remediation requires a separate approved task.

## References

[1]: https://wiseresume.app/devkit "WiseResume production DevKit"

[2]: https://github.com/iammagdy/WiseResume-TWC/tree/b41933854ffe83974e2fe95b781e100f8ba218fa "WiseResume-TWC current main source"

[3]: https://github.com/iammagdy/WiseResume-TWC/blob/b41933854ffe83974e2fe95b781e100f8ba218fa/appwrite-hubs/admin-devkit-data/src/main.js "Admin DevKit backend"

[4]: https://github.com/iammagdy/WiseResume-TWC/blob/b41933854ffe83974e2fe95b781e100f8ba218fa/src/components/dev-kit/OverviewPanel.tsx "DevKit Overview panel"
