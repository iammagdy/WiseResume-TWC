# React Contexts (`src/contexts/` and `src/context/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `src/contexts/`, `src/context/`.

**Canonical owner:** `src/contexts/` (plural) for app-wide auth/admin state, `src/context/` (singular) for UI-overlay state.

---

> ⚠ Two directories with near-identical names exist. They are kept separate by purpose, not by accident:
> - `src/contexts/` — app-wide identity / session contexts (large, with side effects).
> - `src/context/` — small UI overlay contexts (presentation only).
> If consolidating, move singular into plural; never the reverse.

## `src/contexts/`

| File | Purpose |
|---|---|
| `AuthContext.tsx` | Wraps `useKindeAuth` + the Supabase token bridge. Exposes `KindeAppUser`, `loading`, `signOut`, `isAuthenticated`. Subscribes to `impersonationStore` so `user` reflects the impersonated identity when active. Clears persisted query caches, editor sessions, and ATS-score caches on sign-out. |
| `DevKitSessionContext.tsx` | Holds the DevKit admin session token (in-memory + `localStorage` keys `devkit_session_token`, `devkit_session_expiry`, `devkit_session_email`). Exposes `getDevKitToken()` (module-level, used by edge-fn callers), `onDevKitLock()` for inactivity-lock listeners, and a 15-minute inactivity auto-lock. |
| `__tests__/` | Vitest specs for the contexts above. |

## `src/context/` (UI overlays)

| File | Purpose |
|---|---|
| `BottomSheetContext.tsx` | Tracks open bottom-sheet count globally (`useBottomSheetOpen()` returns `isAnySheetOpen`). Used to suppress competing UI (e.g. swipe gestures, banners) while a sheet is open. |
| `KeyboardContext.tsx` | Tracks soft-keyboard height/visibility on mobile (Expo client + mobile web). Lets layout components push content above the keyboard. |

## Hard rules
- `AuthContext` is the **only** approved place to read Kinde + Supabase identity. Never call `useKindeAuth()` directly outside of this context.
- `getDevKitToken()` is the **only** way edge-fn callers should retrieve the admin token (do not read `localStorage` directly).
- All four contexts must be mounted at app root (`src/App.tsx` / `src/AppInterior.tsx`) so route-level code can rely on them unconditionally.
