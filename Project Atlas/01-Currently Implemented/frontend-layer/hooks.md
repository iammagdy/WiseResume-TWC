# Hooks (`src/hooks/`)

**Last verified:** 2026-04-17
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
