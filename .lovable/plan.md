

# Generate 8 Professional App Store Screenshots

## Overview
Create a dedicated page (`/store-screenshots`) that renders 8 marketing-style promotional screenshots optimized for App Store and Google Play Store listings. Each screenshot will feature a device mockup frame, gradient background, headline caption, and a real app screen rendered inside.

## The 8 Screenshots

| # | Feature | Headline | App Screen |
|---|---------|----------|------------|
| 1 | Hero / First Impression | "Your AI Career Companion" | Landing page hero with logo and CTA |
| 2 | Resume Builder | "Build ATS-Optimized Resumes" | Dashboard with resume cards and health scores |
| 3 | AI Tailoring | "One-Tap Job Tailoring" | AI Studio tool grid |
| 4 | Mock Interview | "Practice With AI Voice Coach" | Interview page with voice controls |
| 5 | Recruiter Simulator | "Get Honest Recruiter Feedback" | Recruiter Sim results (4 personas) |
| 6 | Templates | "30 Professional Templates" | Templates gallery grid |
| 7 | Job Tracker | "Track Every Application" | Applications Kanban board |
| 8 | Portfolio | "Share Your Online Portfolio" | Public portfolio preview |

## How It Works

### New Page: `src/pages/StoreScreenshotsPage.tsx`
- A hidden utility page (not in bottom nav) accessible at `/store-screenshots`
- Renders all 8 screenshots as full-screen cards (1290x2796px ratio for iPhone 6.7")
- Each card contains:
  - Gradient background (cosmic theme with primary/accent colors)
  - Bold headline text (Space Grotesk, white)
  - Subtitle text describing the feature
  - A phone device frame (CSS-drawn, rounded corners, notch)
  - Inside the frame: a static mockup of the actual app screen (built with real components/styling)
- A "Download All" button that uses `html2canvas` (already installed) to export each card as a PNG

### New Component: `src/components/store/StoreScreenshot.tsx`
- Reusable wrapper component that provides:
  - The gradient background (customizable per screenshot)
  - The device frame (iPhone-style bezels via CSS)
  - Headline and subtitle text overlay
  - Proper dimensions for store requirements

### New Component: `src/components/store/MockScreens.tsx`
- 8 static mock screen components that visually replicate key app screens
- Uses real UI components (Cards, Badges, Buttons) but with hardcoded demo data
- No API calls or state management -- purely visual

### Route Addition
- Add `/store-screenshots` route in the router (no auth guard needed)

## Store Requirements Met

| Store | Size | Covered |
|-------|------|---------|
| App Store (6.7" iPhone) | 1290 x 2796 | Yes -- primary target |
| Google Play | 1080 x 1920 minimum | Yes -- scales down from iPhone size |

## Technical Details

- **Files created**: 3 new files
  - `src/pages/StoreScreenshotsPage.tsx`
  - `src/components/store/StoreScreenshot.tsx`
  - `src/components/store/MockScreens.tsx`
- **Files modified**: 1 file
  - `src/App.tsx` (add route)
- **Dependencies used**: `html2canvas` (already installed), `framer-motion` (already installed)
- **No backend changes needed**
- Design tokens: Uses the app's existing cosmic theme (deep navy `#0B0D17`, primary rose `hsl(355 90% 60%)`, Space Grotesk font)
- Each screenshot card is self-contained and exportable individually or as a batch

