

# Generate 8 Professional App Store Screenshots as Images

## Overview
Create an edge function that uses Lovable AI image generation to produce 8 high-quality promotional screenshots for the App Store and Google Play. The generated images will be stored in a storage bucket and displayed on a new `/screenshots-gallery` page where you can preview and download them.

## Why This Approach
The current `/store-screenshots` page renders screenshots using HTML/CSS and `html2canvas` for export -- but this doesn't work well in the preview environment. Instead, we'll use **AI image generation** (Gemini) to create polished, marketing-grade images and store them as downloadable PNGs.

## What Gets Built

### 1. Storage Bucket
- Create a `screenshots` public storage bucket to hold the generated images

### 2. Edge Function: `generate-store-screenshots`
- Calls the Lovable AI image generation API (`google/gemini-2.5-flash-image`) 8 times with detailed prompts
- Each prompt describes a professional app store screenshot with:
  - Dark cosmic gradient background (deep navy/purple)
  - Bold white headline text (Space Grotesk style)
  - iPhone device frame showing a mock app screen
  - The app's branding (WiseResume / rose-red accent color)
- Uploads each generated image to the `screenshots` storage bucket
- Returns the list of public URLs

### 3. The 8 Screenshot Prompts

| # | Headline | Description for AI |
|---|----------|--------------------|
| 1 | Your AI Career Companion | Hero screen with logo, CTA button, cosmic background |
| 2 | Build ATS-Optimized Resumes | Dashboard showing resume cards with health scores |
| 3 | One-Tap Job Tailoring | AI tools grid with colorful icons |
| 4 | Practice With AI Voice Coach | Interview screen with voice waveform and question card |
| 5 | Get Honest Recruiter Feedback | 4 recruiter persona cards with hire/reject badges |
| 6 | 30 Professional Templates | Template gallery grid with colored previews |
| 7 | Track Every Application | Kanban board with Applied/Interview/Offer columns |
| 8 | Share Your Online Portfolio | Portfolio profile with stats and project cards |

### 4. New Page: `/screenshots-gallery`
- Simple gallery page showing all 8 generated screenshots
- "Generate Screenshots" button to trigger the edge function
- Individual download buttons for each image
- "Download All" button to download a zip or all images sequentially
- Loading state with skeletons while generating

### 5. Database Table: `store_screenshots`
- Columns: `id`, `name`, `headline`, `image_url`, `created_at`
- Stores metadata for generated screenshots so they persist across sessions
- No RLS needed (utility/admin feature, no user-specific data)

## Technical Details

### Files Created
- `supabase/functions/generate-store-screenshots/index.ts` -- Edge function for AI generation + storage upload
- `src/pages/ScreenshotsGalleryPage.tsx` -- Gallery page with download functionality

### Files Modified
- `src/App.tsx` -- Add `/screenshots-gallery` route

### Database Changes
- Create `screenshots` storage bucket (public)
- Create `store_screenshots` table

### Dependencies
- Uses `LOVABLE_API_KEY` (already configured) for AI image generation
- Uses existing storage infrastructure for file hosting
- No new npm packages needed

