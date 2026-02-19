
# Visitor Intelligence + Smart Short Link System

## Clarifying Your Vision First

You asked two things that are deeply connected — here is how they work together:

1. **Short links with attribution**: Instead of `wiseresume.app/p/johndoe`, a user creates a short link like `wiseresume.app/l/xK9mR`. That short code carries metadata: who created it (the portfolio owner), what channel it was for (LinkedIn post, email, QR code). When a visitor opens it, they are transparently redirected to the portfolio — but we first log where they came from.

2. **Visitor intelligence**: Every portfolio visit (whether from a short link OR the direct URL) records: country, approximate city (from IP geolocation), time spent, which sections were scrolled to. The portfolio owner sees a real-time "Visitors" panel inside the Portfolio Editor with cards for each recent visit.

---

## Architecture Overview

```text
User creates short link
       │
       ▼
short_links table
  ├── id: "xK9mR"  ← 5-char nanoid
  ├── portfolio_username: "johndoe"
  ├── label: "LinkedIn Post Jan 2026"
  ├── owner_user_id: uuid  ← attribution
  └── click_count: 5

Visitor opens wiseresume.app/l/xK9mR
       │
       ▼
ShortLinkPage resolves → redirects to /p/johndoe?ref=xK9mR
       │
       ▼
PublicPortfolioPage loads
  └── calls track-portfolio-view edge fn with:
        { username, ref, country, city, sections, time_spent }
       │
       ▼
portfolio_visits table (NEW)
  ├── username: "johndoe"
  ├── short_link_id: "xK9mR" (nullable — direct visits are null)
  ├── country: "United Arab Emirates"
  ├── city: "Dubai"
  ├── sections_viewed: ["experience", "skills"]
  ├── time_spent_seconds: 47
  └── visited_at: timestamp
```

---

## Database Schema (2 new tables + 1 migration)

### Table 1: `short_links`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | 5-char nanoid (e.g. `xK9mR`) — this IS the slug |
| `owner_user_id` | uuid NOT NULL | RLS: only owner can read/delete |
| `portfolio_username` | text NOT NULL | The portfolio this link points to |
| `label` | text | User-visible name: "LinkedIn Bio", "Email Signature" |
| `click_count` | integer DEFAULT 0 | Incremented on each redirect |
| `created_at` | timestamptz DEFAULT now() |

**RLS:** Owner can INSERT/SELECT/DELETE their own. Anyone can SELECT a single row by `id` (needed for redirect) — scoped to `id` column only via a SECURITY DEFINER function.

### Table 2: `portfolio_visits`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK DEFAULT gen_random_uuid() |
| `username` | text NOT NULL | Portfolio owner's username |
| `short_link_id` | text NULLABLE FK → short_links.id | NULL = direct visit |
| `country` | text NULLABLE | From IP geolocation |
| `city` | text NULLABLE | From IP geolocation |
| `time_spent_seconds` | integer NULLABLE | Sent on page unload |
| `sections_viewed` | jsonb DEFAULT '[]' | Array of section names scrolled into view |
| `visited_at` | timestamptz DEFAULT now() |

**RLS:** Portfolio owner can SELECT their own visits (`WHERE username = profile.username`). No one can SELECT others' visits. INSERT is allowed to anyone (no auth needed — it's public). No UPDATE/DELETE by users.

---

## Edge Functions (2 to upgrade, 1 new)

### 1. Upgrade `track-portfolio-view` → `track-portfolio-visit`

Replaces the current simple counter. Accepts:
```json
{
  "username": "johndoe",
  "ref": "xK9mR",          // optional short link ID
  "sectionsViewed": ["experience", "skills"],
  "timeSpentSeconds": 47
}
```

Uses the `CF-IPCountry` / `x-country-code` header (Cloudflare injects this automatically on Supabase Edge Functions) for country. Uses `ip-api.com` (free, no key needed) for city resolution from IP. Writes one row to `portfolio_visits`, increments `profiles.views`, and increments `short_links.click_count` if `ref` is provided.

### 2. New `resolve-short-link` edge function

GET `/resolve-short-link?id=xK9mR` — looks up the short link by ID using service role (no RLS), returns `{ username, label }`. The frontend's `ShortLinkPage` calls this, gets the username, then navigates to `/p/{username}?ref=xK9mR`.

### 3. Upgrade `supabase/config.toml`

Add `[functions.resolve-short-link] verify_jwt = false`.

---

## Frontend (5 files)

### 1. `src/pages/ShortLinkPage.tsx` (NEW)

Route: `/l/:linkId`. On mount:
- Calls `resolve-short-link?id=linkId`
- If found: navigates to `/p/{username}?ref={linkId}`
- If not found: shows "Link not found" with a "Create your portfolio" CTA

Renders a full-screen loading spinner while resolving (fast, sub-200ms). The redirect is seamless.

### 2. `src/App.tsx` — add route `/l/:linkId`

Add `<Route path="/l/:linkId" element={<ShortLinkPage />} />` to public routes (no auth needed).

### 3. `src/pages/PublicPortfolioPage.tsx` — upgrade visitor tracking

**Section scroll tracking:** Add `IntersectionObserver` to each named section div (experience, education, skills, etc.). When a section becomes visible (>50% in viewport), add its name to a `Set<string>`. This set is sent in the tracking call.

**Time tracking:** Record `Date.now()` on mount. On `visibilitychange` to hidden (tab close / background), send the visit data using `navigator.sendBeacon()` (works even on page unload). Also send after 30 seconds for users who stay long.

**Ref reading:** Read `?ref=` from URL params and pass to the tracking function.

**Updated tracking call:**
```typescript
navigator.sendBeacon(
  `${SUPABASE_URL}/functions/v1/track-portfolio-view`,
  JSON.stringify({ username, ref, sectionsViewed: [...sectionsSet], timeSpentSeconds })
);
```

### 4. `src/components/portfolio/VisitorsPanel.tsx` (NEW)

A collapsible card section inside the Portfolio Editor. Shows:
- **Summary row**: Total views • Unique countries count • Avg time spent
- **Recent visits list** (last 20): Each card shows flag emoji + city/country, time ago, time spent badge, sections viewed chips, and a 🔗 tag if from a short link (with the link's label)
- **Short Links manager**: List of created short links with click counts, a "Copy" button, and a "Delete" button. Plus a "Create New Link" button with a label input.

Uses TanStack Query with `queryKey: ['portfolio-visits', username]`.

### 5. `src/hooks/usePortfolioAnalytics.ts` (NEW)

```typescript
export function usePortfolioVisits(username: string | undefined)
export function useShortLinks(userId: string | undefined)
export function useCreateShortLink()
export function useDeleteShortLink()
```

Fetches from `portfolio_visits` and `short_links` tables. `useCreateShortLink` generates a 5-char nanoid client-side and inserts into `short_links`. `useDeleteShortLink` removes by id (RLS ensures only owner can delete).

---

## IP Geolocation — Free, No API Key Needed

The `track-portfolio-visit` edge function will use `ip-api.com/json/{ip}` (free tier: 45 req/min, no key). This returns:
```json
{ "country": "United Arab Emirates", "city": "Dubai", "status": "success" }
```

The visitor's IP is extracted from the `x-forwarded-for` header of the edge function request. If geolocation fails or times out (>1s), the visit is still recorded with `country: null` — visitor analytics are best-effort and non-blocking.

---

## Short Link ID Generation

5-character alphanumeric IDs from a 62-char alphabet (`a-z`, `A-Z`, `0-9`):
- 62^5 = 916 million combinations — virtually no collisions for this app
- Generated client-side using a simple `Math.random()` loop (no nanoid dependency needed)
- On insert conflict (astronomically rare), retry with a new ID

URL pattern: `wiseresume.app/l/xK9mR` — 22 characters vs. `wiseresume.app/p/johndoe` — clean and short.

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/…_visitor_intelligence.sql` | CREATE | 2 new tables + RLS + DB functions |
| `supabase/functions/track-portfolio-view/index.ts` | MODIFY | Add geolocation + sections + time + short link tracking |
| `supabase/functions/resolve-short-link/index.ts` | CREATE | Short link resolver edge function |
| `supabase/config.toml` | MODIFY | Add resolve-short-link verify_jwt=false |
| `src/pages/ShortLinkPage.tsx` | CREATE | /l/:linkId redirect page |
| `src/App.tsx` | MODIFY | Add /l/:linkId route |
| `src/pages/PublicPortfolioPage.tsx` | MODIFY | Section tracking + time tracking + sendBeacon |
| `src/hooks/usePortfolioAnalytics.ts` | CREATE | Query hooks for visits + short links |
| `src/components/portfolio/VisitorsPanel.tsx` | CREATE | Visitors panel + short links manager UI |
| `src/pages/PortfolioEditorPage.tsx` | MODIFY | Mount VisitorsPanel as a new collapsible section |

---

## What the Visitors Panel Looks Like

```text
┌─── 👁 Visitors & Analytics ──────────────────────────────── ▼ ┐
│                                                                │
│  Total Views    Countries    Avg Time                         │
│  1,247          23 🌍        1m 12s                           │
│                                                               │
│  ── Recent Visitors ─────────────────────────────────────    │
│  🇦🇪  Dubai, UAE              🔗 LinkedIn Bio     2h ago      │
│       Skills · Experience                    47s spent        │
│  ─────────────────────────────────────────────────────────   │
│  🇺🇸  San Francisco, USA      Direct link        Yesterday    │
│       Experience · Projects                  2m 3s spent      │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  ── Your Short Links ───────────────────────────────────     │
│  [🔗] LinkedIn Bio   wise.app/l/xK9mR   12 clicks  [Copy][✕] │
│  [🔗] Email Sig      wise.app/l/pQ3nT   4 clicks   [Copy][✕] │
│                                                               │
│  [+ Create Short Link]  Label: ________________  [Create]    │
└───────────────────────────────────────────────────────────────┘
```

---

## Security Notes

- `portfolio_visits` INSERT is public (no auth) — this is intentional, just like `increment_portfolio_views`. The owner's username is validated against the `profiles` table server-side before inserting.
- Short link resolution uses a SECURITY DEFINER function — clients cannot enumerate all links, only resolve a specific ID.
- No personal data (email, name) is stored in visits — only IP-derived geo (country/city) and behaviour (sections, time).
- The `short_links` table requires auth to read (owner only) — a visitor cannot discover your other short links from one link ID.

---

## What Does NOT Change

- The existing `views` counter on `profiles.views` — still incremented alongside the new detailed tracking
- The `track-portfolio-view` function name (updated in-place, same endpoint)
- The existing `increment_portfolio_views` RPC — still called from within the upgraded function
- QR code feature — QR codes can optionally be given a short link label ("QR Code" channel)
