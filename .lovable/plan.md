
# UX and Feature Discoverability Improvement Plan

## Analysis Summary

After a thorough review of every major screen and navigation path in the app, I identified several areas where users are likely to miss features, feel overwhelmed, or get lost. The app has ~15+ AI tools, 5 tabs, and dozens of actions spread across multiple pages -- many of which a new user would never naturally discover.

---

## Problem Areas Identified

### 1. Feature Overload on AI Studio
The AI Studio page lists 14 tools in a flat grid with minimal hierarchy. A new user opening this tab sees Proofread, Ideas, Customize, Enhance, Interview, Career, Humanize, LinkedIn, 1-Page, Recruiter, Briefing -- all at once. This creates decision paralysis and makes the most valuable tools (Tailor, Job Match) blend in with niche ones.

### 2. Dashboard is Dense for Returning Users
The dashboard shows a trust banner, portfolio activity card, stats card, career milestones row, quick action chips, search bar, filter bar, and then the resume list -- all stacked vertically. On a small screen, the user must scroll past 4-5 sections before seeing their resumes.

### 3. No Guided "What Should I Do Next?" System
The app has `NextStepBanner` hints (preview, tailor, interview) but they only appear deep inside the Editor after completing sections. There is no dashboard-level guidance telling users "Your resume is 60% done -- finish your Skills section" or "You haven't tailored for a job yet."

### 4. Settings Page Buries Useful Features
Features like "AI Provider", "ElevenLabs Voice", "PDF Defaults", and "Data Export" are buried in Settings. Users who want to change their AI engine or export data would need to scroll through 8+ sections in Settings to find them.

### 5. Bottom Tab Labels Are Vague
"Studio" means nothing to a first-time user. "Applications" is the longest word in the tab bar and gets truncated on small screens. "Portfolio" is unclear for someone who just wants to build a resume.

---

## Proposed Improvements

### Change 1: Add a "What's Next" Action Card to Dashboard
Add a smart, contextual banner below the stats section that suggests the single most impactful next action based on the user's state:

- No resumes: "Create your first resume"
- Resume incomplete: "Finish your [Contact/Experience/Skills] section"
- Resume complete but never tailored: "Tailor your resume for a job posting"
- Resume tailored but never downloaded: "Download your resume as PDF"
- All done: "Practice with a mock interview"

This replaces the need for users to discover features themselves -- the app tells them what to do next.

**File:** `src/components/dashboard/WhatsNextCard.tsx` (new)
**File:** `src/pages/DashboardPage.tsx` (add component between stats and quick actions)

### Change 2: Simplify AI Studio with Categories
Group the 14 AI tools into 3 clear categories instead of a flat grid:

- **Optimize** (Tailor, Job Match, A/B Compare, Proofread, Enhance)
- **Create** (Ideas, Customize, 1-Page, Career Path)
- **Prepare** (Interview, Recruiter Sim, LinkedIn, Humanize, Company Briefing)

Each category gets a header and a brief description so users understand the purpose before scanning tools.

**File:** `src/pages/AIStudioPage.tsx` (restructure the secondary tools grid into categorized sections)

### Change 3: Rename Bottom Tab Labels for Clarity
Change labels to be more intuitive:

- "Home" stays "Home"
- "Editor" stays "Editor"
- "Studio" becomes "AI Tools" (clearer purpose)
- "Applications" becomes "Jobs" (shorter, fits on small screens)
- "Portfolio" stays "Portfolio"

**File:** `src/components/layout/BottomTabBar.tsx` (update labels)
**File:** `src/components/layout/DesktopNav.tsx` (update labels)

### Change 4: Add Feature Discovery Tooltips on First Visit
When a user visits the Dashboard for the first time (after onboarding), show small pulsing dots on the bottom tab icons for "AI Tools" and "Portfolio" with a tooltip that appears on tap:

- AI Tools dot: "Use AI to tailor, proofread, and optimize your resume"
- Portfolio dot: "Create a public portfolio page to share with employers"

These dots dismiss after the user visits each tab once.

**File:** `src/components/layout/BottomTabBar.tsx` (add first-visit indicators using localStorage flags)

### Change 5: Reduce Dashboard Visual Clutter
- Move `CareerMilestonesRow` into the Profile page instead of the dashboard (it's nice-to-have, not primary)
- Make `PortfolioActivityCard` only show if the user has actually set up a portfolio (currently it always renders)
- Collapse the trust banner after 3 visits instead of requiring manual dismissal

**File:** `src/pages/DashboardPage.tsx` (conditional rendering changes)
**File:** `src/components/dashboard/PortfolioActivityCard.tsx` (check for portfolio setup)

---

## Technical Details

### WhatsNextCard Component Logic
```text
Priority order for "What's Next" suggestion:
1. No resumes -> "Create your first resume" (CTA: navigate to create dialog)
2. Has resume, score < 40 -> "Your resume needs work -- edit [weakest section]"
3. Has resume, score >= 40, no tailored versions -> "Tailor for a specific job"
4. Has tailored version, never downloaded -> "Download your resume"
5. Has downloaded, never interviewed -> "Try a mock interview"
6. All complete -> "You're all set! Keep your resume updated"
```

### AI Studio Category Structure
```text
Optimize (improve what you have)
  - Smart Tailor [featured]
  - Job Match Analysis [featured]
  - A/B Compare [featured]
  - Proofread
  - Enhance

Create (generate new content)
  - Ideas / Content Library
  - Customize / Design
  - 1-Page Condenser
  - Career Path Advisor

Prepare (get ready for jobs)
  - Mock Interview
  - Recruiter Simulator
  - LinkedIn Optimizer
  - AI Humanizer
  - Company Briefing
```

### Files Changed Summary

| File | Change |
|------|--------|
| `src/components/dashboard/WhatsNextCard.tsx` | New component -- contextual next-action suggestion |
| `src/pages/DashboardPage.tsx` | Add WhatsNextCard, move CareerMilestonesRow, conditional PortfolioActivityCard |
| `src/pages/AIStudioPage.tsx` | Restructure tools into 3 categorized sections |
| `src/components/layout/BottomTabBar.tsx` | Rename "Studio" to "AI Tools", "Applications" to "Jobs", add first-visit discovery dots |
| `src/components/layout/DesktopNav.tsx` | Match renamed tab labels |
| `src/components/dashboard/PortfolioActivityCard.tsx` | Only render if portfolio is configured |
