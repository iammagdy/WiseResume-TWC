

# Clean Up Changelog -- Remove Developer Jargon

## Problem
Two items in the v1.6.0 changelog entry are developer-facing or use technical jargon that regular users won't understand.

## Changes

### `public/changelog.json` -- Fix v1.6.0 items (lines 141-166)

**Remove entirely:**
- "Dynamic changelog" -- this describes an internal implementation detail ("loads from a JSON file at runtime -- no code changes needed to update them"). Users have no reason to know how the changelog is built.

**Reword:**
- "Real-time AI health indicator" -- keep the feature but replace "gateway latency and availability" with plain language users understand.
  - **Before:** "Live status badge shows gateway latency and availability on every AI-powered page."
  - **After:** "A live status badge on AI-powered pages lets you know if the AI is ready or experiencing slowdowns."

**Update the v1.6.0 summary** to remove the implicit reference to the removed item:
- **Before:** "AI status at a glance, 30+ templates, and a settings page rebuilt from scratch."
- **After:** "AI status at a glance, 30+ templates, new editor tools, and a settings page rebuilt from scratch."

### No other versions need changes
All other entries (v1.0.0 through v2.2.2, excluding v1.6.0) are already written in clear, user-facing language.

## Files modified
- `public/changelog.json` -- reword one item, remove one item, update summary in v1.6.0

