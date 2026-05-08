# Hooks (`src/hooks/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:**
- `src/hooks/` (84 files at root + `src/hooks/wisehire/` 21 files)
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
| `useTierGate` | Plan-gate evaluator | Returns `{allowed, reason, upgradeTo}` for any feature key; reads from `useMe`. |
| `useSuspensionCheck` | Detects suspended account state and triggers logout + toast. |
| `useChangelogBadge` | Unread changelog item count for the topbar bell. |

## Shared React Query cache keys

| Key | Owner | Invalidated by |
|---|---|---|
| `['me', user?.id]` | `useMe` | `token-exchange`, plan change mutations |
| `['ai-keys']` | `AIKeySection` (legacy BYOK; staleTime 30s) | `AISettingsSheet` on key save/delete |
| `['chat_sessions', user?.id]` | `useChatSessions` (staleTime 30s) | `useDeleteChatSession` |
| `['resume-versions', resumeId]` | `useResumeVersions(resumeId)` | `saveVersion`/`deleteVersion` `onSuccess` |
| `['resume-snapshots', resumeId]` | `useResumeSnapshots(resumeId)` | snapshot create/restore |
| `['resume-shares', resumeId]` | `useResumeShares(resumeId)` | share create/revoke |
| `['share-comments', shareToken]` | `useShareComments` | comment add/delete |
| `['notifications', user?.id]` | `useNotifications` | mark-read mutation |

**Rule:** chat session, resume version, snapshot, share, share-comment cache keys are always scoped to their entity ID — never use the bare prefix.

## AI hooks

`useAgenticChat`, `useAIAction`, `useAIApplyEffects` (post-AI ripple animations on the editor), `useAIDraft`, `useAIEnhance`, `useAIHealth`, `useAIKeyHydration`, `useATSSuggestions`, `useChatHistory`, `useCompanyBriefing`, `useCompanyBriefingLibrary`, `useCareerAssessment`, `useResumeScore`, `useResumeNudges`, `useToolCache`.

## Editor / resume hooks

`useEditorAutosave`, `useEditorHydration`, `useEditorSectionScores`, `useEditorSheets` (sheet stacking + back-button management), `useEditorShortcuts`, `useExpandedEntryRestore` (restores the open accordion entry across hydration), `useFitToPages` + `useOnePageExport` (one-page export pipeline), `useUnsavedChangesGuard`, `useUndoRedo`.

## Resume sharing & versioning

`useResumeShares`, `useResumeSnapshots`, `useResumeVersions`, `useShareComments`, `useRedactedResume`.

## Job / application / interview hooks

`useJobs`, `useJobApplications`, `useJobActivityStats`, `useCareerMilestones`, `useInterviewAnswers`, `useInterviewHistory`, `useInterviewReportToken`, `useVoiceInterview`, `useWebSpeechFallback` (Web Speech API fallback when ElevenLabs is unavailable).

## Portfolio hooks

`usePortfolioAnalytics`, `usePortfolioHistory`, `usePortfolioSEO`, `usePortfolioTracking`, `usePortfolioUsernameRules`, `usePublicPortfolio`, `useActiveStatus`, `useVisitorTracking` (anonymous visitor analytics).

## Mobile / PWA / device hooks

`use-mobile`, `useAppLifecycle`, `useBackButton`, `useBackNavigation`, `useBiometricLock`, `useDeepLinking`, `useDoubleTap`, `useKeyboardAwareScroll`, `useNetworkQuality`, `useNetworkStatus`, `useOfflineSync` (server-wins conflict policy), `useRateApp`, `useShakeDetect` (debug surface trigger), `useStatusBar` (status-bar style sync with theme), `useThemeLogo`.

## UI / animation hooks

`useInView`, `useIsDark`, `useScrollFade`, `useTilt` (mouse-tilt 3D effect), `useTypewriter`, `useExportProgress`, `usePlanUpgradeCelebration`.

## Misc

`useActivityStreak`, `useAppSettings`, `useCoverLetters`, `useGuestMigration`, `useNotifications`, `useResignationLetters`, `useResumes`, `useWebMcp` (Web MCP client for AI Studio tool-calling).

## WiseHire hooks (`src/hooks/wisehire/`)

All cache keys are scoped to `useWiseHireAccount`'s `accountId` (or relevant entity id) so personal vs company contexts never cross-pollute.

| Hook | Purpose |
|---|---|
| `useWiseHireAccount` | Resolves the active WiseHire account (single-user company) for the signed-in user. |
| `useAccountType` | `account_type` → `'wisehire' \| 'wiseresume'` (from `profiles.account_type`). |
| `useBiasMode` | Toggle + persistence for Bias Reduction Mode (PII redaction); writes to `wisehire_companies.settings`. |
| `useBriefs` | List/create/update interview briefs (`wisehire_briefs`). |
| `useBulkScreen` | Bulk CV screening pipeline: kicks off `wisehire-bulk-screen`, polls status. |
| `useCandidateNotes` | Notes tied to a candidate row (`wisehire_candidate_notes`). |
| `useClients` | CRM clients table (`wisehire_clients`). |
| `useHRAnalytics` | Aggregated funnel + time-to-hire metrics. |
| `useJDs` | Job description CRUD (`wisehire_jds`). |
| `useMaskCVs` | Bias-mode mask sessions (uses `useMaskSessions` for state). |
| `useMaskSessions` | Persistent state of one masking pass. |
| `useOutreach` | Outreach email sequences via `wisehire-send-outreach`. |
| `usePipeline` | Pipeline stages + drag-drop ordering (uses `lib/wisehire/pipelineDragDrop.ts`). |
| `useRoles` | Open roles / job postings (`wisehire_roles`). |
| `useSavedSearches` | Talent-search saved queries. |
| `useScorecards` | Per-candidate interview scorecards (`wisehire_scorecards`). |
| `useScorecardTemplates` | Reusable scorecard templates. |
| `useTalentPool` | Talent pool listing (`wisehire_talent_pool`). |
| `useTalentPoolProfile` | Single talent pool profile + actions. |
| `useWaitlist` | (Admin/landing) WiseHire waitlist queries. |
| `useWaitlistEmailCheck` | Anonymous email-on-waitlist check (calls `wisehire-access` `waitlist-check-email`). |

## Patterns to follow

- All server data lives in TanStack Query — no parallel `useState` mirrors.
- queryKeys include `user?.id` (or entity id) so they invalidate on user / context switch.
- Mutations call `queryClient.invalidateQueries` against the affected key.
- Hooks that return display strings should use `'∞'` for `daily_limit === -1` (premium sentinel).

→ `replit.md` (TanStack Query Patterns + Known Rules & Constraints).
