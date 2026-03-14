# Feature Specification: Database Schema Redesign

**Feature Branch**: `014-db-schema-redesign`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "Redesign database schema to fix 7 critical problems identified in What Separates You from World-Class report"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Clear Separation of Concerns (Priority: P1)

As a developer or analyst, I need the `profiles` table to only house core identity attributes, so that I can query basic user information without loading a 42-column monolithic table.

**Why this priority**: Monolithic tables slow down queries, complicate ORM mapping, and cause merge conflicts on schema changes. 
**Independent Test**: Can fully test by querying `profiles` and confirming it only holds `count`, `user_id`, `full_name`, `avatar_url`, and `bio`.

**Acceptance Scenarios**:
1. **Given** a user signs up, **When** their profile is created, **Then** only their core identity is stored in `profiles`.
2. **Given** the system needs portfolio settings, **When** queried, **Then** it joins the `portfolio_settings` table rather than selecting from `profiles`.

---

### User Story 2 - Normalize the Resume Data (Priority: P1)

As a search service or recruiter, I need to find users based on specific skills or job titles, so that platform-side analytics and matching features can function natively via SQL without slow full-text JSONB scans.

**Why this priority**: Storing essential structured data like `experience` and `skills` inside JSONB blobs prevents native relational queries and breaks indexing.
**Independent Test**: Can be fully tested by running a SQL query for "all users with 'React' in their skills" and verifying it uses an index.

**Acceptance Scenarios**:
1. **Given** a generated resume, **When** saved, **Then** the skills are written as individual rows in `resume_skills` linked by `resume_id`.
2. **Given** a user edits their experience, **When** saved, **Then** `resume_experiences` is updated via foreign keys.

---

### User Story 3 - Recover Data via Soft Deletes (Priority: P2)

As a user or platform administrator, I need to be able to recover "deleted" profiles or resumes, so that accidental deletions can be reversed and historical analytics are preserved for compliance (GDPR).

**Why this priority**: Hard deletes cause permanent data loss and corrupt historical metrics.
**Independent Test**: Can test by calling the delete endpoint on a resume and verifying the record still exists in the DB with a populated `deleted_at` timestamp.

**Acceptance Scenarios**:
1. **Given** an active resume, **When** a user clicks delete, **Then** the record's `is_deleted` flag is set to true and `deleted_at` is populated.
2. **Given** a deleted resume, **When** fetched via standard queries, **Then** it does not appear (Filtered by `deleted_at IS NULL`).

---

### User Story 4 - Strict Typings to Prevent Garbage Data (Priority: P2)

As a backend engineer, I need strict constraints on columns like `industry` and `career_level`, so that users cannot insert invalid strings and cause downstream unhandled errors.

**Why this priority**: Unlimited `text` columns lead to dirty data over time. Big tech relies heavily on constrained data types and ENUMs.
**Independent Test**: Can be tested by trying to insert "banana" into the `career_level` column and verifying the database throws a constraint error.

**Acceptance Scenarios**:
1. **Given** a user updates their profile, **When** they submit a valid `career_level` (e.g., 'Senior'), **Then** the insert succeeds.
2. **Given** a malicious payload, **When** an invalid string is sent, **Then** the database rejects the transaction.

### Edge Cases

- What happens when a user requests a GDPR permanent deletion? The system must support a secondary "hard purge" workflow that overrides soft deletes for compliance.
- How does the system handle backwards compatibility during the data migration? Existing JSONB arrays must be parsed and inserted into the new normalized tables via a migration script without dataloss.

## Clarifications

### Session 2026-03-14
- Q: What should the consolidated contact table's structure and naming convention look like moving forward? → A: Option A - Generic `messages` table with `type` enum.
- Q: What should the specific mechanism be for executing the "hard purge" workflow to satisfy GDPR requirements when soft deletes are used everywhere else? → A: Option A - Edge Function / scheduled job.
- Q: How should the system handle the relationship between new relational resume tables and the existing JSONB column? → A: Option B - Hybrid Approach (Relational for search + JSONB for fast rendering).
- Q: How should AI credits be handled in relation to subscription tiers? → A: Option B - Monthly Allowance + Top-up packs.
- Q: How should the `social_links` table store multiple platforms to ensure future-proofing? → A: Option A - Key-Value Pair (platform_key, url).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST separate the `profiles` table into `profiles`, `portfolio_settings`, `social_links` (Key-Value Pair structure), and `user_gamification`.
- **FR-002**: System MUST document every column and table using PostgreSQL `COMMENT ON COLUMN` or equivalent ORM descriptions.
- **FR-003**: System MUST enforce strict types (ENUMs or constrained varchars) for categorical fields (e.g., `career_level`, `industry`, `portfolio_theme`).
- **FR-004**: System MUST implement `is_deleted` (boolean) and `deleted_at` (timestamp) columns on all primary entities (e.g., `profiles`, `resumes`, `portfolios`).
- **FR-005**: System MUST extract and normalize JSONB resume sections into discrete relational tables (`resume_experiences`, etc.) while maintaining a synchronized JSONB "cache" blob on the `resumes` table for optimized frontend rendering (Hybrid Approach).
- **FR-006**: System MUST introduce a standard `subscriptions` and `billing` schema with a `credit_transactions` table to support a Monthly Allowance (resetting cycle) + Top-up Pack (permanent) credit model.
- **FR-007**: System MUST consolidate the overlapping `contact_inquiries` and `contact_requests` tables into a single unified generic `messages` table with a `type` Enum (e.g., 'inquiry', 'request') to support future extensibility.

### Key Entities

- **[profiles]**: Core identity (name, user_id, avatar_url, bio).
- **[portfolio_settings]**: All 13 portfolio configurations linked to `user_id` (theme, accent color, meta title).
- **[social_links]**: 1-to-many relationship with `profiles` to handle extensibility natively.
- **[user_gamification]**: Streaks, view counts, and logical login activity separate from identity.
- **[resume_skills/experiences/educations]**: Normalized tables replacing the legacy JSONB blob on the `resumes` table.
- **[subscriptions]**: Tracks the user's current billing tier and Stripe/payment processor configuration alongside their `ai_credits`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tables and columns have a populated database description.
- **SC-002**: The `profiles` table is reduced to fewer than 10 columns.
- **SC-003**: A query fetching "users with specific skills" executes natively on rows rather than performing JSONB full-text scans.
- **SC-004**: Zero data loss occurs during the migration from JSONB blobs to standard relational structures.
- **SC-005**: Accidental object deletions can be recovered 100% of the time via checking the `is_deleted` column.
