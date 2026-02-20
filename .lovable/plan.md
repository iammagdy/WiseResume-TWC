

# Clean Up v2.2.2 Changelog for Users

## Problem
The current v2.2.2 changelog includes developer-facing items ("Core Web Vitals monitoring", "Developer link is tappable") that don't mean anything to regular users.

## Changes

### `public/changelog.json` -- Remove developer-only items from v2.2.2

**Remove these two items:**
- "Core Web Vitals monitoring" -- internal performance tooling, not user-visible
- "Developer link is tappable" -- relates to the developer credit card, not a user feature

**Keep these four items:**
1. "Smoother border animations" -- users feel the difference
2. "No more white flash on launch" -- users see the difference
3. "Redesigned About card in Settings" -- users see the new card
4. "Bigger tap targets across the app" -- users feel easier tapping

**Update the summary** to remove mention of internal tooling:
> "Smoother animations, a refreshed Settings footer, and better tap targets -- the app feels faster and looks sharper."

### No other files changed

