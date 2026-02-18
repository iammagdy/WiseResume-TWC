
# Multi-Device Sync Audit: Web + Mobile Simultaneous Editing

## What Was Analyzed

I traced the complete data flow for the scenario where the same user has the editor open on two devices simultaneously (e.g., desktop browser + mobile APK), and one or both devices make changes.

---

## How the Current Architecture Works (Single-Device)

```text
User types on Device A
        |
        v
Zustand store updated (in-memory + localStorage via persist middleware)
        |
        v
3-second debounce fires → saveToCloud() → Supabase UPDATE resumes SET ...
        |
        v
updateResume.mutateAsync() on success → queryClient.invalidateQueries(['resume', id])
```

**Key observation:** `queryClient.invalidateQueries` only refetches data for components that are actively subscribed to that query key. There is **no push notification** from the database to any other device.

---

## Multi-Device Scenario Analysis

### Scenario A: Edit on Web, Mobile Is Idle (Open on Editor Page)

**What currently happens:**

1. User types on web. Zustand updates. 3s debounce fires. `saveToCloud()` runs. Database row updated (with new `updated_at`).
2. On mobile, the editor is showing the **stale cached version** from when it initially loaded.
3. The React Query cache on mobile has `staleTime: 0` for `useResume(id)` — this means the query IS considered stale immediately.
4. BUT React Query only refetches stale data when: the query is remounted, the window is refocused (`refetchOnWindowFocus`, which defaults to `true`), or `queryClient.invalidateQueries` is called.
5. On mobile APK/PWA: `refetchOnWindowFocus` fires when the user switches back to the app via the `visibilitychange` event — BUT the Supabase client and React Query use `focus` and `visibilitychange` events from the browser, which do fire on mobile when the user brings the app to the foreground.

**Result:** If the mobile user switches away and comes back, React Query refetches the resume and gets the latest version from the server. If they **never leave the app**, the mobile view stays stale indefinitely.

**The dangerous gap:** The mobile user is actively looking at the editor showing V1. The web user edits and saves V2 to the database. The mobile user then types something in their stale V1 editor and saves — this overwrites V2 with a version that doesn't include the web edits. **Silent last-write-wins overwrite — no warning.**

### Scenario B: Edit on Mobile, Web Is Idle (Open on Editor Page)

Same as Scenario A but reversed. Same silent overwrite risk on web when web user resumes typing.

### Scenario C: Both Devices Edit Simultaneously

1. Both load V1 from the database.
2. Web user edits Summary → debounce → saves V2 (Summary changed).
3. Mobile user edits Skills → debounce → saves V3 **based on their stale V1** (Summary reverts to V1 text, Skills added).
4. The most recent write wins. Web user's Summary change is **silently lost**.

The existing offline sync conflict detection (`useOfflineSync` / `offlineSyncStore`) only handles the case where `navigator.onLine === false`. It does NOT protect against this "online but stale" scenario.

### Scenario D: AI Action on Device A While Device B Is Open

1. Device A runs Tailor AI. Gets result. Applies to store. Saves to cloud.
2. Device B is still showing pre-AI version in the editor.
3. If Device B user makes a change, they overwrite Device A's AI improvements.

**Result:** AI work is silently lost without any "this resume was updated elsewhere" warning.

---

## What Is Already Safe

| Behavior | Status |
|---------|--------|
| `refetchOnWindowFocus` for React Query | Active by default — when user tabs back, query refetches |
| `visibilitychange` foreground detection | `useAppLifecycle` handles this for save flushing; React Query also fires a refetch |
| `offlineSyncStore` conflict detection | Works correctly for offline→online sync (checks `updated_at` against server) |
| Session persistence | Token refresh is automatic; sessions survive backgrounding |
| localStorage persistence | Zustand persist always has latest local state |

**The key insight:** The `offlineSyncStore` actually has the exact logic needed to detect stale overwrites — it checks `serverTime > change.timestamp` before syncing. But this logic ONLY runs for the offline sync queue, not for the live "online" autosave path.

---

## Proposed Fixes (3 Changes — Light Touch, No Real-Time Logic)

### Fix 1: "Last Updated" label in Editor header with relative time

**Problem:** The user has no awareness that the resume they're looking at may be stale (saved 3 minutes ago by another device).

**Fix:** In `EditorPage.tsx`, show a "Last saved · 3 min ago" label next to the save indicator. This uses the existing `lastSavedAt` Zustand field (already set by `saveToCloud` via `setLastSavedAt`). Format it with `date-fns/formatDistanceToNow`.

This gives the user a passive awareness signal: if they see "Last saved · 8 min ago" when they've been typing for only 2 minutes, they know something else was editing.

**File:** `src/pages/EditorPage.tsx` — the save status area around line 1028–1052.

**Risk:** Very low — purely additive display label.

---

### Fix 2: Stale-resume detection banner on Editor focus/return

**Problem:** When the user returns to the editor (e.g., brings the mobile app to foreground after another device has saved), React Query refetches but silently discards the result if the local Zustand store already has a resume loaded.

Looking at the hydration effect in `EditorPage.tsx` lines 120–138:
```ts
// Hydrate store if needed
if (!currentResume) {
  useResumeStore.getState().setCurrentResume(dbToResumeData(resumeFromDb));
}
```

If `currentResume` is already set (which it is, since Zustand persists to localStorage), the new server data from `resumeFromDb` is **silently ignored**. The stale local version stays in the store.

**Fix:** Extend the hydration effect to detect when `resumeFromDb.updated_at` is **newer** than the locally stored resume's `updatedAt`. If a newer server version exists AND the local store has no pending dirty changes (i.e., `lastSavedResumeRef.current === JSON.stringify(currentResume)` — meaning the user hasn't typed since last save), automatically pull in the fresh data silently and show a brief toast: *"Resume updated — refreshed to latest version."*

If the user HAS typed something (dirty state), show a non-blocking banner: *"This resume was updated on another device. [Discard local · Keep local]"* — using the same visual pattern as the existing `SyncConflictDialog`.

**Files:**
- `src/pages/EditorPage.tsx` — extend the hydration `useEffect` (lines 120–138)
- No new files needed — reuse existing `toast` and the `lastSavedResumeRef` pattern already in the file

**Risk:** Low — extends an existing effect with a timestamp comparison. No new state management needed.

---

### Fix 3: Pre-save timestamp check in `saveToCloud` (online conflict guard)

**Problem:** When `saveToCloud()` fires in an online scenario, it does NOT check whether the server's `updated_at` is newer than the timestamp when the local session started editing. The offline sync queue checks this (via `offlineSyncStore`), but the live online save path does not.

**Fix:** Before calling `updateResume.mutateAsync`, fetch the server's `updated_at` for this resume and compare it against the `resumeFromDb.updated_at` value cached in React Query's cache (already available via `useResume(currentResumeId)`).

If `serverUpdatedAt > localLoadedAt` AND the local session has dirty changes, show the `SyncConflictDialog` (already implemented) by calling `setConflict()` from `offlineSyncStore` — this reuses the entire existing conflict UI.

**Files:**
- `src/pages/EditorPage.tsx` — in the `saveToCloud` callback (around line 242–296), add a quick `resumeFromDb?.updated_at` comparison before writing

**Risk:** Low — adds one timestamp comparison before every save. No UI changes needed — reuses existing `SyncConflictDialog` infrastructure.

---

## Implementation Summary

| # | Change | Files | Risk |
|---|--------|-------|------|
| 1 | "Last saved · X min ago" relative timestamp in Editor header | `EditorPage.tsx` | Very low |
| 2 | Stale-resume detection on foreground return: auto-refresh if clean, show banner if dirty | `EditorPage.tsx` | Low |
| 3 | Pre-save server timestamp check for online multi-device conflict detection | `EditorPage.tsx` | Low |

All three changes are in a single file. No new files. No database changes. No real-time infrastructure. No new hooks.

The changes build directly on top of what's already there:
- `resumeFromDb` (already fetched via `useResume`)
- `lastSavedResumeRef` (already tracking dirty state)
- `SyncConflictDialog` + `offlineSyncStore.setConflict()` (already implemented for offline sync)
- `setLastSavedAt` / `lastSavedAt` (already in the Zustand store)

---

## What Is NOT Changed

- No real-time WebSocket/Supabase Realtime subscription (would add significant complexity)
- No polling mechanism (respects battery and network constraints)
- No changes to the offline sync queue logic
- No changes to the cloud save debounce timing
- No backend changes
- No database schema changes
- The `SyncConflictDialog` UI and resolution flow are reused as-is
