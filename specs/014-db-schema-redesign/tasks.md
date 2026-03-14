# Tasks: Database Schema Redesign

**Input**: Design documents from `/specs/014-db-schema-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and migration framework setup

- [ ] T001 Verify local Supabase environment and check existing migration status
- [x] T002 [P] Create SQL test directory for database verification in `supabase/tests/`
- [x] T003 [P] Document current `profiles` schema for legacy reference in `specs/014-db-schema-redesign/legacy_schema.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and audit columns needed by all tables

- [x] T004 Create ENUM types: `career_level_enum`, `industry_enum`, `theme_enum`, `message_type_enum`, `credit_type_enum`
- [x] T005 [P] Implement `soft_delete_schema` migration adding `is_deleted` and `deleted_at` helpers
- [x] T006 Setup base RLS policy helpers for new table structures in `supabase/migrations/`

---

## Phase 3: User Story 1 - Maintain Clear Separation of Concerns (Priority: P1) 🎯 MVP

**Goal**: Split the monolithic 42-column `profiles` table into 4 focused tables.

**Independent Test**: Verify `profiles` table has <10 columns and related tables are correctly populated via user_id link.

### Implementation for User Story 1

- [x] T007 Create `portfolio_settings` table in `supabase/migrations/`
- [x] T008 Create `social_links` table (Key-Value Pair) in `supabase/migrations/`
- [x] T009 Create `user_gamification` table in `supabase/migrations/`
- [x] T010 [P] Data Migration: Transfer portfolio/social/gamification data from `profiles` to new tables via PL/pgSQL
- [x] T011 [P] Data Migration: Transform fixed social columns to KV pairs in `social_links`
- [x] T012 Drop redundant columns from `profiles` table
- [x] T013 [US1] Update `get_public_portfolio` RPC function to use new table joins in `supabase/migrations/`
- [x] T014 [US1] Update `handle_new_user` trigger to initialize new tables in `supabase/migrations/`

---

## Phase 4: User Story 2 - Normalize the Resume Data (Priority: P1)

**Goal**: Extract Resume JSONB blobs into relational tables with a synchronized cache.

**Independent Test**: Verify search on `resume_skills` table is fast and `resumes` JSONB blob stays in sync.

### Implementation for User Story 2

- [x] T015 Create `resume_experiences`, `resume_educations`, `resume_skills`, `resume_certifications` tables
- [x] T016 [P] Data Migration: Parse `experience`, `education`, `skills` JSONB blobs into new relational rows
- [x] T017 [US2] Create PostgreSQL triggers to automatically sync relational changes back to the `resumes` JSONB "cache" blob
- [ ] T018 [US2] Update resume update services to prioritize relational writes in `src/services/resumeService.ts`

---

## Phase 5: User Story 3 - Recover Data via Soft Deletes (Priority: P2)

**Goal**: Implement `deleted_at` logic across all primary entities.

**Independent Test**: Delete a resume and verify it persists in DB but disappears from standard UI views.

### Implementation for User Story 3

- [x] T019 Add `is_deleted` and `deleted_at` to `profiles`, `resumes`, `portfolios`, `messages`
- [x] T020 [P] [US3] Update all RLS policies to include `(is_deleted = false)` filter
- [x] T021 [US3] Create "Hard Purge" Edge Function for GDPR requests in `supabase/functions/hard-purge/`
- [x] T022 [US3] Schedule Cron job to hard-delete records where `deleted_at < now() - interval '30 days'`

---

## Phase 6: User Story 4 - Strict Typings (Priority: P2)

**Goal**: Enforce valid categorical data via ENUMs.

### Implementation for User Story 4

- [x] T023 Alter `profiles` to use `career_level_enum` and `industry_enum`
- [x] T024 Alter `portfolio_settings` to use `theme_enum`
- [x] T025 [P] Add CHECK constraints for URL formats in `social_links` and `profiles`

---

## Phase 7: [US5] Credits & Billing Integration (Priority: P2)

**Goal**: Implement standardized billing and AI credit ledger.

- [x] T026 Create `subscriptions` and `credit_transactions` tables
- [x] T027 [US5] Implement credit grant/deduct RPC functions in `supabase/migrations/`
- [x] T028 [US5] Update AI credit usage logic to write to `credit_transactions` in Edge Functions

---

## Phase 8: [US6] Unified Messaging Table (Priority: P2)

**Goal**: Consolidate inquiries and requests into `messages`.

- [x] T029 Create consolidated `messages` table with `type` enum
- [x] T030 Data Migration: Move all records from `contact_inquiries` and `contact_requests` to `messages`
- [x] T031 Drop `contact_inquiries` and `contact_requests` tables

---

## Phase 9: Polish & Verification

- [x] T032 [P] Add `COMMENT ON COLUMN` descriptions for ALL new and modified tables
- [ ] T033 Run integration tests to verify frontend consistency with new schema
- [x] T034 [P] Update `DECISIONS.md` with schema overhaul summary
- [x] T035 Final cleanup of any deprecated migration files

---

## Dependencies & Execution Order

- **Foundational (T004-T006)**: MUST be done before splitting tables.
- **US1 (Profiles Split)**: High priority, blocks portfolio UI updates.
- **US2 (Resume Normalization)**: High priority, blocks search feature optimization.
- **US3-US6**: Can proceed in parallel or after P1 stories are complete.

## Parallel Execution Examples

```bash
# Data Migrations for Profiles can happen in one block:
Task: "T010 [P] Data Migration: Transfer core data"
Task: "T011 [P] Data Migration: Transfrom social KV"

# Table creation for Resumes can happen in parallel:
Task: "T015 [P] Create resume child tables"
```
