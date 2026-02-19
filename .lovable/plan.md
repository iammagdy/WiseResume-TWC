
# Retention Strategy — Keeping Users Coming Back After They Land a Job

## Understanding the Core Problem

This is a "peak-and-valley" app: users surge when job hunting, disappear when they land a role, then potentially return years later — but by then they've forgotten the app existed. The goal is to convert it from a **one-time job tool** into a **permanent career companion** that users keep opening even when they're happily employed.

The app already has a solid foundation to build on:
- `notifications` table (already in the DB with push notification infrastructure)
- `career_assessments` table with `completed_milestones`
- `interview_sessions` table (tracks practice history)
- `DashboardStats` already tracks a basic **login streak** (stored in localStorage)
- `DailyTipCard` exists but auto-dismisses after 3 seconds and uses localStorage only
- `open_to_work` flag on profiles (knows if they're job hunting or not)
- `portfolio_visits` table (knows when their public portfolio gets viewed)

---

## The 5 Retention Pillars to Implement

### Pillar 1 — "I Got the Job!" Mode (Post-Hiring Re-engagement)

**Problem:** When a user marks an application as "Offer Received" or "Accepted", there is zero celebration or next-step prompt. They close the app and never return.

**Fix:** When a job application status changes to `offer` or `accepted`:
1. Show a full-screen celebration animation (confetti + haptics) with a "Congratulations!" modal
2. Inside the modal: suggest 3 "Now that you got the job, here's what's next" actions:
   - "Keep your resume updated with your new role" → opens editor
   - "Turn off Open to Work on your portfolio" → one-tap toggle
   - "Set a 3-month reminder to update your resume" → creates a scheduled notification
3. Store the `hired_at` date on the profile → triggers automated re-engagement at 3 months

**Files to change:**
- `src/pages/ApplicationTrackerPage.tsx` — detect status change to `offer`/`accepted`
- New component: `src/components/dashboard/HiredCelebrationModal.tsx`
- DB migration: add `hired_at` to `profiles`

---

### Pillar 2 — Resume Health Decay & "Your Resume is Getting Stale" Notifications

**Problem:** A user lands a job in March, returns in November for a new search, and finds their resume 8 months out of date with no prompting to update it.

**Fix:** A **Resume Freshness System**:
- Track `last_updated_at` on resumes (already stored as `updated_at`)
- When the user opens the app after 30 days of inactivity, show a warm "Your resume is 30 days old" nudge card on the dashboard
- At 90 days: push notification (using existing `send-push-notification` edge function): *"Your resume at [Company] is 90 days old. 2 minutes to keep it fresh."*
- At 180 days: email reminder via a new `send-resume-reminder` edge function

**Files to change:**
- `src/components/dashboard/DashboardStats.tsx` — add "resume freshness" nudge card
- New edge function: `supabase/functions/send-resume-reminder/index.ts`
- DB migration: add `last_reminder_sent_at` to `resumes` table to prevent spam

---

### Pillar 3 — Portfolio View Notifications ("Your Resume Got Seen!")

**Problem:** The `portfolio_visits` table already tracks every person who views the user's public portfolio. This data is currently invisible to the user after they close the app.

**Fix:** This is the **highest-retention hook possible** — people check Instagram notifications obsessively for the same reason. When someone views their portfolio:
1. Create a `notifications` row (already exists in DB!) with type `portfolio_view`
2. Send a push notification: *"Someone in [City] viewed your portfolio today 👀"*
3. On the dashboard, show a "Portfolio Activity" card that shows the last 7 days of view counts with a mini spark chart

**Files to change:**
- `supabase/functions/track-portfolio-view/index.ts` — already exists, add notification creation here
- New component: `src/components/dashboard/PortfolioActivityCard.tsx`
- `src/pages/DashboardPage.tsx` — embed the activity card

---

### Pillar 4 — Career Growth Milestones & Gamification

**Problem:** The `career_assessments.completed_milestones` field exists but nothing visually tracks user progress or rewards consistency. The login streak in `DashboardStats` is already computed but only shows a flame icon with no payoff.

**Fix:** A lightweight **Career Milestone System**:

Milestones triggered automatically (no user action needed):
| Milestone | Trigger | Badge |
|---|---|---|
| First Resume | Creates first resume | 🏆 Resume Builder |
| Interview Ready | Completes first practice session | 🎤 Interview Ace |
| ATS Optimizer | Tailors resume to first job | 🎯 ATS Pro |
| Portfolio Live | Enables portfolio | 🌐 Online Presence |
| 7-Day Streak | 7 consecutive days | 🔥 Dedicated |
| 30-Day Streak | 30 days login | 💎 Career Committed |
| Application Tracker | Logs 5 applications | 📋 Organized |

Show these as a horizontal scrollable badge row on the dashboard — earned badges are colored, unearned are greyed out. Tapping an unearned badge shows a tooltip explaining how to unlock it. This creates clear reasons to return and try features they haven't used.

**Files to change:**
- New hook: `src/hooks/useCareerMilestones.ts` — computes milestone status from existing data
- New component: `src/components/dashboard/CareerMilestonesRow.tsx`
- `src/pages/DashboardPage.tsx` — embed the row
- Move streak from localStorage to DB: add `login_streak`, `last_login_date` to `profiles`

---

### Pillar 5 — Weekly Career Digest (Smart Re-engagement Email/Notification)

**Problem:** There is no scheduled outreach to dormant users. The push notification system exists (`send-push-notification` edge function) but only fires for manual actions.

**Fix:** A **Weekly Career Digest** — a smart summary sent every Monday to users who haven't opened the app in 5+ days:

Content of the digest:
- "Your resume score: 87%" (from last scored result in DB)
- "Your portfolio had 3 views this week"
- "You have 2 applications awaiting response"
- "Tip of the week: [rotating tip]"
- Deep link CTA: "Check your resume →"

**Implementation:**
- New edge function: `supabase/functions/weekly-digest/index.ts`
- Triggered by a cron-style scheduled invocation (pg_cron)
- Uses the existing `notifications` table to store in-app version
- Uses `send-push-notification` for push version

**DB migration:** Add `digest_enabled` boolean (default `true`) to `profiles` with a Settings toggle to opt out.

---

## What NOT to Build

- No annoying daily "streaks will break!" guilt notifications (Duolingo-style anxiety)
- No fake urgency ("Only 3 days to apply!")
- No mandatory check-ins
- All notifications have one-tap opt-out in Settings

---

## Summary of Changes

| Feature | Files | DB Change? |
|---|---|---|
| "I Got the Job!" Celebration + Reminder | `ApplicationTrackerPage.tsx`, new `HiredCelebrationModal.tsx` | `profiles.hired_at` column |
| Resume Freshness Nudge | `DashboardStats.tsx`, new edge function | `resumes.last_reminder_sent_at` |
| Portfolio View Notifications | `track-portfolio-view/index.ts` (existing) | None — uses existing `notifications` table |
| Portfolio Activity Card on Dashboard | New `PortfolioActivityCard.tsx`, `DashboardPage.tsx` | None — queries existing `portfolio_visits` |
| Career Milestones Row | New `CareerMilestonesRow.tsx`, new `useCareerMilestones.ts` | `profiles.login_streak`, `profiles.last_login_date` |
| Weekly Digest | New `weekly-digest/index.ts` edge function | `profiles.digest_enabled` |

---

## Implementation Priority Order

1. **Portfolio View Notifications** — highest impact, almost free to build (edge function already exists, just add 3 lines)
2. **"I Got the Job!" Celebration Modal** — highest emotional moment, creates strongest memory
3. **Career Milestones Row** — most visible retention loop on the dashboard
4. **Resume Freshness Nudge** — passive re-engagement for dormant users
5. **Portfolio Activity Card** — gives users a reason to check the dashboard even when not job hunting
6. **Weekly Digest Edge Function** — scheduled automation (lowest priority, highest long-term ROI)

No new dependencies required. All features use existing infrastructure.
