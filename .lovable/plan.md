

# Replace Website Footer with Mobile App Closing Section

## Problem
The current footer has website-style elements (Privacy Policy, Terms of Service, Contact links, social media icons) that don't belong in a native mobile app experience. Mobile apps handle legal links in Settings, not footers.

## Solution
Replace the full footer with a minimal, on-brand closing strip that simply anchors the bottom of the landing scroll. It will contain:

- The WiseResume logo mark (small) with "Built with AI" tagline
- A compact copyright line
- No social links, no legal links, no navigation — those belong in Settings

This keeps the landing page feeling complete without looking like a website.

## Technical Details

### File: `src/components/landing/Footer.tsx`

Strip the component down to:
- Keep the gradient divider at top (it transitions nicely from content)
- Keep the logo + "Built with AI" tagline (brand reinforcement)
- Keep the copyright line
- Remove: Privacy/Terms/Contact links, social icon row, glass background complexity
- Result is roughly 30 lines instead of 100+

### No other files change
`Index.tsx` already imports and renders `<Footer />` at the bottom — that stays the same.

