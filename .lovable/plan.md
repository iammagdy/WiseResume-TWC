

## One-Time Migration: Upload Existing localStorage Gemini Key to Server

### What This Does
When a returning user logs in, the app checks if their old `geminiApiKey` still exists in the `wiseresume-settings` localStorage entry (from before the security refactor). If found, it automatically uploads the key to the server-side encrypted store, then removes it from localStorage so it only runs once.

### Implementation

**New file: `src/lib/migrateLocalKeys.ts`**

A single async function `migrateLocalKeysToServer()` that:
1. Reads raw JSON from `localStorage.getItem('wiseresume-settings')` and parses the `state` object inside (Zustand persist format).
2. Checks if `state.geminiApiKey` exists and is non-empty.
3. If yes, calls `supabase.functions.invoke('manage-api-keys', { body: { ... } })` to save it server-side with the existing `geminiKeyTier`.
4. On success, removes `geminiApiKey` and `elevenlabsApiKey` from the persisted state object and writes it back to localStorage.
5. Sets a flag `localStorage.setItem('wiseresume-keys-migrated', '1')` so it never runs again.
6. If the user is not authenticated (no session), skips silently -- the migration will retry next time.

**Modified file: `src/contexts/AuthContext.tsx`**

After auth state resolves with a valid user (inside `resolveInitialLoad` when `user` is not null), call `migrateLocalKeysToServer()` once. This ensures the migration runs on the first authenticated session after the update.

### Technical Details

- The `manage-api-keys` edge function already accepts `{ provider, apiKey, keyTier }` in the POST body -- no changes needed there.
- The migration reads the raw localStorage JSON directly (not via Zustand) because `partialize` now excludes these fields from the store hydration.
- The `'wiseresume-keys-migrated'` flag ensures zero overhead on subsequent app starts.
- Errors are caught and logged silently -- the user can always re-enter their key manually if the migration fails.
