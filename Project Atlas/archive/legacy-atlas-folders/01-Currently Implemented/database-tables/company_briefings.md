# `company_briefings`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260419000000_add_company_briefings.sql`, `supabase/functions/company-briefing/`.

**Canonical owner:** `company-briefing` edge fn + `CompanyBriefingSheet` (interview surface).

---

Cache of generated company briefings (snapshot, mission, recent news, sample questions) used by the Interview Coach when a user practices for a specific company.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users(id)` ON DELETE CASCADE | |
| `company_name` | text NOT NULL | |
| `briefing` | jsonb NOT NULL | Full briefing payload (`src/types/companyBriefing.ts` shape). |
| `created_at` | timestamptz default now() | |

## Hard rules
- Briefings are per-user (no global cross-user reuse).
- TTL/refresh policy lives in the `company-briefing` edge function.
