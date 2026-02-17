

## Public Portfolio Website Feature

### Overview

Transform each user's resume data into a permanent, shareable portfolio website at `wiseresume.lovable.app/p/{username}`. Users claim a unique username, toggle their portfolio live, and get an AI-generated friendly bio -- all from existing resume data with zero extra work.

### What Users Get

- A permanent URL like `wiseresume.lovable.app/p/magdy` they can put on LinkedIn, email signatures, or Twitter
- A modern Bento Grid layout with animated sections: Hero, About Me (AI bio), Experience Timeline, Projects, Skills/Stack, Education
- A "Built with WiseResume" footer badge that drives viral traffic
- One-tap toggle to make it public/private from the Profile page

---

### Phase 1: Database Changes

**Migration 1 -- Add username and portfolio fields to `profiles`:**
- `username TEXT UNIQUE` -- the vanity URL slug (lowercase, alphanumeric + hyphens, 3-30 chars)
- `portfolio_bio TEXT` -- AI-generated friendly "About Me" text
- `portfolio_enabled BOOLEAN DEFAULT false` -- toggle to make portfolio public

**Migration 2 -- Create a SECURITY DEFINER function `get_public_portfolio(p_username)`:**
- Looks up `profiles` by username where `portfolio_enabled = true`
- Fetches the user's primary resume (`is_primary = true`) or first resume
- Returns combined JSON (profile info + resume data) without exposing sensitive fields (email, phone stripped unless user opts in)
- Returns NULL if username not found or portfolio disabled

**No new RLS policies on `resumes` for anon access** -- the SECURITY DEFINER function handles all data access securely, matching the existing `get_shared_resume` pattern.

---

### Phase 2: AI Bio Generator (Edge Function)

**New edge function: `supabase/functions/generate-portfolio-bio/index.ts`**

- Accepts the user's resume summary, name, and job title
- Uses the Lovable AI Gateway (google/gemini-2.5-flash) to rewrite the formal summary into a warm, first-person "About Me" paragraph
- Prompt: "Rewrite this resume summary as a friendly, first-person bio for a personal portfolio website. Keep it under 150 words. Make it warm and human, not corporate."
- Returns `{ bio: string }`
- Protected: requires auth JWT, increments AI usage credits

---

### Phase 3: Frontend -- Public Portfolio Page

**New file: `src/pages/PublicPortfolioPage.tsx`**

A fully public, unauthenticated page rendered at `/p/:username`. Design:

```
+------------------------------------------+
|  [Avatar]  Name                          |
|  Job Title - Location                    |
|  LinkedIn icon                           |
+------------------------------------------+
|                                          |
|  "About Me" Card (AI bio, italic)        |
|                                          |
+-------------------+----------------------+
|                   |                      |
|  Experience       |  Skills/Stack        |
|  Timeline Cards   |  Badge Grid          |
|  (animated)       |                      |
+-------------------+----------------------+
|                                          |
|  Projects Grid (if any)                  |
|  Bento cards with tech tags              |
|                                          |
+------------------------------------------+
|  Education Cards                         |
+------------------------------------------+
|  "Built with WiseResume" badge + CTA     |
+------------------------------------------+
```

Key design decisions:
- Mobile-first: single column on xs, bento grid on md+
- Uses framer-motion for scroll-reveal animations on each section
- Dark/light theme respects system preference via existing theme system
- Glass-elevated cards matching the app's "Vibrant Space" theme
- No BottomTabBar or AppShell (fully standalone public page)
- SEO meta tags injected via document.title and meta description

**New file: `src/hooks/usePublicPortfolio.ts`**

- Calls the `get_public_portfolio` RPC function with the username
- Returns typed portfolio data (profile + resume)
- Uses TanStack Query with 5-minute stale time

---

### Phase 4: Frontend -- Username Claim + Portfolio Toggle

**Modified file: `src/pages/ProfilePage.tsx`**

Add a new "Portfolio" section between the action buttons and stats:
- Username input with availability check (debounced query)
- Format validation: lowercase, 3-30 chars, alphanumeric + hyphens
- "Generate Bio" button that calls the AI edge function
- Bio preview/edit textarea
- Toggle switch for "Make Portfolio Public"
- Copy URL button showing `wiseresume.lovable.app/p/{username}`

**Modified file: `src/hooks/useProfile.ts`**

- Add `username`, `portfolioBio`, `portfolioEnabled` to the Profile interface
- Update fetch/update functions to include the new columns

---

### Phase 5: Route Registration

**Modified file: `src/App.tsx`**

Add the public route (outside ProtectedRoute, outside AppShell):
```
<Route path="/p/:username" element={<PublicPortfolioPage />} />
```

---

### Files Created
- `src/pages/PublicPortfolioPage.tsx` -- the public portfolio page
- `src/hooks/usePublicPortfolio.ts` -- data fetcher hook
- `supabase/functions/generate-portfolio-bio/index.ts` -- AI bio generator

### Files Modified
- `src/App.tsx` -- add `/p/:username` route
- `src/hooks/useProfile.ts` -- add username/bio/enabled fields
- `src/pages/ProfilePage.tsx` -- add portfolio settings section

### Database Changes
- `profiles` table: add `username`, `portfolio_bio`, `portfolio_enabled` columns
- New RPC function: `get_public_portfolio(p_username text)`

### Security Model
- Portfolio data is served through a SECURITY DEFINER function (same pattern as resume sharing)
- No direct anon access to `profiles` or `resumes` tables
- Email and phone are stripped from the public response by default
- Username uniqueness enforced at DB level with UNIQUE constraint

