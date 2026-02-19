

# Update Changelog to v2.2.1

## What Changes

Update `public/changelog.json` to add a new `v2.2.1` entry at the top, following the exact same schema as existing entries. Set the current v2.2.0 entry's `latest` to `false`.

## New Entry

```json
{
  "version": "v2.2.1",
  "date": "Feb 19, 2026",
  "latest": true,
  "summary": "A focused mobile polish pass -- the portfolio page is cleaner, the install banner stays out of the way, and empty states guide you forward.",
  "items": [
    {
      "title": "Portfolio Overview hero card",
      "description": "Status, public link, stats, and publish toggle are now combined into one compact card at the top of the Portfolio page."
    },
    {
      "title": "Empty sections hide automatically",
      "description": "Portfolio sections with no content are hidden by default -- tap 'Add more sections' to reveal them when you're ready."
    },
    {
      "title": "Skills label updated",
      "description": "'Skills Visibility' is now 'Skills on your portfolio' with a clearer count of highlighted skills."
    },
    {
      "title": "Install banner stays out of the way",
      "description": "The PWA install prompt now sits just above the tab bar on small phones instead of floating over your content."
    },
    {
      "title": "Better empty state for Applications",
      "description": "When you have no tracked applications, a clear centered prompt helps you add your first one."
    },
    {
      "title": "Job titles are always readable",
      "description": "Truncated job titles on application cards now reveal the full name on long-press or hover."
    }
  ]
}
```

## Existing v2.2.0 Entry

Change `"latest": true` to `"latest": false` on the v2.2.0 entry. No other changes to existing entries.

## File Changed

| File | Change |
|---|---|
| `public/changelog.json` | Insert new v2.2.1 object at position [0]; set v2.2.0 `latest` to `false` |

No runtime code, logic, or schema changes.

