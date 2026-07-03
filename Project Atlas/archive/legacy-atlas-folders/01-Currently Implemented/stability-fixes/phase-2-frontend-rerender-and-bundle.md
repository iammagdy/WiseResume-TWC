# Phase 2 — Frontend Re-render & Bundle Fixes

**Last verified:** 2026-04-19 (landing FCP + scroll-stack addenda added)
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

---

## Addendum — Landing page FCP fix (2026-04-19): Sentry deferral + hero animation

**What it fixes:** FCP of 5,920–16,288ms; hero painted at opacity:0 and spring-transitioned to visible (~1s gap after background appeared).

**Root causes:**
1. `@sentry/react` (browserTracing + replay) was statically imported by `monitoring.ts`, which was eagerly imported by `ErrorBoundary.tsx` (mounted at the top of `App.tsx`). This put the full Sentry chunk in the entry module graph and ran `Sentry.init()` before first paint.
2. `SCATTER_SECTION_ITEM.hidden(i)` returned `{ opacity:0, filter:'blur(10px)', … }` for all i including i=0 (the hero). The hero mounted invisible and spring-animated to visible after framer-motion parsed its variant.
3. `LandingMotionStage` (carrying the framer-motion chunk) was lazy-loaded with no warmup, adding a waterfall hop between the LpFallback wallpaper and the hero painting.

**Changes:**
- `src/lib/captureErrorShim.ts` (new): Dep-free `captureError()` / `setRealCaptureError()` / `earlyCaptureBuffer` (cap 100). Buffer replays into real Sentry once monitoring.ts loads.
- `src/components/ErrorBoundary.tsx` + `src/components/dev-kit/DevKitPanelBoundary.tsx`: import captureError from shim, not from monitoring.ts. Sentry no longer in entry graph.
- `src/main.tsx`: imports captureError from shim. Post-`createRoot` loads monitoring.ts dynamically via `requestIdleCallback` (1.5s `setTimeout` fallback), wires `setRealCaptureError`, drains buffer. Added `void import('@/components/landing/LandingMotionStage')` warmup to parallelize framer-motion chunk download.
- `src/components/landing/landingAnimations.ts`: `SCATTER_SECTION_ITEM.hidden(i)` returns identity transform for i===0 (hero always paints at full opacity/position).

**Rule that must be maintained:** Any eagerly-mounted component (ErrorBoundary, top-level providers) MUST import `captureError` from `@/lib/captureErrorShim`, never from `@/lib/monitoring`. Importing from monitoring.ts in any eager path re-adds Sentry to the entry chunk.

---

## Addendum — Scroll-stack card fixes (2026-04-19): zoom, height, internal animation

**What it fixes:** iOS double-tap zoom on scroll-stack touch; cards taller than viewport on 720-768px screens; content drifting/sliding inside cards while scrolling.

**Root causes:**
1. No `touch-action` set on scroll-stack elements → iOS Safari double-tap zoom interpreted tap as zoom gesture.
2. WiseResume FeatureSection cards: outer padding `clamp(48px,6vw,80px)` + pane `minHeight:280` + bullets → ~530px tall. WiseHire cards: `DEMO_SLOT_HEIGHT=380` + padding + header → ~550px tall. On 720px viewport with 20% pin (144px) → card bottom exceeded viewport bottom.
3. `.lp-stack-parallax` applied `transform: translate3d(0, calc(var(--card-translate-y,0px)*-0.15),0)` to the demo screenshot. As the card's translateY changed each frame, this moved the screenshot visibly inside the card. Additionally, `FeatureSection` had `whileInView="visible"` slide animations (x:±100, y:70) firing while cards were already in the stack.

**Changes:**
- `src/components/landing/ScrollStack.css`: `.lp-stack-parallax { transform:none; will-change:auto }`. `touch-action:manipulation` on `.scroll-stack-scroller`, `.scroll-stack-card-wrap`, `.scroll-stack-card`.
- `src/components/landing/FeatureSection.tsx`: `containerVariants` motion.div → `initial="visible" animate="visible"` (no whileInView). Outer padding `clamp(48px,6vw,80px)` → `clamp(24px,3vw,44px)`. Pane `minHeight` 280→200. Total card ~390px.
- `src/components/landing/wisehire/WiseHireDemoSection.tsx`: `DEMO_SLOT_HEIGHT` 380→300. Top padding `clamp(32px,4vw,56px)` → `clamp(20px,3vw,36px)`. Inner gap 24→16px. Total card ~440px.
