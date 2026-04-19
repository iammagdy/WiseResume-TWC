# Phase 2 — Frontend Re-render & Bundle Fixes

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `.local/tasks/phase-2-frontend-rerender.md`
- `vite.config.ts` (lines 121–158, chunk strategy)
- `src/AppInterior.tsx` (lines 58–170, 229–231 — lazy routes)
- `src/components/templates/`
- `src/components/editor/LivePreviewPanel.tsx`
- `src/lib/lazyWithRetry.ts`
- `src/pages/DashboardPage.tsx`
- `project-governance/CHANGELOG.md` entry dated 2026-04-18 — Phase 2

**Canonical owner:** `.local/tasks/phase-2-frontend-rerender.md` (task brief) + the React component sources listed above (live truth).

---

**What it is:** Frontend performance pass that removes the editor-typing jank, hardens lazy chunk loading on flaky networks, trims `framer-motion` out of the critical bundle, and virtualizes the dashboard resume list so users with 50+ resumes still scroll smoothly.

**Where it lives:** Resume template sub-components, the live preview hook, the layout shell, the lazy-loading wrapper, and the dashboard list component.

**Key facts:**
- Repeated template sub-components (Experience block, Education item, Achievement, Bullet) wrapped in `React.memo` with shallow-prop comparison. Parent props stabilised via `useMemo` / `useCallback`. → `src/components/templates/`
- Live preview is fed via an 80–120ms debounce so keystroke bursts coalesce into a single render pass. → `src/components/editor/LivePreviewPanel.tsx`
- Layout-shell primitives (non-animated containers) use plain elements instead of `motion.div` so the `framer-motion` chunk is no longer pulled into the critical path. → `src/AppInterior.tsx:58-170,229-231`, `vite.config.ts:121-158`
- All remaining raw `lazy()` calls — notably `AuroraBackground` — go through `lazyWithRetry`, which retries transient chunk-load failures instead of leaving the UI broken. → `src/lib/lazyWithRetry.ts`
- Dashboard resume list switches to `@tanstack/react-virtual` once the list exceeds ~30 rows; small lists render unchanged. → `src/pages/DashboardPage.tsx`

**Related cards:** `../critical-systems/10-ai-studio-and-agentic-chat.md` (editor surface), `../pages/dashboard.md`, `../frontend-layer/` cards.

---

## Addendum — Task #50 (2026-04-19): React Query cache key scoping fixes

**What it fixes:** Two React Query cache bugs where keys were too broad, causing either cross-user data bleed or over-eager refetches.

**Bug 1 — `useChatSessions` cross-user cache bleed:**
- `queryKey` changed from `['chat_sessions']` to `['chat_sessions', user?.id]` in `useChatHistory.ts`.
- `useDeleteChatSession`'s `invalidateQueries` target updated to match: `['chat_sessions', user?.id]`.
- Without the fix: if two users signed in sequentially in the same tab, the second user could see the first user's Wise AI Chat sessions during the 30-second stale window.

**Bug 2 — `deleteVersion` invalidating all resume version caches:**
- `deleteVersion` mutationFn input changed from `versionId: string` to `{ versionId: string; resumeId: string }` in `useResumeVersions.ts`.
- `onSuccess` now invalidates `['resume-versions', variables.resumeId]` instead of the global prefix `['resume-versions']`.
- Call site in `VersionHistorySheet.tsx` updated to pass `{ versionId: version.id, resumeId: resumeId! }`.
- Without the fix: deleting one version triggered a refetch of the version list for every resume the user had open, not just the affected one.

**Rule that must be maintained:** Every React Query key for user-scoped or entity-scoped data must include the scoping ID. Never invalidate on a bare prefix key when a scoped key is the correct target. See `../frontend-layer/hooks.md` — Shared React Query cache keys table.
