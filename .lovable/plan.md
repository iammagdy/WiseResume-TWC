

# Changelog Update to v2.3.0

## What Changes

Only one file needs updating: `public/changelog.json`

### 1. New v2.3.0 entry at the top
- Insert a new first entry with `"version": "v2.3.0"`, `"date": "Feb 20, 2026"`, `"latest": true`
- Summary: the tagline provided in the prompt
- 21 bullet items covering all the portfolio animations, timeline, CTA, editor fixes, navigation changes, and accessibility compliance

### 2. Remove LATEST from existing top entry
- The current top entry (`v2.2.2`) has `"latest": true` -- change it to `"latest": false`

### 3. Version number in Settings
- No code change needed -- the Settings footer already reads the version dynamically from `changelog.json` via `const appVersion = changelogData[0]?.version || 'v2.0.0'`, so bumping the JSON automatically updates the displayed version to "v2.3.0"

### Files changed

| File | Change |
|---|---|
| `public/changelog.json` | Add v2.3.0 entry at position 0 with 21 items; set v2.2.2 `latest` to `false` |

No component code, CSS, routing, or data-fetching changes.

