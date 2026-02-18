
# What's New Dot Badge on Home Tab

## Goal
Add a subtle, professional notification dot to the Home tab icon in the bottom nav bar that appears when the latest `changelog.json` version hasn't been seen by the user yet. It dismisses permanently (per localStorage) when the user navigates to the Dashboard (Home tab), which is where the "What's New" changelog dialog already lives.

## Design Decisions

**Visual approach — restrained and professional:**
- A small `6×6px` filled circle dot, positioned at the top-right of the Home icon
- Uses `bg-primary` color (theme-aware, matches the app accent)
- No animation (no pulse, no bounce) — static and calm. Motion would be distracting given the project guidelines emphasize active:scale-95 and haptics only for intentional interaction
- The dot sits at `top-0 right-0` of a `relative` wrapper on the icon, not overlapping the label
- Fades in with a short `animate-in fade-in` on first render so it doesn't feel jarring

**Dismissal behavior:**
- Dot appears when `localStorage.getItem('lastSeenChangelog')` !== `changelog.json[0].version`
- Dot disappears as soon as the user taps the Home tab (we mark it seen on navigation to `/dashboard`)
- We also mark it seen when the user opens the changelog dialog in Settings (future-proof via a shared localStorage key `CHANGELOG_SEEN_KEY`)

## Implementation

### New hook: `src/hooks/useChangelogBadge.ts`
Encapsulates all the badge logic cleanly:
```ts
const SEEN_KEY = 'lastSeenChangelog';
const CHANGELOG_URL = '/changelog.json';

export function useChangelogBadge() {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    fetch(CHANGELOG_URL)
      .then(r => r.json())
      .then((data: { version: string }[]) => {
        const latest = data[0]?.version;
        const seen = localStorage.getItem(SEEN_KEY);
        if (latest && seen !== latest) setHasNew(true);
      })
      .catch(() => {}); // silently ignore fetch failure
  }, []);

  const markSeen = useCallback(() => {
    // Re-fetch latest version to mark precisely
    fetch(CHANGELOG_URL)
      .then(r => r.json())
      .then((data: { version: string }[]) => {
        const latest = data[0]?.version;
        if (latest) {
          localStorage.setItem(SEEN_KEY, latest);
          setHasNew(false);
        }
      })
      .catch(() => {});
  }, []);

  return { hasNew, markSeen };
}
```

### Modified: `src/components/layout/BottomTabBar.tsx`
1. Import `useChangelogBadge`
2. Call the hook at component level
3. When `handleTabPress` is called for the Home tab (`tab.path === '/dashboard'`), call `markSeen()`
4. In the icon render, for the Home tab only, wrap the Icon in a `relative` div and render a conditional `<span>` dot:

```tsx
<div className="relative">
  <Icon ... />
  {tab.path === '/dashboard' && hasNew && (
    <span
      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background animate-in fade-in duration-500"
      aria-label="New updates available"
    />
  )}
</div>
```

**Why `border-2 border-background`?** This creates a subtle "halo" around the dot that separates it cleanly from the icon, which is the standard professional notification dot pattern (iOS, Gmail, Slack all use this technique). It also ensures the dot is readable on both dark and light themes.

**Why no animation?** A `pulse` or `bounce` animation on a persistent nav element would be visually noisy across every page navigation. The dot's presence alone is sufficient signal — subtle but noticeable.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useChangelogBadge.ts` | New hook — fetches changelog, compares to localStorage, exposes `hasNew` + `markSeen` |
| `src/components/layout/BottomTabBar.tsx` | Import hook, render dot on Home icon, call `markSeen` on Home tab press |

## Edge Cases Handled
- Fetch fails (network offline, APK) → `catch(() => {})` → dot simply doesn't appear (safe default)
- First-time user with no `localStorage` entry → dot appears (correct, they haven't seen any changelog)
- User who has seen the changelog via Settings dialog → if `SettingsPage` also calls `markSeen` (or writes to the same `SEEN_KEY`), dot will already be cleared. The key `lastSeenChangelog` is already used in `SettingsPage` for the changelog dialog — the hook will reuse the exact same key so they stay in sync automatically
- Navigating to Dashboard via URL (not the tab) → dot persists until they tap the tab (acceptable — the tab tap is the explicit "I see it" gesture)
