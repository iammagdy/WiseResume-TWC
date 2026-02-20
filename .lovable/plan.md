

# Update App Version to v2.2.2

## Overview
Add a new changelog entry for v2.2.2 summarizing the performance, accessibility, and visual polish fixes made in this session. Update the existing v2.2.1 entry to no longer be marked as `latest`.

## Changes

### 1. `public/changelog.json` -- Add v2.2.2 entry and unmark v2.2.1

Prepend a new entry at the top of the array and set `"latest": false` on the v2.2.1 entry.

New entry:

```json
{
  "version": "v2.2.2",
  "date": "Feb 20, 2026",
  "latest": true,
  "summary": "Under-the-hood performance tuning, smoother animations, and a refreshed Settings footer -- the app feels faster and looks sharper.",
  "items": [
    {
      "title": "Smoother border animations",
      "description": "The glowing border effect now uses fewer draw calls on smaller screens, so scrolling and transitions feel snappier -- especially on older phones."
    },
    {
      "title": "Core Web Vitals monitoring",
      "description": "The app now measures real loading and responsiveness metrics (LCP, CLS, INP) behind the scenes to help us catch slowdowns early."
    },
    {
      "title": "No more white flash on launch",
      "description": "Opening the app in dark mode no longer briefly flashes a white screen before your content appears."
    },
    {
      "title": "Redesigned About card in Settings",
      "description": "The WiseResume version card at the bottom of Settings now has a glowing app icon, a version badge, and a proper Changelog button."
    },
    {
      "title": "Developer link is tappable",
      "description": "The website link in the developer credit card now behaves like a real link -- your browser shows the URL on hover and recognizes it as clickable."
    },
    {
      "title": "Bigger tap targets across the app",
      "description": "Buttons and icons that were slightly too small for comfortable thumb use now meet the 44x44px accessibility standard."
    }
  ]
}
```

### 2. No other files changed

The version string in Settings is already read dynamically from `changelog.json`, so no code change is needed -- the footer will automatically show "v2.2.2".

## Files modified
- `public/changelog.json` -- add v2.2.2, set v2.2.1 `latest: false`
