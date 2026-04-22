# Phase 10 — Editor session restore + dashboard cold-load cache

**Last verified:** 2026-04-21
**Type:** stability fix
**Sources:**
- `src/lib/editorSession.ts` (per-resume `sessionStorage` snapshot of activeTab + per-tab scroll + open AI sheet + per-section expanded entry, TTL'd)
- `src/lib/persistedQueryCache.ts` (bounded localStorage envelope used to prime React Query)
- `src/pages/EditorPage.tsx` (restore-once-per-resume effect, throttled scroll listener, sheet-id ↔ open-flag mapping, refresh-aware `beforeunload` guard)
- `src/hooks/useExpandedEntryRestore.ts` (drop-in `useState` replacement for entry-list sections that persists the expanded card per resume)
- `src/components/editor/{Experience,Education,Projects,Publications,References,Volunteering,Certifications}Section.tsx` (use `useExpandedEntryRestore`)
- `src/hooks/useResumes.ts` (`placeholderData` from persisted resume list + queryFn-only write-through, scoped per `user.id`)
- `src/hooks/useResumeScore.ts` (in-memory `scoreCache` now hydrates from + persists to `localStorage`, plus `clearAllCachedScores`)
- `src/contexts/AuthContext.tsx` (calls `clearAllPersistedCaches` / `clearAllCachedScores` / `clearAllEditorSessions` on auth user-id change and on `signOut`)
- `CHANGELOG.md` 2026-04-21 "Restore the exact editing spot after refresh and warm the dashboard from cache"

**Canonical owner:** `project-governance/ARCHITECTURE.md` §3 (Frontend boot + state lifecycle)

---

## Why it exists

Two related papercuts on the editor / dashboard hot path:

1. **Editor refreshes always landed back on the Contact step at scroll-top, with every AI sheet closed.** Zustand's resume-store persistence already kept the *resume content* across refreshes, so the data was safe — but the *UI state* (which step, where in that step, whether the user was deep inside Tailor / Recruiter Sim / Career Path / etc.) was thrown away. Every accidental refresh — including the silent stale-chunk recovery from Phase 9 — lost the user's editing spot. The browser's `beforeunload` prompt was the only "protection" and it was both annoying (every refresh) and useless (refresh is safe).
2. **The dashboard cold load showed a skeleton on every visit even when the resume list hadn't changed.** React Query's in-memory cache is gone after a hard refresh, so the dashboard always re-issued the Supabase `select * from resumes` round-trip before painting cards. The same was true of the per-resume ATS score cache in `useResumeScore` — a process-local `Map` that started empty on every boot, forcing the dashboard's background scoring fan-out to re-issue identical `score-resume` invocations for every card.

## How it works now

### Editor session restore (per-resume)

`src/lib/editorSession.ts` exposes a tiny CRUD over a single `sessionStorage` key (`wr-editor-session`) holding a `Record<resumeId, EditorSession>`. Each entry tracks `activeTab`, `scrollByTab` (per-tab scroll offsets), `moreSubSection`, `openSheet` (one of 17 typed `EditorSheetId`s), and `updatedAt`. Entries expire after 24 hours and the map is capped at 20 most-recent resumes so `sessionStorage` cannot grow unbounded.

`EditorPage` wires three effects:
- **Restore-once-per-resume.** When `currentResume` finishes hydrating, `readEditorSession(currentResumeId)` runs exactly once (gated by `sessionRestoredRef`). It re-applies `activeTab`/`activeSection`/`moreSubSection`, opens the saved AI sheet via `sheetSetters[openSheet]`, and then restores the saved scroll offset on the next animation frame (with up to 20 retries, since the lazy section component may not have mounted yet). It also flips `hasAutoScrolled.current = true` so the mobile auto-scroll-to-first-input doesn't clobber the restored position.
- **Persist on change.** A second effect serialises `{ activeTab, moreSubSection, openSheet }` whenever any of them changes, but only after the first restore has run for this resume id (so the persist cannot race the restore and overwrite it with the cold-boot defaults).
- **Throttled scroll capture.** A 250 ms throttled `scroll` listener on `scrollContainerRef` writes the current `scrollTop` keyed by the active tab (or `more:${moreSubSection}` when in the More tab). Throttling avoids a write per scroll frame.

`?fresh=1` is a deliberate escape hatch: when present, the URL param is consumed (cleared via `setSearchParams(..., { replace: true })`), the saved session for this resume id is wiped, and the page boots from defaults. This is what to share with a user who somehow ends up with a corrupted session entry that opens a sheet that immediately errors.

The 17-sheet `EditorSheetId` union covers every modal currently surfaced by `EditorPage`: tailor, recruiter sim, AI detector, LinkedIn optimizer, one-page wizard, chat, career path, version history, content library, customize, job analysis, templates, profile import, ATS scan, snapshots, keyword highlighter, share sheet. The mapping lives in a single `useMemo` so adding a new sheet is one entry to add to the union and one entry to add to the setter map.

### Dashboard cold-load priming

`src/lib/persistedQueryCache.ts` is a tiny `localStorage` envelope (`{ v: 1, t, data }`) keyed under a `wr-pcache:` namespace, with a 24 h TTL and a 256 kB per-entry cap. `useResumes` now reads it via `placeholderData: () => readPersistedCache<DatabaseResume[]>(cacheName)` — React Query treats the result as if it were a previous successful response, so the dashboard paints cards immediately on a hard refresh while the live Supabase query revalidates in the background. The query function continues to write through to the cache on every success; a defensive `useEffect` re-syncs in case the success path runs without going through the query function (e.g. data set imperatively elsewhere). The cache key is scoped per `user.id` so two accounts on the same device cannot leak.

`useResumeScore`'s in-memory `scoreCache` Map now hydrates from `wr-pcache:scoreCache` at module load and persists every write through a 250 ms-throttled batch. Entries are TTL'd (24 h) and capped (50 most-recent). Every `scoreCache.set(...)` is paired with a `rememberScoreCacheWrite(key)` so persistence stays in sync. Existing call sites are unchanged.

### Cache-clear discipline

`AuthContext` now calls three new "drop everything" helpers in addition to the existing `queryClient.clear()`:
- `clearAllPersistedCaches()` — every `wr-pcache:*` key.
- `clearAllCachedScores()` — in-memory + localStorage score cache.
- `clearAllEditorSessions()` — the entire `wr-editor-session` blob.

Both code paths run them: the user-id change effect (covers initial sign-in, account switch, sign-out) and the explicit `signOut` callback (covers the Kinde redirect path that may run before the user-id change effect resolves).

### `beforeunload` prompt is now refresh-aware

The "you have unsaved changes" dialog wired in `EditorPage` is kept for tab-close and external navigation but suppressed on refresh. A capture-phase `keydown` listener records the timestamp of the last F5 / Ctrl+R / Cmd+R keypress; the `beforeunload` handler skips the prompt when a refresh keypress fired in the last 2 s. Autosave + the offline write queue + Zustand persistence + the editor session restore make a refresh safe and recoverable, and the prompt was actively interrupting the silent stale-chunk recovery from Phase 9. The browser refresh button is not detectable from JS, but the keyboard shortcut is by far the dominant refresh path; even if an undetected refresh trips the prompt, the post-restore experience is unchanged from before. The in-app navigation guard via `useUnsavedChangesGuard` is unchanged: leaving the editor via the back button or an in-app link still warns when there are unsaved edits.

### Per-section expanded entry restore

`useExpandedEntryRestore(section)` is a drop-in replacement for `useState<string | null>(null)` that persists the expanded entry id per-resume + per-section into `editorSession.expandedBySection[section]`. The seven entry-list sections (Experience, Education, Projects, Publications, References, Volunteering, Certifications) now use it, so a refresh re-expands the same card the user had open. The hook reads from storage exactly once per `(resume, section)` pair and writes through on every state change. AI sheet draft state (Tailor's job description, custom instructions, tips dismissed) is already persisted by the existing Zustand resume store + per-input localStorage entries, so re-opening the saved sheet on refresh restores the draft automatically — no per-sheet draft serialisation was needed.

## Why this is safe

- **Sign-out drops everything.** Both the user-id change effect and `signOut` clear the persisted resume list, scores, and editor sessions, so account switches never leak prior-account state into the new session.
- **TTLs and caps prevent growth.** Editor sessions: 24 h, 20 resumes max. Persisted resume list: 24 h, 256 kB max per entry. Score cache: 24 h, 50 entries max. `localStorage` cannot bloat from these.
- **Restore is gated.** The session-restore effect runs once per resume id; the persist effect refuses to write until restore has run. There is no path where a cold boot can overwrite the saved session before reading it.
- **`?fresh=1` is the escape hatch.** Any user ever stuck with a session entry that auto-opens a misbehaving sheet can be sent a `?fresh=1` link; the param is consumed and the page reboots clean.
- **`placeholderData` doesn't lie about freshness.** React Query keeps `isPlaceholderData: true` until the live fetch lands, so any code that wants to gate behaviour on "is this data really live" can still tell.
- **Score persistence respects existing invalidation.** The cache key is `${resumeId}:${updatedAt}` — any edit bumps `updated_at` on Supabase and the new key misses the cache, exactly like before. Persistence only avoids re-fetching scores for resumes that *haven't* been edited.

## What this does NOT change

- No change to the Zustand resume-store persistence (`src/store/resumeStore.ts`) — it already persisted `currentResume` across refreshes; we layered UI-state restore on top.
- No change to the autosave debounce, conflict guard, or offline write queue (`src/hooks/useEditorAutosave.ts`).
- No change to `useUnsavedChangesGuard` or the in-app navigation warning.
- No change to the React Query defaults in `src/App.tsx`; `placeholderData` is opt-in per call site.
- No change to the Phase 9 stale-chunk silent recovery — Phase 10 makes that recovery *also* silent in terms of editor state, since the user lands back where they were.

## Verification

- `tsc --noEmit` — clean.
- `vite build` — clean (49.76 s, no new warnings).
- Manual: open editor on Experience tab, scroll halfway down, open Tailor sheet, hard-refresh. Page reloads on Experience tab at the same scroll offset with Tailor sheet still open. Add `?fresh=1` to the same URL: page reloads on Contact tab at scroll-top with no sheet open, and the param is stripped. Sign out and sign back in: dashboard prints skeletons (cache cleared); next refresh paints from cache instantly.
