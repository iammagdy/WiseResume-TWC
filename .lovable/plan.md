

# Add 6 New Screens to the Web App

## Overview
Create 6 new React page components matching the screens added to the Flutter blueprint: NotFoundPage (already exists, skip), HelpPage, AnalyticsPage, SubscriptionPage, ReferralPage, and AchievementsPage. Wire them into routing, navigation, skeletons, and page titles.

Note: NotFoundPage already exists at `src/pages/NotFound.tsx` with all the features described (404 gradient text, quick links, go-back). We only need to add the 5 remaining screens.

## New Files to Create

### 1. `src/pages/HelpPage.tsx`
- Header with BackButton and "Help & FAQ" title
- Search input to filter FAQ items
- Accordion (using existing Radix accordion) for FAQ items (hardcoded initial set: "How to create a resume", "How to export PDF", "What is ATS score", etc.)
- Contact support card with email link and in-app feature request button (reuse FeatureRequestDialog from settings)
- Quick-link chips to Guides, Examples, Career pages
- Video tutorials section (placeholder cards linking externally)

### 2. `src/pages/AnalyticsPage.tsx`
- Header with BackButton and "Analytics" title
- Summary stat cards row (total resumes, avg ATS score, total applications, active streak)
- Data sourced from existing hooks: `useResumes`, activity streak query, applications query
- Resume score trend line chart (using recharts, already installed)
- Application funnel visualization (applied > interview > offer counts)
- Activity streak / heatmap calendar (last 30 days, similar to existing ActivityStreak component pattern)
- Export report button (placeholder toast)

### 3. `src/pages/SubscriptionPage.tsx`
- Header with BackButton and "Subscription" title
- Current plan card (Free tier, hardcoded for now)
- Plan comparison: Free vs Pro vs Premium with feature checklists
- Usage meters (resumes created / limit, AI credits concept)
- Gradient CTA buttons for upgrade (placeholder toast "Coming soon")
- Link to ReferralPage at bottom

### 4. `src/pages/ReferralPage.tsx`
- Header with BackButton and "Invite Friends" title
- Unique invite code display (generated from user ID substring)
- Copy button and native share via `navigator.share`
- QR code using existing `qr-code-styling` package (already installed)
- Referral stats cards (placeholder: invites sent, accepted, rewards)
- Rewards tier list (3 friends = 1 week Pro, etc.)

### 5. `src/pages/AchievementsPage.tsx`
- Header with BackButton and "Achievements" title
- Level / XP progress bar at top
- Badge grid (2 columns): earned vs locked with icons and descriptions
- Milestones: first resume, 5 applications, 80+ ATS score, 7-day streak, etc.
- Streak tracker card (reuse ActivityStreak data pattern)
- Share achievement button (placeholder)
- Data computed from existing hooks (resume count, application count, score history)

## Files to Modify

### `src/App.tsx`
- Add lazy imports for all 5 new pages
- Add routes inside ProtectedRoute > AppShell:
  - `/help` with `DetailSkeleton` fallback
  - `/analytics` with new `AnalyticsSkeleton` fallback
  - `/subscription` with `DetailSkeleton` fallback
  - `/referral` with `DetailSkeleton` fallback
  - `/achievements` with `DetailSkeleton` fallback

### `src/components/layout/PageSkeletons.tsx`
- Add `AnalyticsSkeleton` (header + stat cards + chart area + list)
- Add `AchievementsSkeleton` (header + progress bar + badge grid)

### `src/lib/pageTitles.ts`
- Add entries: `/help` > "Help", `/analytics` > "Analytics", `/subscription` > "Subscription", `/referral` > "Invite Friends", `/achievements` > "Achievements"

### `src/lib/navigation.ts`
- Add back routes:
  - `/help` > `/settings`
  - `/analytics` > `/dashboard`
  - `/subscription` > `/settings`
  - `/referral` > `/subscription`
  - `/achievements` > `/dashboard`

### `src/components/layout/BottomTabBar.tsx`
- Add `/help`, `/analytics`, `/achievements`, `/subscription`, `/referral` to the Home tab's `matchPaths` array

### `src/pages/SettingsPage.tsx`
- Add navigation rows in the Account section for Help, Subscription, and Referral (using SettingsRow pattern with ChevronRight)

### `src/pages/DashboardPage.tsx`
- Add quick-action links/cards for "Analytics" and "Achievements" in the action cards area

## Technical Notes
- All pages follow the existing pattern: default export function, BackButton header, mobile-first layout, `pb-24` for bottom tab clearance
- All new pages are lazy-loaded with `lazyWithRetry` and wrapped in `Suspense` with appropriate skeleton fallbacks
- No database changes needed -- all data comes from existing tables/hooks
- Uses existing installed packages: `recharts` for charts, `qr-code-styling` for QR codes, Radix accordion for FAQ
- Follows mobile-first priority (xs/375px breakpoint)

