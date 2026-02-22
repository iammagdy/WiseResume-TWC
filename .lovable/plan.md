

# Complete Universal Link Shortener — Final Wiring

## Current State

The previous implementation already completed most of the work:
- `shareUtils.ts` has `createShortUrl()` and `shareAsLink()` uses it (short links for resume sharing -- done)
- `ShareSheet.tsx` calls `shareAsLink()` which auto-shortens (done)
- `useCreateShortLink` accepts optional `targetUrl` param (done)
- `ShortLinkPage.tsx` handles universal `target_url` redirects (done)

## What's Left

Only one small change remains: the **VisitorsPanel** creates portfolio short links without populating `target_url`, so those links won't resolve correctly via the updated `ShortLinkPage`.

### File: `src/components/portfolio/VisitorsPanel.tsx`

Update `handleCreate` (line 432-433) to pass `targetUrl` when creating portfolio short links:

```typescript
// Before:
createLink(
  { userId, portfolioUsername: username, label: newLinkLabel.trim() },

// After:
createLink(
  { userId, portfolioUsername: username, label: newLinkLabel.trim(), targetUrl: `/p/${username.toLowerCase()}` },
```

This ensures new portfolio short links also have a `target_url` value, making them compatible with the universal redirect logic.

## Summary

| File | Change |
|------|--------|
| `src/components/portfolio/VisitorsPanel.tsx` | Add `targetUrl` param to `createLink()` call (1 line) |

That's it -- one line change to complete the universal link shortener integration.
