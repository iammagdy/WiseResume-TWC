

# Add 6 New Screens to Flutter Blueprint

## Overview
Add 6 missing screens to `docs/APP_BLUEPRINT_FLUTTER.md`, bringing the total from 35 to **41 screens** across 19 feature modules (3 new modules). Updates touch three areas: the Screen-by-Screen Breakdown (Section 7), the Screen Registry table (Section 20), and the Table of Contents.

## New Screens

### 1. NotFoundPage (`/*` catch-all)
- Feature module: `shared/`
- Styled 404 error page with navigational hub
- Large "404" gradient text, friendly message
- Quick-link buttons: Dashboard, Applications, AI Studio
- "Go Back" button using `context.pop()` / Navigator history
- Route aliases handled in GoRouter redirects (`/jobs/:id` to `/job/:id`, `/jobs` to `/applications`)

### 2. HelpPage (`/help`)
- Feature module: `help/` (new)
- FAQ section using `ExpansionTile` / accordion pattern
- Contact support card (email, in-app feedback form)
- Video tutorial links (open via `url_launcher`)
- Quick-link chips to Guides, Examples, Career pages
- Search bar to filter FAQ items
- Added to Settings page as a navigation row and to the BottomTabBar Home match paths

### 3. AnalyticsPage (`/analytics`)
- Feature module: `analytics/` (new)
- Resume performance trends over time (`fl_chart` line chart)
- Application funnel visualization (applied > interview > offer)
- Weekly/monthly report cards with key metrics
- ATS score distribution across all resumes
- Activity heatmap or streak calendar
- Export report option
- Accessible from Dashboard via a "View All Stats" link

### 4. SubscriptionPage (`/subscription`)
- Feature module: `subscription/` (new)
- Current plan display card
- Plan comparison table (Free vs Pro vs Premium)
- Feature checklist per tier with checkmarks
- CTA gradient buttons for upgrade
- Payment integration placeholder (Stripe / in-app purchase)
- Usage meters (AI credits used, resumes created, etc.)
- Accessible from Settings > Account section and via upgrade prompts throughout the app

### 5. ReferralPage (`/referral`)
- Feature module: `subscription/` (shares module with Subscription)
- Unique invite code display with copy button
- Share invite via `share_plus` (native share sheet)
- QR code for invite link (`qr_flutter`)
- Referral stats (invites sent, accepted, rewards earned)
- Rewards tier list (e.g., 3 friends = 1 month Pro)
- Accessible from Settings and from Subscription page

### 6. AchievementsPage (`/achievements`)
- Feature module: `dashboard/` (extends existing)
- Badge grid (earned vs locked, with icons and descriptions)
- Progress milestones (first resume, 5 applications, 80+ ATS score, etc.)
- Streak tracker (consecutive days active)
- Level / XP progress bar
- Share achievement cards via `share_plus`
- Accessible from Dashboard profile section and Settings

## Changes to the File

### Section 7 additions (after existing 7.17 Onboarding)
Add subsections 7.18 through 7.23 with widget trees for each new screen, matching the existing format (code-fenced text tree + bullet-point details).

### Section 20 updates (Screen Registry table)
Append 6 new rows:

| # | Screen Widget | Route | Feature Module | Description |
|---|---|---|---|---|
| 36 | `NotFoundPage` | `/*` | `shared/` | 404 hub with navigation links |
| 37 | `HelpPage` | `/help` | `help/` | FAQ, support, tutorials |
| 38 | `AnalyticsPage` | `/analytics` | `analytics/` | Trends, funnel, reports |
| 39 | `SubscriptionPage` | `/subscription` | `subscription/` | Plans, pricing, upgrade |
| 40 | `ReferralPage` | `/referral` | `subscription/` | Invite friends, rewards |
| 41 | `AchievementsPage` | `/achievements` | `dashboard/` | Badges, streaks, milestones |

Update total from "35 screens across 16 feature modules" to "41 screens across 19 feature modules."

### Section 5 (Routing Map) updates
Add the 6 new routes to the GoRouter configuration reference.

### Section 6 (Layout) updates
Add `/help`, `/analytics`, `/achievements`, `/subscription`, `/referral` to the BottomTabBar Home tab match paths list.

### Navigation updates
- Dashboard: add links to Analytics and Achievements
- Settings: add rows for Help, Subscription, Referral
- Subscription page: link to Referral

## Technical Details
- File: `docs/APP_BLUEPRINT_FLUTTER.md`
- Adds approximately 120-150 lines across multiple sections
- No other files modified
- 3 new feature modules: `help/`, `analytics/`, `subscription/`
- New screens use existing patterns (glass cards, gradient CTAs, fl_chart, ExpansionTile)
