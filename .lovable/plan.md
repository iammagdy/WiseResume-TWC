

## Database Integrity and Storage Security Hardening

### Current State

**Issue 1 -- Missing Cascading Deletes:**
- The database has **zero foreign key constraints** between tables. All relationships are implicit (matching UUIDs with no enforcement).
- Resume data (experience, education, skills, etc.) is stored as JSONB columns *within* the `resumes` table -- there are no separate `resume_sections`, `education`, or `experience` tables. So section-level cascades are not needed.
- However, 6 child tables reference `resume_id` without FK constraints: `resume_versions`, `resume_shares`, `share_comments` (via share_id), `cover_letters`, `tailor_history`, `ai_usage_logs`, `interview_sessions`, `career_assessments`, `job_applications`.
- The `deleteAllUserData()` function only deletes from `resumes` and `profiles`, leaving 14+ tables with orphaned records.

**Issue 2 -- Storage Bucket Security:**
- Only the `avatars` bucket exists (public). RLS policies are already correctly scoped: users can only read/write within their own `auth.uid()` folder.
- There is no `resumes` or PDF storage bucket. PDFs are generated client-side via `pdf-lib` + `html2canvas` and downloaded directly to the device -- they are never uploaded to storage.
- No changes needed for storage security. The existing policies are sound.

### Plan

#### Migration 1: Add Foreign Key Constraints with ON DELETE CASCADE

Add FK constraints so deleting a resume automatically cleans up all child records, and deleting a user (via auth) cascades through profiles to resumes.

```text
Tables getting FK to resumes.id (ON DELETE CASCADE):
  - resume_versions.resume_id (NOT NULL)
  - resume_shares.resume_id (NOT NULL)
  - cover_letters.resume_id (SET NULL -- nullable, letter can exist without resume)
  - tailor_history.resume_id (SET NULL -- nullable)
  - ai_usage_logs.resume_id (SET NULL -- nullable)
  - interview_sessions.resume_id (SET NULL -- nullable)
  - career_assessments.resume_id (SET NULL -- nullable)
  - job_applications.resume_id (SET NULL -- nullable)

Tables getting FK to resume_shares.id (ON DELETE CASCADE):
  - share_comments.share_id (CASCADE -- comments die with their share)
```

For NOT NULL `resume_id` columns (`resume_versions`, `resume_shares`): use ON DELETE CASCADE (row is meaningless without its resume).

For nullable `resume_id` columns: use ON DELETE SET NULL (the record can still be useful, e.g., a cover letter without its linked resume).

#### Migration 2: Fix deleteAllUserData to clean up all tables

Update `src/lib/dataExport.ts` `deleteAllUserData()` to delete from all user-owned tables before deleting resumes (since cascading handles resume children, we still need to clean user-level tables).

Tables to add to the delete flow (in order):
1. `share_comments` (via resume_shares join -- handled by cascade now)
2. `resume_versions` (cascade handles)
3. `resume_shares` (cascade handles)
4. `tailor_history`
5. `cover_letters`
6. `interview_sessions`
7. `career_assessments`
8. `job_applications`
9. `jobs`
10. `ai_usage_logs`
11. `ai_credits`
12. `notifications`
13. `push_subscriptions`
14. `user_api_keys`
15. `bug_reports`
16. `resignation_letters`
17. `user_preferences`
18. `resumes` (cascades to versions, shares, comments)
19. `profiles`

With FKs + CASCADE in place, we really only need to explicitly delete user-level tables (those keyed on `user_id` without a resume parent), then `resumes` (which cascades), then `profiles`.

### Technical Details

**SQL Migration:**

```text
-- FK constraints for resume children
ALTER TABLE resume_versions
  ADD CONSTRAINT fk_resume_versions_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE;

ALTER TABLE resume_shares
  ADD CONSTRAINT fk_resume_shares_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE;

ALTER TABLE share_comments
  ADD CONSTRAINT fk_share_comments_share
  FOREIGN KEY (share_id) REFERENCES resume_shares(id) ON DELETE CASCADE;

ALTER TABLE cover_letters
  ADD CONSTRAINT fk_cover_letters_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

ALTER TABLE tailor_history
  ADD CONSTRAINT fk_tailor_history_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

ALTER TABLE ai_usage_logs
  ADD CONSTRAINT fk_ai_usage_logs_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

ALTER TABLE interview_sessions
  ADD CONSTRAINT fk_interview_sessions_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

ALTER TABLE career_assessments
  ADD CONSTRAINT fk_career_assessments_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;

ALTER TABLE job_applications
  ADD CONSTRAINT fk_job_applications_resume
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL;
```

**deleteAllUserData update:**

The function will be expanded to delete from all user-owned tables. With the new FK cascades, deleting `resumes` automatically removes `resume_versions`, `resume_shares`, and `share_comments`. The remaining tables need explicit deletion.

### Storage Security Assessment

No changes needed:
- The `avatars` bucket has correct RLS: INSERT/UPDATE/DELETE scoped to `auth.uid() = folder_name`, SELECT for all authenticated users
- No PDF storage bucket exists (PDFs are generated and downloaded client-side)
- No other buckets exist

### Files Changed
- New database migration (SQL) -- FK constraints with cascading deletes
- `src/lib/dataExport.ts` (modified) -- comprehensive `deleteAllUserData` cleanup
- `src/components/settings/DeleteDataDialog.tsx` -- no changes needed (already calls `deleteAllUserData`)

