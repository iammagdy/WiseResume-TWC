

## Add v1.6.0 Changelog Entry

### What Changes

**File: `public/changelog.json`**

Add a new entry at the top of the array reflecting the features built in recent sessions:

```text
{
  "version": "v1.6.0",
  "date": "2026-02-16",
  "latest": true,
  "items": [
    {
      "title": "Real-Time AI Health Indicator",
      "description": "Live AI status badge on all AI-powered pages showing real gateway latency and availability. Tap for details including response time and provider info."
    },
    {
      "title": "Dynamic Changelog",
      "description": "Changelog now loads from a JSON file at runtime instead of being hardcoded. Update release notes without any code changes."
    },
    {
      "title": "Settings Page Overhaul",
      "description": "Added sign-out confirmation, change password flow, privacy toggles for all platforms, account stats card, and guest user prompt."
    }
  ]
}
```

Move `"latest": true` from the v1.5.0 entry to the new v1.6.0 entry.

### Verification

After the file is saved, navigate to Settings, tap "Changelog", and confirm the new v1.6.0 section appears at the top with the three items and today's date. The footer version should also update to show "v1.6.0".

### Files to Modify

| File | Change |
|------|--------|
| `public/changelog.json` | Add v1.6.0 entry at top, remove `latest` from v1.5.0 |

