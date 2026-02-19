
# Database Feature Map and Data Flow Audit

## Deliverable

Create a single new documentation file `docs/DB_FEATURE_MAP.md` that contains all the requested analysis. No runtime code changes are needed -- the audit findings are clean.

---

## Audit Results Summary

### 1. Supabase Client Safety: PASS
All 76 files importing Supabase use `safeClient`. Zero imports from the unsafe `client.ts`. No changes needed.

### 2. Feature-to-Tables Map

The doc will contain this complete mapping:

| Feature | Tables | RPCs | Edge Functions | Hooks/Files |
|---|---|---|---|---|
| **Auth & Profiles** | `profiles` | `check_username_available` | -- | `useAuth`, `useProfile` |
| **Resumes & Editor** | `resumes`, `resume_versions` | -- | `enhance-section`, `score-resume` | `useResumes`, `useResumeVersions`, `EditorPage` |
| **Resume Sharing** | `resume_shares`, `share_comments` | `get_shared_resume`, `hash_share_password`, `verify_share_password`, `increment_share_view_count`, `add_share_comment`, `get_share_comments` | -- | `useResumeShares`, `useShareComments`, `SharePage` |
| **Applications & Activity** | `job_applications`, `jobs`, `tailor_history`, `cover_letters` | -- | `parse-job-url` | `useJobApplications`, `useJobs`, `useCoverLetters`, `useJobActivityStats`, `ActivityTimeline` |
| **Portfolio** | `profiles` (portfolio columns), `portfolio_visits`, `short_links` | `get_public_portfolio`, `get_portfolio_analytics`, `increment_portfolio_views`, `get_portfolio_active_status`, `resolve_short_link` | -- | `useProfile`, `usePublicPortfolio`, `usePortfolioAnalytics`, `PortfolioEditorPage` |
| **AI Features** | `ai_usage_logs`, `ai_credits` | `increment_ai_usage` | `tailor-resume`, `analyze-resume`, `generate-cover-letter`, `enhance-section`, `score-resume`, `parse-resume`, `parse-linkedin`, `optimize-for-linkedin`, `agentic-chat`, `career-path-advisor`, `explain-gap`, `one-page-optimizer`, `manage-api-keys` | `useAICredits`, `useAIAnalytics`, `useAIAction`, `aiTailor`, `aiAnalysis` |
| **Interview** | `interview_sessions` | -- | -- | `useInterviewHistory`, `useVoiceInterview`, `InterviewPage` |
| **Notifications** | `notifications` | -- | -- | `useNotifications`, `usePushNotifications` |
| **Settings** | `user_preferences`, `user_api_keys`, `profiles` | -- | `manage-api-keys` | `useProfile`, `settingsStore`, `SettingsPage` |
| **Onboarding** | `profiles` (`onboarding_completed`) | -- | -- | `useProfile`, `OnboardingPage` |
| **Career Assessment** | `career_assessments` | -- | `career-path-advisor` | `useCareerAssessment` |
| **Cover Letters** | `cover_letters` | -- | `generate-cover-letter` | `useCoverLetters` |
| **Resignation Letters** | `resignation_letters` | -- | -- | `useResignationLetters` |
| **Bug Reports** | `bug_reports` | -- | -- | `BugReportDialog` |
| **Feature Requests** | `feature_requests` | -- | -- | `FeatureRequestDialog` |
| **Data Export** | `resumes`, `profiles`, + all user tables | -- | -- | `dataExport.ts` |
| **Push Notifications** | `push_subscriptions` | -- | -- | `usePushNotifications` |

### 3. Happy Path Data Flow Traces

The doc will contain detailed traces for four key flows:

**Flow A: Creating/Editing a Resume**
- UI: `EditorPage` -> Zustand store (`updateResume`) -> 3s debounce -> `saveToCloud()`
- Write: `useResumes.updateResume` -> `supabase.from('resumes').update(dbUpdates).eq('id', resumeId)`
- Auto-version: on success, `saveVersion.mutateAsync()` -> `supabase.from('resume_versions').insert()`
- Read: `useResume(id)` -> `supabase.from('resumes').select('*').eq('id', resumeId).maybeSingle()`
- Filter: RLS enforces `auth.uid() = user_id` on all operations
- Fields written: `contact_info`, `summary`, `experience`, `education`, `skills`, `certifications`, `awards`, `projects`, `publications`, `volunteering`, `hobbies`, `references`, `template_id`, `title`
- Fields read back: all columns via `select('*')`

**Flow B: Tracking a Job Application**
- UI: `AddApplicationSheet` -> `useJobApplicationMutations().createApplication`
- Write: `supabase.from('job_applications').insert({user_id, job_title, company, status, ...})`
- Trigger: DB trigger `notify_application_change()` auto-inserts into `notifications`
- Read: `useJobApplications()` -> `supabase.from('job_applications').select('*').order('applied_at')`
- Activity: `ActivityTimeline` reads from `tailor_history`, `job_applications`, `cover_letters`, `resumes` in parallel
- Filter: RLS `auth.uid() = user_id` on all tables

**Flow C: Publishing Portfolio and Viewing Analytics**
- UI: `PortfolioEditorPage` -> `useProfile().updateProfile({portfolioEnabled: true, username, ...})`
- Write: `supabase.from('profiles').upsert({portfolio_enabled, username, portfolio_bio, ...})`
- Public read: `get_public_portfolio` RPC (SECURITY DEFINER) reads `profiles` + `resumes`, returns JSONB
- View tracking: `PublicPortfolioPage` calls `increment_portfolio_views` RPC
- Analytics: `usePortfolioAnalytics` calls `get_portfolio_analytics` RPC (requires `auth.uid()` match)
- Strength: computed client-side from profile fields (not stored in a separate column)
- Views: stored in `profiles.views` column, incremented by RPC

**Flow D: Updating Settings/Profile**
- UI: `EditProfileSheet` / `SettingsPage` -> `useProfile().updateProfile(updates)`
- Write: `supabase.from('profiles').upsert(dbUpdates, {onConflict: 'user_id'})`
- Only modified fields are sent (partial update pattern with `!== undefined` guards)
- Read: `useProfile()` -> `supabase.from('profiles').select(long column list).eq('user_id').maybeSingle()`

### 4. Potential Mismatches and Weak Spots

The doc will note these as TODO items (no code changes):

1. **Portfolio "strength" is fully client-side** -- computed from profile fields, not stored in DB. If the formula changes, old cached values may differ. This is by design but worth noting.

2. **`resignation_letters` uses `as any` cast** -- the table exists in DB but may not be in the generated TypeScript types file. The hook casts `from('resignation_letters' as any)`. This works but loses type safety.

3. **`cover_letters.template_style` column exists in DB** but the `CoverLetterRecord` interface and insert logic don't use it (always defaults to `'professional'`). Minor unused column.

4. **`resumes.customization` and `resumes.is_public` columns exist in DB** but are not used in the `useResumes` hook or `parseDbResume`. The `is_public` field is always `false` by default. These are dormant columns.

5. **`resumes.last_reminder_sent_at` column** -- exists in DB, not referenced in any hook. Likely reserved for future digest/reminder features.

6. **Activity timeline reads 4 tables in parallel** without explicit `user_id` filter in the query -- RLS handles filtering implicitly. This is correct but worth documenting.

### 5. Runtime Sanity Checks: NOT NEEDED

The existing codebase already handles this well:
- All mutations have `onError` handlers with `toast.error()`
- All queries use `enabled: !!user` guards
- TanStack Query provides retry logic on network failures
- The `BugReportDialog` captures route and error category automatically
- No additional runtime guards are needed -- adding `console.warn` for empty results would create noise (empty resume lists are valid for new users)

### 6. Verification Checklist

The doc will confirm:
- All 76 Supabase imports use `safeClient`
- No function signatures, hooks, or props changed
- No tables, columns, or RPCs modified
- Resume `title` field is consistently used in lists (`ResumeListCard`), editor header, and DB
- Portfolio `views` column matches what analytics hooks read
- Application `status` values in UI filters match DB column values exactly

---

## File to Create

| File | Description |
|---|---|
| `docs/DB_FEATURE_MAP.md` | Complete feature-to-tables map, data flow traces, mismatch notes, and verification checklist |

**0 runtime files modified. 1 documentation file created.**
