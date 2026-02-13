

## Remove Guest Mode and Polish Landing Page

This is a significant change that removes the ability for unauthenticated users to use the app (editor, dashboard, etc.) and instead makes the landing page the sole experience for visitors, showcasing why WiseResume is better than competitors. All CTA buttons will redirect to the auth page.

---

### Part 1: Remove Guest Mode Access

**1. Landing Page CTA (`src/pages/Index.tsx`)**
- Change the "Create My Resume" button to navigate to `/auth` instead of `/dashboard` for unauthenticated users
- Change "Browse All Templates" link to navigate to `/auth`
- Keep the "Already have an account? Sign In" link as-is

**2. HeroSection (`src/components/landing/HeroSection.tsx`)**
- Remove the guest resume creation logic from `handleGetStarted` (the `setCurrentResume` + `setCurrentResumeId(null)` + `navigate('/editor')` block)
- For unauthenticated users, navigate to `/auth` instead

**3. BottomCTA (`src/components/landing/BottomCTA.tsx`)**
- Change "Get Started Free" to navigate to `/auth` instead of `/editor`

**4. QuickActions (`src/components/landing/QuickActions.tsx`)**
- Remove the blank resume creation logic; all actions navigate to `/auth` for unauthenticated users

**5. TemplateGallery (`src/components/landing/TemplateGallery.tsx`)**
- Change template clicks and "See all 12 templates" to navigate to `/auth` instead of `/editor`

**6. Dashboard Auth Guard (`src/pages/DashboardPage.tsx`)**
- Add a redirect to `/auth` at the top if `!user` and `!authLoading` (remove guest dashboard access)
- Remove the `SignInPromptDialog` lazy import and guest-gated create handler logic
- Remove guest onboarding localStorage check

**7. Editor Auth Guard (`src/pages/EditorPage.tsx`)**
- Add a redirect to `/auth` at the top if `!user`
- Remove guest banner state, guest sign-in prompt logic, guest beforeunload warning, and the blue guest info banner UI
- Remove `SignInPromptDialog` lazy import and related state

**8. Applications Page (`src/pages/ApplicationsPage.tsx`)**
- Replace the guest teaser screen with a simple redirect to `/auth` if `!user`

**9. AppShell (`src/components/layout/AppShell.tsx`)**
- Remove `GuestSaveBanner` import and rendering
- Remove `GUEST_BANNER_ROUTES` constant

**10. BottomTabBar (`src/components/layout/BottomTabBar.tsx`)**
- Remove the Jobs tab lock icon logic for guests (all tab users will be authenticated)

**11. Settings Page (`src/pages/SettingsPage.tsx`)**
- Remove the `GuestCtaCard` component and guest profile section (all settings users will be authenticated)

---

### Part 2: Polish the Landing Page

Redesign `src/pages/Index.tsx` to be a compelling, feature-rich showcase that makes visitors excited to sign up. The new landing page will include:

**Hero Section (enhanced)**
- Keep the glowing AppIcon and "Build Your Dream Resume" heading
- Update subtitle to be more compelling: "The AI resume builder that actually gets you hired"
- CTA button text: "Get Started Free" navigating to `/auth`
- Add "Already have an account? Sign In" link

**Social Proof Bar (new section)**
- "4.9 Rating", "10,000+ Resumes Built", "Free Forever" stats in a glass card

**"Why We're Different" Section (new competitive section)**
- A comparison-style section showing what competitors lack vs. what WiseResume offers:
  - **Other builders**: Generic templates, no AI, no ATS check, no interview prep
  - **WiseResume**: AI writing, ATS scoring, job tailoring, mock interviews, recruiter simulation
- Presented as a visually appealing "Before/After" or checklist comparison card

**Feature Showcase (expanded from existing 3 to 6 features)**
1. AI Writing Assistant -- Enhance bullets and summaries with one tap
2. ATS Score Checker -- Real-time scoring against any job posting  
3. Smart Job Tailoring -- AI adapts your resume to each job automatically
4. Voice Mock Interviews -- Practice with AI voice coaching and real-time feedback
5. 4 AI Recruiter Perspectives -- Get feedback from Fortune 500, Startup, Tech, and Executive viewpoints
6. 12 Professional Templates -- Designs for every industry, fully customizable

**AI Bullet Transform Demo (from WhyWiseResume)**
- Keep the before/after bullet transformation card to show AI power visually

**Template Gallery (keep existing)**
- Keep the horizontal scrolling template previews but update links to `/auth`

**Bottom CTA (enhanced)**
- "Ready to Land Your Dream Job?" heading
- "Get Started Free" button navigating to `/auth`
- Trust indicators: "Free forever", "No credit card", "Ready in 5 minutes"

---

### Part 3: Files Summary

| File | Action |
|------|--------|
| `src/pages/Index.tsx` | Major rewrite -- polished landing page with competitive differentiators |
| `src/components/landing/HeroSection.tsx` | Remove guest resume creation, navigate to `/auth` |
| `src/components/landing/BottomCTA.tsx` | Navigate to `/auth` |
| `src/components/landing/QuickActions.tsx` | Navigate to `/auth` for all actions |
| `src/components/landing/TemplateGallery.tsx` | Navigate to `/auth` for clicks |
| `src/pages/DashboardPage.tsx` | Add auth guard redirect, remove guest logic |
| `src/pages/EditorPage.tsx` | Add auth guard redirect, remove guest banner/prompts |
| `src/pages/ApplicationsPage.tsx` | Replace guest teaser with auth redirect |
| `src/components/layout/AppShell.tsx` | Remove GuestSaveBanner |
| `src/components/layout/BottomTabBar.tsx` | Remove guest lock icon logic |
| `src/pages/SettingsPage.tsx` | Remove GuestCtaCard |

