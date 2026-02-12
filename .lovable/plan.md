

# Redesigned 4-Screen Onboarding Experience

## What Changes

Replace the current 3-screen onboarding carousel with a richer 4-screen welcome journey featuring animated visuals, a 5-step process visualization, AI showcase animations, and an actionable final screen with three starting-point options. Add onboarding analytics tracking and a "Take Tour Again" button in Settings.

## Screen-by-Screen Design

### Screen 1: Welcome and Value Proposition
- App logo (AppIcon) with a pulsing glow animation using framer-motion
- Headline: "AI-powered resumes that land interviews"
- Subheading: "Create professional resumes in 5 minutes with intelligent suggestions"
- Large "Get Started" button at the bottom (advances to screen 2)
- "Skip Tour" link in the top-right corner

### Screen 2: The Five-Step Process
- Five icons (Contact, Summary, Briefcase, GraduationCap, Lightbulb) connected by a vertical flowing line
- Each icon represents: Contact, Summary, Work, Education, Skills
- Headline: "Follow our proven framework"
- Description: "We'll guide you through each section with smart suggestions and examples"

### Screen 3: AI Features Showcase
- Three feature cards that auto-cycle every 3 seconds with a fade/slide animation
- Card 1: "Watch as AI writes your professional summary"
- Card 2: "Get instant optimization suggestions"
- Card 3: "Tailor your resume to any job in seconds"
- Each card has a Sparkles icon with a subtle animation
- Headline: "Powered by Wise AI"

### Screen 4: Choose Your Starting Point
- Three large glass-surface buttons stacked vertically:
  - "Start from Scratch" (FilePlus icon) -- navigates to `/editor`
  - "Upload Existing Resume" (Upload icon) -- navigates to `/upload`
  - "Use a Template" (Layout icon) -- opens the CreateResumeDialog
- Each option has a brief one-line description beneath the label
- Completing any option marks onboarding as done

## First-Time Detection (Already Exists)
- The `profiles.onboarding_completed` column already exists and is checked in `DashboardPage.tsx`
- For guest users (not logged in), use localStorage key `wr-onboarding-seen`
- This ensures guests also see the onboarding once

## "Take Tour Again" in Settings
- Add a new row in the Account section of SettingsPage: "Take Tour Again" with a RotateCcw icon
- Tapping it resets `onboarding_completed` to false in the database (or clears the localStorage flag for guests) and navigates to `/dashboard` where the onboarding will trigger

## Analytics Tracking
- Log onboarding events using the existing `useAIAnalytics` hook with a new action type
- Track: `onboarding_started`, `onboarding_skipped`, `onboarding_completed`, and `onboarding_choice` (which starting point was selected)
- These are logged as entries in the `ai_usage_logs` table with `action_type: 'onboarding'` and metadata containing the specific event

## Technical Details

### Files to Create
- None (reuse existing `OnboardingCarousel.tsx` and `OnboardingStep.tsx`)

### Files to Modify

**`src/components/onboarding/OnboardingCarousel.tsx`** (Major rewrite)
- Replace the 3-step `steps` array with a 4-screen architecture
- Screen 1-3 remain swipeable carousel slides using the existing scroll-snap approach
- Screen 4 replaces the "Get Started" button with three action buttons
- Add `useNavigate` for routing from the final screen choices
- Accept a new `onChoice` callback prop for the "Use a Template" option
- Track analytics events on skip, complete, and choice selection
- Add guest detection: check localStorage `wr-onboarding-seen` for unauthenticated users

**`src/components/onboarding/OnboardingStep.tsx`** (Enhance)
- Support a new `children` prop for custom content (screens 2-4 need custom layouts, not just icon+title+description)
- Keep backward compatibility with the existing icon-based rendering

**`src/pages/DashboardPage.tsx`** (Minor updates)
- Update `OnboardingCarousel` props to handle the new `onChoice` callback
- When choice is "Start from Scratch," navigate to `/editor`
- When choice is "Upload," navigate to `/upload`
- When choice is "Use a Template," open CreateResumeDialog
- Add localStorage fallback for guest onboarding detection

**`src/pages/SettingsPage.tsx`** (Add "Take Tour Again" row)
- Add a SettingsRow in the Account section with RotateCcw icon
- On tap: reset `onboarding_completed` to false in DB (or clear localStorage), show toast, navigate to `/dashboard`

### Guest User Handling
- On first app load, if no user is logged in, check `localStorage.getItem('wr-onboarding-seen')`
- If null, show onboarding; on complete/skip, set `localStorage.setItem('wr-onboarding-seen', 'true')`
- If user IS logged in, use the existing `profiles.onboarding_completed` column (unchanged)

### Animation Details
- Screen 1 logo: `motion.div` with `animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}` on a 3s loop for the glow effect
- Screen 2 flowing line: a vertical SVG line with animated dash-offset to create a "drawing" effect when the screen becomes active
- Screen 3 card cycle: `AnimatePresence` with `mode="wait"` cycling through 3 cards every 3 seconds, using `opacity` and `y` transitions
- Screen 4 buttons: `motion.button` with `whileTap={{ scale: 0.97 }}` and staggered `initial={{ opacity: 0, y: 20 }}` entrance

