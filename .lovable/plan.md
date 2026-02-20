

# Add Changelog Entry v2.3.1

## What Changes

Add a new patch version `v2.3.1` to `public/changelog.json` as the latest entry, covering the two recent enhancements. Mark it as `latest: true` and set the previous `v2.3.0` entry to `latest: false`.

## Updated File

### `public/changelog.json`

Insert a new object at position `[0]` in the array:

```json
{
  "version": "v2.3.1",
  "date": "Feb 20, 2026",
  "latest": true,
  "summary": "A quick polish pass -- the splash screen now features a twinkling star-field and you can replay it any time from Settings.",
  "items": [
    {
      "title": "Star-field splash background",
      "description": "Thirty softly twinkling stars drift inward toward the logo during the splash animation, with a faint nebula glow behind them for a cinematic space feel."
    },
    {
      "title": "Replay Splash Screen in Settings",
      "description": "A new button in Settings > About & Help lets you re-watch the animated intro whenever you want."
    },
    {
      "title": "Reduced-motion compliance",
      "description": "All new splash animations are fully disabled when the OS-level Reduce Motion preference is active -- stars render as static dots instead."
    }
  ]
}
```

Set the existing `v2.3.0` entry's `"latest"` field from `true` to `false`.

No other files change. The app version badge in Settings and the changelog dialog will automatically pick up the new entry since they read from this JSON file at runtime.

