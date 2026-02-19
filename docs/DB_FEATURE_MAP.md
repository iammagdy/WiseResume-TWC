# WiseResume — Database Feature Map & Data Flow Audit

> Generated 2026-02-19. **Zero runtime files modified.**

---

## 1. Supabase Client Safety

**Status: ✅ PASS** — All 76 files importing Supabase use `@/integrations/supabase/safeClient`. Zero imports from the raw `client.ts`.

---

## 2. Feature → Tables Map

| Feature | Tables | RPCs | Edge Functions | Hooks / Files |
|---|---|---|---|---|
| **Auth & Profiles** | `profiles` | `check_username_available` | — | `useAuth`, `useProfile` |
| **Resumes & Editor** | `resumes`, `resume_versions` | — | `enhance-section`, `score-resume` | `useResumes`, `useResumeVersions`, `EditorPage` |
| **Resume Sharing** | `resume_shares`, `share_comments` | `get_shared_resume`, `hash_share_password`, `verify_share_password`, `increment_share_view_count`, `add_share_comment`, `get_share_comments` | — | `useResumeShares`, `useShareComments`, `SharePage` |
| **Applications & Activity** | `job_applications`, `jobs`, `tailor_history`, `cover_letters` | — | `parse-job-url` | `useJobApplications`, `useJobs`, `useCoverLetters`, `useJobActivityStats`, `ActivityTimeline` |
| **Portfolio** | `profiles` (portfolio columns), `portfolio_visits`, `short_links` | `get_public_portfolio`, `get_portfolio_analytics`, `increment_portfolio_views`, `get_portfolio_active_status`, `resolve_short_link` | — | `useProfile`, `usePublicPortfolio`, `usePortfolioAnalytics`, `PortfolioEditorPage` |
| **AI Features** | `ai_usage_logs`, `ai_credits` | `increment_ai_usage` | `tailor-resume`, `analyze-resume`, `generate-cover-letter`, `enhance-section`, `score-resume`, `parse-resume`, `parse-linkedin`, `optimize-for-linkedin`, `agentic-chat`, `career-path-advisor`, `explain-gap`, `one-page-optimizer`, `manage-api-keys` | `useAICredits`, `useAIAnalytics`, `useAIAction`, `aiTailor`, `aiAnalysis` |
| **Interview** | `interview_sessions` | — | — | `useInterviewHistory`, `useVoiceInterview`, `InterviewPage` |
| **Notifications** | `notifications` | — | — | `useNotifications`, `usePushNotifications` |
| **Settings** | `user_preferences`, `user_api_keys`, `profiles` | — | `manage-api-keys` | `useProfile`, `settingsStore`, `SettingsPage` |
| **Onboarding** | `profiles` (`onboarding_completed`) | — | — | `useProfile`, `OnboardingPage` |
| **Career Assessment** | `career_assessments` | — | `career-path-advisor` | `useCareerAssessment` |
| **Cover Letters** | `cover_letters` | — | `generate-cover-letter` | `useCoverLetters` |
| **Resignation Letters** | `resignation_letters` | — | — | `useResignationLetters` |
| **Bug Reports** | `bug_reports` | — | — | `BugReportDialog` |
| **Feature Requests** | `feature_requests` | — | — | `FeatureRequestDialog` |
| **Data Export** | `resumes`, `profiles`, + all user tables | — | — | `dataExport.ts` |
| **Push Notifications** | `push_subscriptions` | — | — | `usePushNotifications` |

---

## 3. Happy-Path Data Flow Traces

### Flow A — Creating / Editing a Resume

```
UI: EditorPage
  → Zustand store (updateResume) → 3 s debounce → saveToCloud()
  → useResumes.updateResume
      → supabase.from('resumes').update(dbUpdates).eq('id', resumeId)
  → on success: saveVersion.mutateAsync()
      → supabase.from('resume_versions').insert({ resume_id, snapshot, user_id })

Read-back:
  useResume(id) → supabase.from('resumes').select('*').eq('id', resumeId).maybeSingle()

Filter: RLS enforces auth.uid() = user_id on all operations.

Fields written: contact_info, summary, experience, education, skills,
  certifications, awards, projects, publications, volunteering,
  hobbies, references, template_id, title
Fields read: all columns via select('*')
```

### Flow B — Tracking a Job Application

```
UI: AddApplicationSheet
  → useJobApplicationMutations().createApplication
      → supabase.from('job_applications').insert({
          user_id, job_title, company, status, applied_at, url, notes, ...
        })
  → DB trigger notify_application_change() auto-inserts into notifications

Read-back:
  useJobApplications(statusFilter?)
      → supabase.from('job_applications').select('*').order('applied_at')

Activity timeline:
  ActivityTimeline reads tailor_history, job_applications, cover_letters,
  resumes in parallel. No explicit user_id filter in query — RLS handles it.

Filter: RLS auth.uid() = user_id on all four tables.
```

### Flow C — Publishing Portfolio & Viewing Analytics

```
UI: PortfolioEditorPage
  → useProfile().updateProfile({ portfolioEnabled: true, username, portfolioBio, ... })
      → supabase.from('profiles').upsert(dbUpdates, { onConflict: 'user_id' })

Public read:
  get_public_portfolio RPC (SECURITY DEFINER) reads profiles + resumes → JSONB

View tracking:
  PublicPortfolioPage → increment_portfolio_views RPC
      → UPDATE profiles SET views = views + 1 WHERE username = p_username

Analytics:
  usePortfolioAnalytics → get_portfolio_analytics RPC (auth.uid() match)

Portfolio strength: computed client-side from profile fields, NOT stored in DB.
Views: stored in profiles.views, incremented by RPC.
```

### Flow D — Updating Settings / Profile

```
UI: EditProfileSheet / SettingsPage
  → useProfile().updateProfile(updates)
      → supabase.from('profiles').upsert(dbUpdates, { onConflict: 'user_id' })
      → only modified fields sent (!== undefined guards)

Read-back:
  useProfile() → supabase.from('profiles')
    .select('user_id, full_name, avatar_url, job_title, ...(long column list)')
    .eq('user_id', userId).maybeSingle()
```

---

## 4. Potential Mismatches & Weak Spots

> These are documentation-only notes. No code changes made.

1. **Portfolio "strength" is fully client-side** — computed from profile fields, not stored in DB. If the formula changes, old cached values may differ. By design but worth noting.

2. **`resignation_letters` uses `as any` cast** — the table exists in DB but is not in the generated TypeScript types file. The hook casts `from('resignation_letters' as any)`. Works but loses type safety.

3. **`cover_letters.template_style` column** exists in DB but the `CoverLetterRecord` interface and insert logic don't use it (always defaults to `'professional'`). Minor unused column.

4. **`resumes.customization` and `resumes.is_public`** columns exist in DB but are not used in `useResumes` or `parseDbResume`. `is_public` defaults to `false`. Dormant columns.

5. **`resumes.last_reminder_sent_at`** — exists in DB, not referenced in any hook. Reserved for future digest/reminder features.

6. **Activity timeline reads 4 tables in parallel** without explicit `user_id` filter — RLS handles filtering implicitly. Correct but worth documenting.

---

## 5. Runtime Sanity Checks — NOT NEEDED

The existing codebase already handles this well:

- All mutations have `onError` handlers with `toast.error()`
- All queries use `enabled: !!user` guards
- TanStack Query provides retry logic on network failures
- `BugReportDialog` captures route and error category automatically
- Empty results are valid (new users have no resumes) — adding `console.warn` would create noise

---

## 6. Verification Checklist

- [x] All 76 Supabase imports use `safeClient`
- [x] No function signatures, hooks, or props changed
- [x] No tables, columns, or RPCs modified
- [x] Resume `title` field consistently used in lists (`ResumeListCard`), editor header, and DB
- [x] Portfolio `views` column matches what analytics hooks read
- [x] Application `status` values in UI filters match DB column values exactly (`applied`, `interviewing`, `offered`, `rejected`, `saved`)
- [x] RLS policies enforce `auth.uid() = user_id` on all user-owned tables
