

## WiseResume Comprehensive Codebase Audit Report

---

### PART 1: DATABASE SCHEMA AUDIT

| Table | Exists | RLS | Columns | Issues |
|-------|--------|-----|---------|--------|
| `profiles` | Yes | Yes (SELECT/INSERT/UPDATE) | Complete | No DELETE policy (intentional) |
| `resumes` | Yes | Yes (all CRUD + public read) | Complete | None |
| `jobs` | Yes | Yes (all CRUD) | Complete | None |
| `job_applications` | Yes | Yes (all CRUD) | Complete | None |
| `cover_letters` | Yes | Yes (all CRUD) | Complete | None |
| `notifications` | Yes | Yes (all CRUD) | Complete | None |
| `resume_shares` | Yes | Yes (owner + public read) | Complete | None |
| `resume_versions` | Yes | Yes (SELECT/INSERT/DELETE) | Complete | No UPDATE policy (intentional) |
| `tailor_history` | Yes | Yes (SELECT/INSERT/DELETE) | Complete | No UPDATE policy (intentional) |
| `interview_sessions` | Yes | Yes (all CRUD) | Complete | None |
| `ai_credits` | Yes | Yes (SELECT/INSERT/UPDATE) | Complete | No DELETE policy (intentional) |
| `ai_usage_logs` | Yes | Yes (SELECT/INSERT/DELETE) | Complete | No UPDATE policy (intentional) |
| `user_preferences` | Yes | Yes (SELECT/INSERT/UPDATE) | Complete | No DELETE policy (intentional) |

**Missing tables**: None. All required tables exist.

**RLS Note**: All RLS policies use `RESTRICTIVE` mode (not permissive), which is correct but means at least one policy must match for access. This is properly implemented.

**Foreign keys**: `resume_shares` and `resume_versions` reference `resumes(id)`. `job_applications` has nullable `job_id` referencing `jobs(id)`. No direct FK to `auth.users` (correct pattern).

**Database functions**: `increment_share_view_count`, `handle_new_user`, `update_updated_at_column` -- all present and correct.

---

### PART 2: HOOKS AUDIT

#### Resume Hooks (`src/hooks/useResumes.ts`)
| Hook | Exists | Status |
|------|--------|--------|
| `useResumes()` | Yes | Correct -- queryKey includes user?.id |
| `useResume(id)` | Yes | Correct -- single resume fetch |
| `useResumeMutations().createResume` | Yes | Correct -- invalidates, toasts |
| `useResumeMutations().updateResume` | Yes | Correct -- auto-saves version snapshots |
| `useResumeMutations().deleteResume` | Yes | Correct |
| `useResumeMutations().duplicateResume` | Yes | Correct |
| `useResumeScore()` | Yes (separate file) | Correct |

#### Job Hooks (`src/hooks/useJobs.ts`)
| Hook | Exists | Status |
|------|--------|--------|
| `useJobs()` | Yes | Correct |
| `useJob(id)` | Yes | Correct -- uses `.maybeSingle()` |
| `useJobMutations().createJob` | Yes | Correct |
| `useJobMutations().updateJob` | Yes | Correct |
| `useJobMutations().deleteJob` | Yes | Correct |

#### Application Hooks (`src/hooks/useJobApplications.ts`)
| Hook | Exists | Status |
|------|--------|--------|
| `useJobApplications()` | Yes | Correct |
| `useJobApplication(id)` | Yes | Correct |
| `useJobApplicationMutations().createApplication` | Yes | Correct |
| `useJobApplicationMutations().updateApplication` | Yes | Correct |
| `useJobApplicationMutations().deleteApplication` | Yes | Correct |

#### Cover Letter Hooks (`src/hooks/useCoverLetters.ts`)
| Hook | Exists | Status |
|------|--------|--------|
| `useCoverLetters()` | Yes | Correct |
| `useCoverLetter(id)` | Yes | Correct |
| `useCoverLetterMutations().saveCoverLetter` | Yes | Correct |
| `useCoverLetterMutations().updateCoverLetter` | Yes | Correct |
| `useCoverLetterMutations().deleteCoverLetter` | Yes | Correct |

#### Notification Hooks (`src/hooks/useNotifications.ts`)
| Hook | Exists | Status |
|------|--------|--------|
| `useNotifications()` | Yes | Correct |
| `useUnreadNotificationCount()` | Yes | Correct |
| `useNotificationMutations().markAsRead` | Yes | Correct |
| `useNotificationMutations().markAllAsRead` | Yes | Correct |
| `useNotificationMutations().deleteNotification` | Yes | Correct |
| `useNotificationMutations().clearAll` | Yes | Correct |

#### Share Hooks (`src/hooks/useResumeShares.ts`)
| Hook | Exists | Status |
|------|--------|--------|
| `useResumeShares(resumeId)` | Yes | Correct |
| `usePublicResume(token)` | Yes | Correct -- no auth required |
| `useResumeShareMutations().createShare` | Yes | Correct |
| `useResumeShareMutations().updateShare` | Yes | Correct |
| `useResumeShareMutations().deleteShare` | Yes | Correct |
| `useResumeShareMutations().incrementViewCount` | Yes | Correct -- uses RPC |

---

### PART 3: PAGE-TO-HOOK CONNECTION AUDIT

#### 1. `/dashboard` -- DashboardPage.tsx
- Uses `useResumes()` -- **YES**
- Uses `useResumeMutations()` (create, delete, duplicate, update) -- **YES**
- Uses `useProfile()` for greeting -- **YES**
- Uses `useResumeScore()` for health scores -- **YES**
- Quick actions navigate correctly -- **YES**
- Onboarding flow works -- **YES**

#### 2. `/editor` -- EditorPage.tsx
- Uses `useResume(id)` for validation -- **YES**
- Uses `useResumeMutations().updateResume` for auto-save -- **YES**
- Resume guard redirects properly -- **YES**
- Debounced 3-second auto-save -- **YES**
- Version history integration -- **YES**

#### 3. `/applications` -- ApplicationsPage.tsx
- Uses `useJobs()` -- **YES**
- Uses `useJobApplications()` -- **YES**
- Uses `useUnreadNotificationCount()` for bell badge -- **YES**
- Has tabs (Applications / Saved Jobs) -- **YES**
- Job cards navigate to `/job/:id` -- **YES**
- Application cards navigate to `/application/:id` -- **YES**
- Guest gate with sign-in CTA -- **YES**

#### 4. `/settings` -- SettingsPage.tsx
- Uses `useProfile()` -- **YES**
- Uses `useResumes()` -- **YES**
- Theme toggle, biometric, AI settings -- **YES**
- Sign out flow -- **YES**

#### 5. `/onboarding` -- OnboardingPage.tsx
- 5-step flow -- **YES**
- Uses localStorage for persistence -- **YES**
- Template selection -- **YES**
- Completes and navigates to `/dashboard` -- **YES**
- Can be skipped -- **YES**

#### 6. `/profile` -- ProfilePage.tsx
- Uses `useProfile()` -- **YES**
- Uses `useResumes()` -- **YES**
- Uses `useJobApplications()` for stats -- **YES**
- Edit Profile sheet -- **YES**
- Auth guard redirects to `/auth` -- **YES**

#### 7. `/templates` -- TemplatesPage.tsx
- Shows all templates -- **YES**
- Filter by category -- **YES**
- Preview sheet -- **YES**
- "Use Template" navigates to `/editor` -- **YES**

#### 8. `/resume/:id` -- ResumeDetailPage.tsx
- Uses `useResume(id)` -- **YES**
- Uses `useResumeScore()` for health -- **YES**
- Edit navigates to `/editor` -- **YES**
- Preview navigates to `/preview` -- **YES**
- Download generates PDF -- **YES**
- Duplicate works -- **YES**
- Delete works -- **YES**
- **ISSUE**: Share button shows `toast.info('Share coming soon')` instead of using `useResumeShareMutations()` -- share not wired

#### 9. `/job/:id` -- JobDetailPage.tsx
- Uses `useJob(id)` -- **YES**
- Save/unsave via `updateJob` -- **YES**
- Apply with resume creates application -- **YES**
- Share uses Web Share API -- **YES**
- Delete works -- **YES**

#### 10. `/application/:id` -- ApplicationTrackerPage.tsx
- Uses `useJobApplication(id)` -- **YES**
- Status timeline with screening stage -- **YES**
- Update status -- **YES**
- Notes section -- **YES**
- Set reminder -- **YES**
- Linked resume display -- **YES**
- Linked cover letter display via `useCoverLetter()` -- **YES**
- Delete button -- **YES**

#### 11. `/notifications` -- NotificationsPage.tsx
- Uses `useNotifications()` -- **YES**
- Filter tabs (All/Unread/Applications/System) -- **YES**
- Mark as read on click -- **YES**
- Clear all -- **YES**
- **ISSUE**: No real-time Supabase subscription -- notifications require manual refresh
- **NOTE**: No mechanism to CREATE notifications. No edge function or trigger inserts rows into the `notifications` table, so the page will always be empty unless notifications are manually inserted.

#### 12. `/cover-letter` -- CoverLetterPage.tsx
- Uses `useCoverLetters()` -- **YES**
- Uses `useCoverLetterMutations()` -- **YES**
- AI generation via `generateCoverLetter()` -- **YES**
- Save, copy, download -- **YES**
- Saved letters list with viewing -- **YES**
- **ISSUE**: Download is plain text (.txt) only, not PDF/DOCX

#### 13. `/share/:token` -- SharePage.tsx
- Uses `usePublicResume(token)` -- **YES**
- Password protection gate -- **YES**
- View count increment on mount -- **YES**
- Resume rendering -- **YES**
- **ISSUE**: `usePublicResume` queries `resume_shares` then `resumes`, but the public RLS policy on `resumes` requires `is_public = true`. Since `usePublicResume` doesn't set `is_public`, the second query will fail with RLS denial. The resume_shares RLS allows anonymous SELECT, but the resumes table RLS only allows own rows OR `is_public = true`. Shared resumes won't load unless `is_public` is also set to true on the resume.

#### 14. `/auth` -- AuthPage.tsx
- Login works -- **YES**
- Signup creates profile (via `handle_new_user` trigger) -- **YES**
- Password reset works -- **YES**
- Redirects to `/dashboard` after login -- **YES**
- Google/Apple OAuth -- **YES**
- **NOTE**: No redirect to `/onboarding` for new users -- they go to `/dashboard` which internally checks onboarding status

#### 15. `/upload` -- UploadPage.tsx
- PDF/Word/Image/JSON/HTML upload -- **YES**
- Uses `useResumeMutations().createResume` -- **YES**
- Navigates to `/editor` after upload -- **YES**

#### 16. `/preview` -- PreviewPage.tsx
- Uses resume from `useResumeStore` -- **YES**
- Resume guard redirects -- **YES**
- Download PDF works -- **YES**
- Template switcher -- **YES**

#### 17. `/interview` -- InterviewPage.tsx
- Uses `useResumeStore` for resume data -- **YES**
- Resume guard redirects -- **YES**
- Voice interview system -- **YES**
- Summary screen -- **YES**

#### 18. `/` (Landing) -- Index.tsx
- "Get Started" navigates appropriately -- **YES**
- No auth required -- **YES**

---

### PART 4: ROUTING & NAVIGATION AUDIT

All routes exist in `App.tsx`:

| Route | Type | Lazy | Suspense | Status |
|-------|------|------|----------|--------|
| `/` | Public (no AppShell) | No (eagerly loaded) | N/A | OK |
| `/auth` | In AppShell | Yes | Yes | OK |
| `/dashboard` | In AppShell | Yes | Yes | OK |
| `/editor` | In AppShell | Yes | Yes | OK |
| `/preview` | In AppShell | Yes | Yes | OK |
| `/upload` | In AppShell | Yes | Yes | OK |
| `/settings` | In AppShell | Yes | Yes | OK |
| `/interview` | In AppShell | Yes | Yes | OK |
| `/applications` | In AppShell | Yes | Yes | OK |
| `/onboarding` | In AppShell | Yes | Yes | OK |
| `/profile` | In AppShell | Yes | Yes | OK |
| `/templates` | In AppShell | Yes | Yes | OK |
| `/resume/:id` | In AppShell | Yes | Yes | OK |
| `/job/:id` | In AppShell | Yes | Yes | OK |
| `/application/:id` | In AppShell | Yes | Yes | OK |
| `/notifications` | In AppShell | Yes | Yes | OK |
| `/cover-letter` | In AppShell | Yes | Yes | OK |
| `/share/:token` | Outside AppShell | Yes | Yes | OK |
| `*` (404) | Outside AppShell | Yes | Yes | OK |

**AppShell TAB_ROUTES**: All relevant routes included.

**Bottom Tab Bar**: 4 tabs (Home, Editor, Jobs, Settings). Editor is guarded (needs resume). Jobs tab shows lock icon for guests but allows navigation (page handles guest gate).

**Route Guards**:
- Editor/Preview: Redirect to `/dashboard` or `/` if no resume loaded -- **YES**
- Interview: Redirect to `/upload` or `/auth` if no resume -- **YES**
- Profile: Redirect to `/auth` if not logged in -- **YES**
- CoverLetter/JobDetail: Redirect to `/auth` if not logged in -- **YES**
- **No global auth guard**: Routes are individually protected, not via a wrapper component. This is the intended pattern.

---

### PART 5: CRITICAL ISSUES FOUND

#### Issue 1: SharePage Resume Fetch Fails Due to RLS (HIGH)
`usePublicResume(token)` fetches from `resume_shares` (anonymous access OK), then tries to fetch from `resumes` table. But the `resumes` RLS only allows:
- Owner's own rows (`auth.uid() = user_id`)
- Public rows (`is_public = true`)

Since anonymous users have no `auth.uid()`, they can only see resumes where `is_public = true`. But the sharing flow never sets `is_public = true` on the resume -- it only creates a `resume_shares` row. **This means public share links will always fail to load the resume data.**

**Fix**: Either:
- (a) Add an RLS policy on `resumes` that allows SELECT when the resume has an active share in `resume_shares`, OR
- (b) Create a security definer function `get_shared_resume(token)` that bypasses RLS, OR
- (c) Set `is_public = true` on the resume when a share is created

#### Issue 2: ResumeDetailPage Share Button Not Wired (MEDIUM)
Line 104 of `ResumeDetailPage.tsx`:
```
{ icon: Share2, label: 'Share', onClick: () => toast.info('Share coming soon') }
```
Should use `useResumeShareMutations().createShare` to generate a share link and copy it to clipboard.

#### Issue 3: No Notification Creation Mechanism (MEDIUM)
The `notifications` table and hooks exist, but nothing creates notifications. There are no:
- Database triggers to create notifications on application status changes
- Edge functions that insert notifications
- Client-side code that inserts notifications

The notifications page will always be empty.

#### Issue 4: No Real-time Subscription on Notifications (LOW)
The plan mentioned real-time updates via Supabase subscriptions, but no realtime subscription is implemented. Notifications require manual page refresh/navigation to update.

#### Issue 5: Cover Letter Download is Text-Only (LOW)
`CoverLetterPage.tsx` downloads as `.txt`. Could use `generateCoverLetterPDF()` from `pdfGenerator.ts` which already exists.

#### Issue 6: ApplicationsPage Imports Unused Hooks (LOW)
`usePendingReminders` is imported but not used in the component.

---

### PART 6: DATA FLOW VERIFICATION

| Flow | Status | Issues |
|------|--------|--------|
| Login -> Dashboard | Working | None |
| Signup -> Profile created -> Dashboard | Working | Trigger `handle_new_user` creates profile row |
| Logout -> Landing | Working | Clears session cache |
| New Resume -> Editor -> Save | Working | Auto-save with 3s debounce |
| Upload PDF -> Parse -> Editor -> Save | Working | Multiple format support |
| Template -> Editor | Working | Sets template in store |
| Job -> Apply -> Application | Working | Creates application with `job_id` |
| Resume -> Share -> Public URL | **BROKEN** | RLS blocks anonymous resume fetch (Issue 1) |
| Notifications | **EMPTY** | No creation mechanism (Issue 3) |

---

### RECOMMENDED FIXES (Priority Order)

1. **Fix SharePage RLS** -- Create a security definer function to fetch resumes by share token, bypassing the need for `is_public = true`
2. **Wire ResumeDetailPage Share button** -- Use `useResumeShareMutations().createShare()` and copy the share URL to clipboard
3. **Add notification triggers** -- Create database triggers or edge function logic to insert notifications when applications are created, status changes, or reminders are due
4. **Add Supabase realtime** for notifications -- Enable realtime on the `notifications` table and subscribe in `NotificationsPage`
5. **Clean up unused imports** in ApplicationsPage
