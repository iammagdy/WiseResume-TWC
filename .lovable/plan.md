

## AI Health Indicator: Fix False Alerts, Overlap, and Wasteful Pings

### Problems Found

1. **False "AI unavailable" toast** -- The hook starts in `checking` state. If the first fetch fails or takes too long (network hiccup, cold start), it immediately sets `down` and the toast fires. The `toastShownRef` then locks, so even when the next poll returns `healthy`, the user already saw the scary error toast. The toast should only fire after multiple consecutive failures, not on the very first check.

2. **Badge overlaps profile avatar** -- The badge is `absolute top-3 right-3 z-50` in AppShell, which sits on top of page headers (like the Settings avatar area). It needs to be positioned contextually within each page's header, or given smarter positioning.

3. **Edge function wastes AI credits** -- Every 60s health check sends `"hi"` to the AI gateway and waits for a response. This burns credits on a throwaway request. A proper health check should just verify the endpoint is reachable (e.g., a lightweight ping or checking the response headers) without consuming model tokens.

4. **Redundant polling when healthy** -- If AI is healthy, polling every 60s is excessive. Should back off to 5 minutes when healthy and only poll faster when degraded.

---

### Plan

#### 1. Fix false toast alerts (`src/hooks/useAIHealth.ts`)

- Add a `failCount` ref. Only transition to `down` status after 2 consecutive failures.
- Reset `failCount` to 0 on any successful check.
- Don't show toast during the initial `checking` -> first result transition. Only show toast if the status *changes* from `healthy`/`degraded` to `down` (not on cold start).
- Use adaptive polling: 5 minutes when healthy, 60s when degraded, 30s when down.

#### 2. Fix badge positioning (`src/components/layout/AppShell.tsx`)

- Remove the `absolute top-3 right-3` positioning from AppShell.
- Instead, place the badge inside each page's own header where it fits naturally (or use a smarter layout that doesn't overlap). The simplest fix: change from `absolute` to a flex-positioned element within the AppShell top area, or add `pointer-events-none` to the container and `pointer-events-auto` to the badge, plus shift it left so it doesn't overlap the avatar zone.
- Best approach: move the badge into a slim top bar row that doesn't overlap content.

#### 3. Make edge function lightweight (`supabase/functions/ai-health/index.ts`)

- Instead of sending a full chat completion request with `"hi"`, just do a HEAD request or a minimal API call that verifies connectivity without burning tokens.
- For the Lovable gateway: send a request with `max_tokens: 1` and an empty-ish prompt (already done, but we can use a simpler model check endpoint if available). Since there's no lighter endpoint, keep the current approach but reduce poll frequency.
- Alternative: cache the last known status in the edge function response headers and skip the AI call if the last check was recent (server-side caching).

#### 4. Suppress toast on initial load (`src/components/ai/AIHealthBadge.tsx`)

- Add a `hasReceivedHealthy` ref. Only show error/warning toasts after the badge has seen at least one `healthy` status. This prevents the cold-start false alarm.
- If the very first check comes back `down`, show the badge in red but don't fire a toast (the user can tap it to see details).

---

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAIHealth.ts` | Add fail-count logic, adaptive polling intervals, suppress initial false-down |
| `src/components/ai/AIHealthBadge.tsx` | Only toast after first healthy seen; cleaner toast logic |
| `src/components/layout/AppShell.tsx` | Fix badge positioning to not overlap page headers |
| `supabase/functions/ai-health/index.ts` | No change needed (the 1-token call is already minimal; reducing poll frequency on client side is sufficient) |

