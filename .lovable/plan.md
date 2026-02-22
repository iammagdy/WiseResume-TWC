

# Share Interview Results as Image Card

## Overview
Add a "Share as Card" feature to the Interview Summary page that generates a beautiful 1200x630 social media image card showing the interview score, duration, top strengths, and branding. This follows the exact same pattern as the existing `CareerCardSheet` component.

## What You'll See
- The existing "Share Results" button (which currently copies text) will open a new bottom sheet
- The sheet shows a live preview of a branded results card with your score, duration, and top answer highlights
- Two visual variants to choose from (Cosmic dark, Clean light)
- Download as PNG or share directly via native share

## New Components

### 1. InterviewResultsCardSheet
A bottom-sheet with:
- Live scaled preview of the 1200x630 card
- Two style variants (Cosmic / Clean)
- Download Image button
- Share button (native Web Share API)

### 2. Card Layout (1200x630)
The card will display:
- WiseResume branding (top-left dot + text)
- "Mock Interview Results" label
- Large score circle (color-coded green/yellow/red)
- Duration and answer count stats
- Top 3 per-answer scores as compact pills
- "Powered by Wise AI" footer

## Changes to Existing Files

### InterviewSummary.tsx
- Add state for the share sheet (`showShareCard`)
- Change the "Share Results" button to open the new sheet instead of copying text
- Pass `summary`, `scores`, `duration`, and `overallScore` to the new sheet

## Technical Approach

| Aspect | Detail |
|--------|--------|
| Capture method | `captureWithRetry` from `html2canvasRetry.ts` (same as CareerCard) |
| Download | `downloadFile` from `downloadUtils.ts` (cross-platform) |
| Share | `navigator.share({ files })` with PNG blob |
| Card size | 1200x630px (standard OG/social media size) |
| Variants | 2 styles: Cosmic (dark gradient), Clean (light) |
| Off-screen render | Absolute positioned div at left: -9999px for html2canvas |

## Files Created
| File | Purpose |
|------|---------|
| `src/components/interview/InterviewResultsCardSheet.tsx` | Sheet + canvas card + download/share logic |

## Files Modified
| File | Change |
|------|--------|
| `src/components/interview/InterviewSummary.tsx` | Import sheet, add state, wire "Share Results" button to open it |

