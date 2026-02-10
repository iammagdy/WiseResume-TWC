

# Improve App Flow and Feature Discoverability

## Current Problems

The app has a confusing user journey with several discoverability issues:

1. **Landing page is overwhelming** -- The space-themed landing page (Hero, SocialProof, HowItWorks, FeatureGrid, TemplateGallery, BottomCTA) has a lot of marketing content but doesn't clearly guide users to take action. The rotating job titles add visual noise without helping users understand what to do.

2. **"Launch Your Resume" goes straight to a blank editor** -- New users click the main CTA and land on an empty editor with no guidance. They don't know what to fill in first or that AI features exist.

3. **Onboarding only shows after sign-up** -- The 3-step onboarding carousel (Upload, AI Tailor, Export) only appears on the Dashboard for authenticated users. Guest users never see it.

4. **Feature discovery is hidden** -- AI features like Tailor, Recruiter Sim, AI Detector, Career Path, etc. are buried behind the AI Assistant Bar at the bottom of the editor. The AI Intro Tooltip helps, but users must already be in the editor to see it.

5. **No clear "what to do next" guidance** -- After creating a resume, users don't know to go to Preview, or that they can tailor it, or practice interviews.

## Proposed Changes

### 1. Simplify the Landing Page Hero (HeroSection.tsx)
- Replace the rotating job titles animation with a clear, static value proposition
- Simplify the CTAs to two clear paths: "Create New Resume" and "Upload Resume"
- Add a small "Sign In" link for returning users instead of the avatar button
- Remove the floating testimonial badges (they're hidden on mobile anyway)

### 2. Add a Quick Feature Tour for First-Time Visitors (new component)
- Create a `FeatureSpotlight` component -- a simple horizontal scroll of 4 cards shown on the landing page between the hero and the rest
- Each card is a clear action: "Create from Scratch", "Upload Existing", "AI Tailor to a Job", "Practice Interview"
- Tapping a card navigates directly to the relevant page

### 3. Add Contextual "Next Step" Prompts in the Editor (EditorPage.tsx)
- When a user has filled in at least contact info + 1 experience, show a subtle banner: "Ready to preview? Tap Preview to see your resume"
- When in Preview, show a prompt: "Want to tailor this for a specific job? Try AI Tailor"
- These are dismissible and stored in settings store

### 4. Improve the Empty Editor State
- When the editor loads with a blank resume, show inline placeholder hints in each section (e.g., "Start by adding your name and contact info" in the contact section header)
- Auto-focus the first field (full name)

### 5. Add a "How It Works" Mini-Guide on Dashboard Empty State (EmptyState.tsx)
- When a user has zero resumes, show 3 simple steps with icons directly in the empty state instead of just a "Create" button
- Steps: "1. Create or Upload", "2. AI enhances it", "3. Download PDF"

## Technical Details

### Files to modify:
- `src/components/landing/HeroSection.tsx` -- Simplify hero, remove rotating titles, clearer CTAs
- `src/components/dashboard/EmptyState.tsx` -- Add mini how-it-works steps
- `src/pages/EditorPage.tsx` -- Add "next step" contextual banner when resume is sufficiently filled
- `src/store/settingsStore.ts` -- Add `hasSeenNextStepHint` flag

### New files to create:
- `src/components/landing/QuickActions.tsx` -- 4-card horizontal scroll with clear action paths
- `src/components/editor/NextStepBanner.tsx` -- Dismissible contextual prompt for next actions

### Files with minor updates:
- `src/pages/Index.tsx` -- Add QuickActions between Hero and SocialProof
- `src/pages/PreviewPage.tsx` -- Add "Try AI Tailor" prompt for first-time users

### No database or backend changes needed -- all state is stored client-side in the settings store.

