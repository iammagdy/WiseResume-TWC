# Safe Date Formatting — Crash Prevention (2026-05-09)

**Last verified:** 2026-05-09
**Type:** reference card
**Sources:**
- `src/lib/dateUtils.ts` (new exports: `safeFormatDate`, `safeFormatDistanceToNow`)
- 13 call-site files listed below

**Canonical owner:** `src/lib/dateUtils.ts`

---

**What it is:** A pair of null-safe wrappers around `date-fns` `format` and `formatDistanceToNow` that prevent `RangeError: Invalid time value` white-screen crashes when date fields from the database are `null`, `undefined`, or unparseable strings.

**Why it was needed:** Calling `format(new Date(value), ...)` or `formatDistanceToNow(new Date(value), ...)` where `value` is absent throws a `RangeError` that propagates up to the nearest React ErrorBoundary, wiping out the whole screen. With date fields that can be null during the Appwrite migration window, this was a live crash vector.

**Key facts:**

- `safeFormatDate(value, fmt, fallback?)` — delegates to `date-fns` `format`; returns `fallback` (default `'—'`) on null/undefined/invalid input.
- `safeFormatDistanceToNow(value, opts?, fallback?)` — delegates to `date-fns` `formatDistanceToNow`; same guard.
- Both accept `string | number | Date | null | undefined`. The private `toValidDate()` helper tries `parseISO`, then `new Date()`, then validates with `isValid()` before delegating.
- All callers import from `@/lib/dateUtils` — bare `date-fns` imports for `format`/`formatDistanceToNow` removed from affected files.

**Call sites patched (15 calls across 13 files):**

| File | Field(s) | Helper used |
|---|---|---|
| `src/pages/ResumeDetailPage.tsx` | `dbResume.updated_at` | `safeFormatDistanceToNow` |
| `src/pages/ApplicationsPage.tsx` | `app.applied_at`, `app.deadline` | `safeFormatDate` |
| `src/pages/ApplicationTrackerPage.tsx` | `app.applied_at`, `app.deadline` | `safeFormatDate` |
| `src/pages/JobDetailPage.tsx` | `job.posted_date` | `safeFormatDate` |
| `src/pages/AnalyticsPage.tsx` | `stats.lastUpdated` | `safeFormatDistanceToNow` |
| `src/components/dashboard/ResumeListCard.tsx` | `resume.$updatedAt \|\| resume.$createdAt` | `safeFormatDistanceToNow` |
| `src/components/cover-letter/CoverLetterCard.tsx` | `letter.created_at` | `safeFormatDistanceToNow` |
| `src/components/wisehire/pipeline/CandidateDetailPanel.tsx` | `ev.moved_at`, `candidate.created_at` | `safeFormatDistanceToNow` |
| `src/components/wisehire/outreach/OutreachHistory.tsx` | `email.created_at` | `safeFormatDistanceToNow` |
| `src/components/wisehire/notes/CandidateNotes.tsx` | `note.created_at` | `safeFormatDistanceToNow` |
| `src/components/wisehire/jd-writer/JDLibrary.tsx` | `role.updated_at` | `safeFormatDistanceToNow` |
| `src/components/wisehire/dashboard/RecentBriefs.tsx` | `brief.created_at` | `safeFormatDistanceToNow` |
| `src/components/wisehire/dashboard/RecentActivity.tsx` | `ev.moved_at` | `safeFormatDistanceToNow` |

**Related cards:** `../frontend-layer/lib.md`, `../pages/`
