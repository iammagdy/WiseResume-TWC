# Research Notes: Database Schema Redesign

**Decision**: Use Supabase PostgreSQL Migrations with PL/pgSQL for data transformation.
**Rationale**: Native to the project, allows atomic transformations where data is moved, verified, and old columns dropped in a single transaction.

## Profiles Table Mapping

| Current Column | Target Table | Type Change? |
|----------------|--------------|--------------|
| `full_name` | `profiles` | - |
| `avatar_url` | `profiles` | - |
| `username` | `profiles` | - |
| `bio` | `profiles` | - |
| `portfolio_theme` | `portfolio_settings` | `theme_enum` |
| `portfolio_accent_color` | `portfolio_settings` | `hex_code` constraint |
| `linkedin_url` | `social_links` | Key-Value Pair |
| `github_url` | `social_links` | Key-Value Pair |
| `views` | `user_gamification` | - |
| `last_active_at` | `user_gamification` | - |

## Resume Normalization

**Strategy**: Trigger-based synchronization.
- **Relational Tables**: Primary source of truth for EXPERIENCE, EDUCATION, SKILLS.
- **JSONB Cache**: Derived from relational tables via a `AFTER INSERT OR UPDATE OR DELETE` trigger on the child tables.
- **Benefit**: Retains high-performance frontend loads while enabling world-class data analysis.

## Soft Deletes

**Strategy**: Default filtering.
- All primary tables get `is_deleted` (BOOLEAN) and `deleted_at` (TIMESTAMPTZ).
- Update RLS policies or use a PostgreSQL View to automatically filter out deleted records from standard user sessions.

## Billing & Credits

**Decision**: Allowance + Top-up.
- `subscriptions`: Tracks the active plan and its reset cycle.
- `credit_transactions`: Permanent ledger. Monthly allowance is a "GRANT" transaction that expires. Top-ups are "PURCHASE" transactions that don't expire.
