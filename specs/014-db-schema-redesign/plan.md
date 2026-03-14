# Implementation Plan: Database Schema Redesign

**Branch**: `014-db-schema-redesign` | **Date**: 2026-03-14 | **Spec**: [spec.md](file:///m:/Repo/wiseresume-74945019/specs/014-db-schema-redesign/spec.md)
**Input**: Redesign database schema to fix 7 critical problems identified in "What Separates You from World-Class" report.

## Summary

The objective is to fix 7 critical database design flaws by migrating the monolithic 42-column `profiles` table into a normalized set of tables (`profiles`, `portfolio_settings`, `social_links`, `user_gamification`), normalizing resume data from JSONB to relational tables (while keeping a JSONB cache for frontend speed), implementing soft-deletes and strict typings, and consolidating contact forms into a generic `messages` table. The approach uses Supabase migrations with data transformation scripts to ensure zero data loss.

## Technical Context

**Language/Version**: TypeScript / Node.js (Supabase Edge Functions)  
**Primary Dependencies**: Supabase (PostgreSQL), Deno (Edge Functions)  
**Storage**: PostgreSQL (Supabase Managed)  
**Testing**: Supabase CLI (local DB migrations + test scripts)  
**Target Platform**: Supabase / The Wise Cloud  
**Project Type**: Database Schema Refresh  
**Performance Goals**: Sub-50ms query time for core profile retrieval (optimized via indexing and table splitting).  
**Constraints**: Zero data loss during migration; backward compatibility for frontend via JSONB cache.  
**Scale/Scope**: ~30-40 column reduction in main `profiles` table; 7 new tables; 1 consolidated table.  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Principle I: Separation of Concerns (Table splitting achieves this)
- [x] Principle II: Strict Typings (Enforced via ENUMs and constraints)
- [x] Principle III: Data Longevity (Soft deletes prevent accidental loss)
- [x] Principle IV: Extensibility (Social links via Key-Value and Messages table)

## Project Structure

### Documentation (this feature)

```text
specs/014-db-schema-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
supabase/
├── migrations/          # SQL migrations for schema changes and data transport
├── tests/               # SQL tests for RLS and constraints
└── seed.sql             # Updated seed data for local development

src/                     # Frontend adjustments
├── hooks/               # useProfile / useResume logic updates
└── components/          # UI updates for billing/messages visibility
```

**Structure Decision**: Option 1 - Single project. The focus is primarily on the `supabase/` directory for schema evolution, with minimal surgical updates to `src/` hooks and services.

## Phase 0: Research & Migration Strategy

1. **Mapping Current Schema**: Identify all 42 columns in `profiles` and map them to their new target tables. (Done)
2. **Migration Workflow**: Ensure data transfer happens inside the same migration transaction where columns are dropped from older tables.
3. **Trigger Logic**: Design PostgreSQL triggers to keep the `resumes` JSONB cache in sync with the new relational tables.

## Phase 1: Design & Data Modeling

1. **Entity Definition**: Create `data-model.md` with detailed table schemas, types, and constraints.
2. **Drafting Migrations**: Sequence the migrations:
   - Create new tables and ENUMs.
   - Migrate data from `profiles` and `resumes` (JSONB parsing).
   - Add triggers for cache synchronization.
   - Drop redundant columns from `profiles`.
3. **Agent Context Update**: Update the database context for future development.

## Phase 2: Implementation & Verification

1. **Local Migration Run**: Test schema changes locally via Supabase CLI.
2. **Frontend Wiring**: Adjust hooks to fetch from the new splitted tables where appropriate (or use a view for backwards compatibility).
3. **Soft Delete Verification**: Verify that deleted objects persist with `deleted_at`.
4. **Permanent Purge Job**: Create the Edge Function for GDPR "hard purge".
