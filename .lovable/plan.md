

# Improve App Store Screenshots with Polished Promo Screens

## Problem
The current `MockScreens` components render mostly dark/empty content inside the device frames. The screens use `bg-background` (near-black in dark mode) with minimal content, making the screenshots look hollow and unrepresentative of your actual app.

## Solution
Rewrite `src/components/store/MockScreens.tsx` to create visually rich, marketing-quality promo screens that showcase your real app features with populated data, vibrant colors, and polished layouts -- all built from your existing UI components and branding.

## Changes

### 1. Rewrite `src/components/store/MockScreens.tsx`

Each of the 8 screens will be redesigned with:

**MockHeroScreen** -- Landing hero with your Wise AI logo, "Build Your Dream Resume" headline, trust badges (4.9 stars, 50K+ users), and a gradient CTA button. Use your actual `AppLogo` component and brand colors.

**MockDashboardScreen** -- Populated dashboard showing 3 resume cards with realistic titles ("Senior Frontend Developer" 92%, "Full-Stack Engineer" 78%, "Product Manager" 85%), score rings in green/yellow, last-edited timestamps, and a "Create New Resume" CTA. Add a compact stats row (3 Resumes, 2 Tailored, 85 Avg Score).

**MockAIStudioScreen** -- 6 AI tool cards in a 2x3 grid with distinct colored icons (Smart Tailor in blue, Proofread in red, Enhance in cyan, Recruiter Sim in orange, 1-Page Wizard in amber, Job Match in green). Add a "Wise AI Chat" banner at top with sample prompt chips. Include the AI credits indicator.

**MockInterviewScreen** -- Active interview view with animated-looking waveform bars (static CSS), a question card ("Tell me about your experience with React..."), timer badge (14:32), score badge (82%), and microphone/skip buttons. Add a progress bar showing "Question 3 of 8".

**MockRecruiterScreen** -- 4 recruiter persona cards with emoji avatars, names, roles, verdict badges (Strong Hire/Hire/Consider), and percentage scores. Use green/yellow badge variants for visual variety. Add a header showing "4 AI personas reviewed your resume".

**MockTemplatesScreen** -- 6 template thumbnails in a 2x3 grid with distinct accent colors (slate, blue, purple, gray, rose, amber). Each shows mini resume placeholder lines. Add category filter chips at top (All, Modern, Classic, Creative).

**MockJobTrackerScreen** -- Kanban-style layout with 3 status columns (Applied with blue dot + 2 cards, Interview with yellow dot + 1 card, Offer with green dot + 1 card). Each card shows company name, role, and days ago badge. Add stats row (4 active, 12 total).

**MockPortfolioScreen** -- Profile header with avatar circle, name "Ahmed Hassan", title, "Open to Work" badge, stats row (1.2K views, 8 links, 94% score), and 3 project cards below. Add share/QR icons.

### Key visual improvements
- Replace flat `bg-background` with subtle gradient backgrounds per screen
- Add more populated data rows so screens look full at the 12% scale preview
- Use your existing Card, Badge, Button components for consistency
- Increase text sizes slightly so content is legible even at thumbnail scale
- Add colored accents and icons that pop against the dark cosmic backgrounds

### 2. No other files need changes
The `ScreenshotsGalleryPage.tsx` and `StoreScreenshotsPage.tsx` already render these MockScreen components correctly. The `StoreScreenshot` wrapper handles the device frame, headline, and gradient background.

## Technical Notes
- All screens are pure React components with no state/effects (static mock data)
- Content uses your existing UI primitives: Card, Badge, Button, AppLogo, Lucide icons
- Colors reference your Tailwind theme tokens (primary, muted, foreground, etc.)
- The 1290x2796 capture resolution via html2canvas remains unchanged

