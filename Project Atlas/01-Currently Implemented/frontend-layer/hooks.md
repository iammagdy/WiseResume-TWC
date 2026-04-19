# Hooks (`src/hooks/`)

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `src/hooks/`
- `replit.md` (TanStack Query + Hook patterns)

**Canonical owner:** `src/hooks/` directory.

---

## The "single source of truth" hooks

| Hook | What it owns | Notes |
|---|---|---|
| `useMe` | User identity, plan, credits, preferences, account_type | Backed by `me` Edge Function. queryKey `['me', user?.id]`. **Used everywhere.** |
| `useAuth` | Kinde auth state | Wrapped on top of `KindeProvider`. |
| `usePlan` | Derived plan tier + caps | Reads from `useMe`. |
| `useAICredits` | Live credit balance | Reads from `useMe`. |
| `useProfile` | Profile row + mutations | Profile-specific updates. |

## Shared React Query cache keys

| Key | Owner | Invalidated by |
|---|---|---|
| `['me', user?.id]` | `useMe` | `token-exchange`, plan change mutations |
| `['ai-keys']` | `AIKeySection` in `WiseHireSettingsPage` (staleTime 30 s) | `AISettingsSheet` on key save and key delete → `queryClient.invalidateQueries({ queryKey: ['ai-keys'] })` |
| `['chat_sessions', user?.id]` | `useChatSessions` (staleTime 30 s) | `useDeleteChatSession` → `invalidateQueries({ queryKey: ['chat_sessions', user?.id] })` |
| `['resume-versions', resumeId]` | `useResumeVersions(resumeId)` | `saveVersion.onSuccess` → `invalidateQueries(['resume-versions', variables.resumeId])`; `deleteVersion.onSuccess` → same scoped key |

**Rule:** any component that reads BYOK connection state should consume the `['ai-keys']` cache rather than fetching independently.

**Rule:** chat session and resume version cache keys are always scoped to their entity ID — never use the bare prefix (`['chat_sessions']` or `['resume-versions']`) for reads or invalidations.

## AI hooks

`useAgenticChat`, `useAIAction`, `useAIDraft`, `useAIEnhance`, `useAIHealth`, `useAIKeyHydration`, `useAIProviderInfo`, `useATSSuggestions`, `useChatHistory`, `useCompanyBriefing`, `useCompanyBriefingLibrary`, `useCareerAssessment`, `useResumeScore`, `useResumeNudges`, `useToolCache`.

## Editor / resume hooks

`useEditorAutosave`, `useEditorHydration`, `useEditorSectionScores`, `useEditorShortcuts`, `useResumeNudges`, `useTailorResume`-style helpers in `src/lib/aiTailor.ts`.

## Job / application hooks

`useJobs`, `useJobApplications`, `useJobActivityStats`, `useCareerMilestones`.

## Portfolio hooks

`usePortfolioAnalytics`, `usePortfolioHistory`, `usePortfolioSEO`, `usePortfolioTracking`, `usePortfolioUsernameRules`, `usePublicPortfolio`, `useActiveStatus`.

## Interview hooks

`useElevenLabsScribe` (Web Speech fallback inside), `useInterviewAnswers`, `useInterviewHistory`, `useInterviewReportToken`.

## Mobile / PWA / device hooks

`use-mobile`, `useAppLifecycle`, `useBackButton`, `useBackNavigation`, `useBiometricLock`, `useDeepLinking`, `useDoubleTap`, `useKeyboardAwareScroll`, `useNetworkQuality`, `useNetworkStatus`, `useOfflineSync` (server-wins conflict policy), `usePushNotifications`, `useRateApp`.

## Misc

`useActivityStreak`, `useAppSettings`, `useChangelogBadge`, `useCoverLetters`, `useExportProgress`, `useGuestMigration`, `useInView`, `useIsDark`, `useNotifications`, `usePlanUpgradeCelebration`, `useRedactedResume`, `useResignationLetters`.

## Patterns to follow

- All server data lives in TanStack Query — no parallel `useState` mirrors.
- queryKeys include `user?.id` so they invalidate on user switch.
- Mutations call `queryClient.invalidateQueries` against the affected key.
- Hooks that return display strings should use `'∞'` for `daily_limit === -1` (premium sentinel).

→ `replit.md` (TanStack Query Patterns + Known Rules & Constraints).
