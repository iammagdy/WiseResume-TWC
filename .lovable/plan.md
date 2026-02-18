

## Mobile Interruption Resilience: Analysis and Fixes

### Current State Assessment

The Editor has a solid foundation for data persistence but has one critical gap when running as an APK or PWA on mobile.

---

### How Data Persistence Works Today

```text
User types in Editor
        |
        v
Zustand store updated (in-memory)
        |
        v
useEffect fires on currentResume change
        |
        v
3-second debounce timer starts
        |
        v
saveToCloud() sends to database
        |
        v
On network error: queued in offlineSyncStore (persisted to localStorage)
```

**What's protected:**
- Browser tab close / refresh: `beforeunload` event warns user
- In-app navigation: `useUnsavedChangesGuard` intercepts and shows dialog
- Android back button: `useBackButton` checks for dirty state before navigating
- Keyboard close: dedicated `keyboard-close` event triggers save
- Network loss: changes queued to `offlineSyncStore` (persisted in localStorage)
- Zustand store itself: persisted to localStorage via `zustand/persist`

---

### The Gap: No Save on App Background

**Problem:** When the user switches apps, receives a call, or locks the device, none of the existing save triggers fire:

- `beforeunload` does NOT fire when a mobile app goes to background (only on tab close/refresh)
- The 3-second debounce timer gets suspended by the OS when the app is backgrounded
- If the OS kills the WebView while backgrounded (common on Android with low memory), unsaved changes in the Zustand in-memory store are lost
- The Zustand `persist` middleware only writes to localStorage on state changes, not on a schedule -- so the in-memory state IS already in localStorage. However, the cloud save may not have completed.

**Risk level by scenario:**

| Scenario | Data in localStorage? | Data in Cloud DB? | Risk |
|----------|----------------------|-------------------|------|
| Switch app, return within seconds | Yes | Maybe (depends if 3s debounce fired) | **Low** |
| Switch app, return after minutes | Yes | Maybe | **Low** (store rehydrates from localStorage) |
| Switch app, OS kills WebView | Yes (already persisted) | **No** if debounce hadn't fired | **Medium** |
| Lock device, unlock | Yes | Maybe | **Low** |
| Receive call during AI operation | Yes (pre-AI state) | No (AI result may be lost) | **Medium** |

**Key insight:** Because Zustand's `persist` middleware writes to localStorage synchronously on every state change, the resume data itself is safe in localStorage. The risk is that the **cloud save** (database) may lag behind by up to 3 seconds.

---

### Scenario-by-Scenario Analysis

#### 1. Switch Away Mid-Typing, Come Back

**Current behavior:**
- Zustand store persists to localStorage on every keystroke (synchronous)
- If user returns before OS kills WebView: timer resumes, save completes -- no data loss
- If OS kills WebView: localStorage has latest state, but cloud DB may be 0-3s behind

**Verdict:** Generally safe. The `resumeStore` persistence covers this. Cloud sync is the gap.

**Fix:** Add a `visibilitychange` listener (web) and `appStateChange` listener (Capacitor) to flush `saveToCloud()` immediately when the app goes to background.

#### 2. Call/Notification Mid-Flow

**Current behavior:**
- Incoming call overlay doesn't kill the WebView -- app stays alive
- The 3s debounce timer is paused while app is in background on some Android devices
- When user returns, timer resumes and save fires normally

**Verdict:** Safe in most cases. Same fix as above ensures save fires immediately.

#### 3. Lock/Unlock Device

**Current behavior:**
- Biometric lock activates if enabled (based on `lockTimeout` setting)
- The security curtain (blur) is applied via `appStateChange` in `useBiometricLock`
- After unlock, the Editor resumes normally -- Zustand state is intact

**Verdict:** Safe. Biometric flow is well-implemented.

#### 4. AI Operation Interrupted

**Current behavior:**
- AI calls use `callAIWithRetry` with 30/45/55s timeouts and 3 retries
- If user backgrounds app during an AI call, the fetch continues in the background briefly
- If OS kills the WebView, the AI response is lost (it was never saved)
- No checkpoint is created before AI operations in the autosave flow

**Verdict:** Medium risk. If an AI enhance/tailor completes but the user has already left, the result may not be applied to the store.

**Fix:** The existing `saveToCloud()` should be called before starting any AI operation. This is already partially handled (undo checkpoint), but cloud save is not guaranteed.

#### 5. Export Screen Interrupted

**Current behavior:**
- Export is a client-side operation (html2canvas, pdf-lib) -- no server round-trip
- If interrupted mid-export, the export simply fails silently
- Resume data is not at risk since export is read-only

**Verdict:** Safe. Export can be retried. No data loss possible.

---

### Proposed Fixes (3 Changes)

#### Fix 1: Save on App Background (Critical)

Create a `useAppLifecycle` hook that listens for both:
- `document.visibilitychange` (PWA/browser)
- `App.addListener('appStateChange')` (Capacitor APK)

When the app goes to background, immediately call `saveToCloud()` (bypassing the 3s debounce).

**Where:** New hook `src/hooks/useAppLifecycle.ts`, consumed in `EditorPage.tsx`.

**Technical details:**
- Listen for `document.visibilityState === 'hidden'` and Capacitor `appStateChange { isActive: false }`
- Call the existing `saveToCloud()` ref immediately (no debounce)
- This is a fire-and-forget call -- if the OS kills the app before the network request completes, localStorage still has the data, and `offlineSyncStore` will pick it up on next launch

#### Fix 2: Flush Debounce on Background (Editor-specific)

In `EditorPage.tsx`, when the app goes to background:
- Clear the existing 3s debounce timer
- Call `saveToCloud()` immediately

This ensures the latest keystroke makes it to the database before the OS can kill the WebView.

#### Fix 3: AI Operation Pre-Save

Before any AI operation begins (enhance, tailor, proofread, etc.), ensure `saveToCloud()` is called first. This way, if the AI operation is interrupted, the user's pre-AI state is safely in the database.

**Where:** `EditorPage.tsx` -- wrap the AI trigger callbacks to call `saveToCloud()` first.

**Note:** This is a minor optimization. The undo system already creates snapshots, and localStorage persistence means the pre-AI state is recoverable. But having it in the cloud adds an extra safety net.

---

### What Does NOT Need Fixing

| Area | Why It's Already Safe |
|------|----------------------|
| Auth session persistence | Supabase SDK handles `persistSession: true` and `autoRefreshToken: true`. Session survives app restart. |
| Navigation state (which resume, which section) | `currentResumeId` is in Zustand persisted store. `activeTab` is local state but resets to 'contact' which is acceptable. |
| Offline queue | `offlineSyncStore` is persisted to localStorage. Survives app kill. Syncs on reconnect. |
| Biometric lock on background | Already implemented via `useBiometricLock` with `appStateChange` listener and security curtain. |
| Store hydration | `useResumeStoreHydration` reliably rehydrates from localStorage on app restart. |

---

### Implementation Summary

| # | Change | File | Risk |
|---|--------|------|------|
| 1 | New `useAppLifecycle` hook | `src/hooks/useAppLifecycle.ts` (new) | Very low -- additive only |
| 2 | Wire hook into EditorPage | `src/pages/EditorPage.tsx` | Very low -- adds one hook call |
| 3 | Pre-save before AI operations | `src/pages/EditorPage.tsx` | Very low -- adds `await saveToCloud()` before AI triggers |

No existing business logic changes. No database schema changes. No prompt changes. Pure reliability improvement.

