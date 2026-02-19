
# Live Active Status Indicator

## What Needs to Be Built

A green pulsing "Active today — responds within 24h" badge that appears beneath the "Open to Work" pill in the portfolio hero, visible only when:
1. `openToWork` is true (the user is actively job searching)
2. The user opened WiseResume within the last 24 hours (`last_active_at` is within 24h of now)

The badge is polled every 60 seconds on the visitor side so it reflects real activity without a page refresh.

---

## Architecture — Four Layers

```text
Layer 1: Database      — Add last_active_at column to profiles
Layer 2: Auth write    — Update last_active_at on every sign-in / session restore
Layer 3: RPC expose    — get_public_portfolio returns lastActiveAt
Layer 4: Portfolio UI  — Badge + 60s polling hook in PublicPortfolioPage.tsx
```

---

## Layer 1 — Database Migration

A single nullable `timestamp with time zone` column on `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
```

No default value — `NULL` means "never seen" which correctly hides the badge for new accounts.

No new RLS policies needed: the column is read via the existing `SECURITY DEFINER` RPC (no direct table access from the public). The owner's own profile is already writable via the existing `Users can update own profile` policy.

---

## Layer 2 — Write last_active_at on Session Restore

**File: `src/contexts/AuthContext.tsx`**

Inside `resolveInitialLoad`, after the `migrateLocalKeysToServer()` call, add a fire-and-forget update:

```typescript
if (user) {
  wasAuthenticatedRef.current = true;
  userInitiatedSignOutRef.current = false;
  migrateLocalKeysToServer();
  // Touch last_active_at — non-blocking, runs silently in the background
  supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .then(() => {});
}
```

This runs every time the app initializes a session (`SIGNED_IN`, `INITIAL_SESSION`). It is:
- Fire-and-forget (`.then(() => {})` swallows errors — no UX impact if it fails)
- Throttled naturally: Supabase `SIGNED_IN` / `INITIAL_SESSION` only fires once per tab/app open, not on every page navigation
- Correct: updates `updated_at` would pollute the profile diff; `last_active_at` is isolated

---

## Layer 3 — Expose via RPC + Type Updates

### 3a — Update `get_public_portfolio` SQL function

Add `last_active_at` to the SELECT and both `RETURN` `jsonb_build_object` calls in the function.

This is done by calling the Supabase RPC tool to replace the function. The change in the profile object block:

```sql
-- Add to SELECT:
last_active_at,

-- Add to both jsonb_build_object('profile', ...) return statements:
'lastActiveAt', v_profile.last_active_at,
```

### 3b — `src/hooks/usePublicPortfolio.ts`

Add `lastActiveAt` to `PublicProfile` interface:
```typescript
lastActiveAt: string | null;   // ISO timestamp or null
```

Add to the mapper in `fetchPublicPortfolio`:
```typescript
lastActiveAt: (profile.lastActiveAt as string) || null,
```

---

## Layer 4 — Badge + 60-Second Polling in PublicPortfolioPage.tsx

### 4a — `useActiveStatus` hook (inline at top of file)

A small hook that:
1. Takes `username` and `initialLastActiveAt`
2. Stores `lastActiveAt` in state (seeded from the initial portfolio load)
3. Every 60 seconds, fires a lightweight direct DB query:

```typescript
const { data } = await supabase
  .from('profiles')
  .select('last_active_at')
  .eq('username', username)
  .eq('portfolio_enabled', true)
  .maybeSingle();
```

4. Updates state if the returned timestamp changed
5. Cleans up the interval on unmount

```typescript
function useActiveStatus(username: string, initialLastActiveAt: string | null) {
  const [lastActiveAt, setLastActiveAt] = useState(initialLastActiveAt);

  useEffect(() => {
    const id = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('last_active_at')
        .eq('username', username)
        .eq('portfolio_enabled', true)
        .maybeSingle();
      if (data?.last_active_at) {
        setLastActiveAt(data.last_active_at as string);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [username]);

  return lastActiveAt;
}
```

> **RLS Note:** `profiles` currently has `Users can view own profile` (requires auth). The poll hits the table without auth. This means we need either (a) a new public SELECT policy scoped to `portfolio_enabled = true` profiles, or (b) a dedicated lightweight RPC. Option (a) is cleaner — a narrow read-only policy:
> ```sql
> CREATE POLICY "Public can view active_at for enabled portfolios"
> ON public.profiles FOR SELECT
> USING (portfolio_enabled = true);
> ```
> This only exposes rows where `portfolio_enabled = true`. The column `last_active_at` is not sensitive (it's just a timestamp). The existing columns like email are not in this select — only `last_active_at` and `username` are fetched.

### 4b — `isActiveToday` computed value

```typescript
function isActiveWithin24h(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  const diff = Date.now() - new Date(lastActiveAt).getTime();
  return diff < 24 * 60 * 60 * 1000; // < 24 hours
}
```

### 4c — Badge placement

Right after the existing "Open to Work" pill (lines 1088–1097 of `PublicPortfolioPage.tsx`), inside the same `<div className="flex items-center justify-center gap-2 mb-3 flex-wrap">`:

```tsx
{profile.openToWork && isActive && (
  <motion.span
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
    style={{
      background: 'rgba(34,197,94,0.12)',
      color: '#22c55e',
      border: '1px solid rgba(34,197,94,0.25)',
    }}
  >
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
    </span>
    Active today — responds within 24h
  </motion.span>
)}
```

The ping animation uses Tailwind's built-in `animate-ping` — this is the standard "active status" pattern (same pattern as the "Open to Work" dot, but with the sonar ring effect for stronger visual signal).

---

## Files Changed

| File | Action | What |
|---|---|---|
| DB migration | CREATE | `ALTER TABLE profiles ADD COLUMN last_active_at timestamptz` |
| DB migration | CREATE | Public RLS policy for `portfolio_enabled = true` profiles |
| DB (RPC) | UPDATE | `get_public_portfolio` function: expose `lastActiveAt` |
| `src/contexts/AuthContext.tsx` | MODIFY | Touch `last_active_at` on session open (fire-and-forget) |
| `src/hooks/usePublicPortfolio.ts` | MODIFY | Add `lastActiveAt` to `PublicProfile` interface + mapper |
| `src/pages/PublicPortfolioPage.tsx` | MODIFY | `useActiveStatus` hook + `isActiveWithin24h` helper + badge JSX |

No new components, no new edge functions, no new routes.

---

## UX Details

- Badge only appears when both `openToWork === true` AND `last_active_at < 24h ago` — double gate prevents false positives
- If `openToWork` is false, the badge is hidden even if the user opened the app recently (respects their explicit status)
- The poll is lightweight — selects a single column from a single row by indexed username
- On tab close / page navigate away, the interval is cleared via the `useEffect` cleanup
- The badge has a Framer Motion `scale` entrance so it doesn't pop in jarringly on initial load
- On `classic-clean` theme (light background), the green-on-white still passes WCAG AA contrast at the green `#22c55e` on `rgba(34,197,94,0.12)` background
