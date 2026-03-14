# Data Model: Database Redesign

## Core Identity

### `profiles` (Modified)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> auth.users)
- `full_name` (TEXT)
- `avatar_url` (TEXT)
- `username` (TEXT, UNIQUE)
- `bio` (TEXT)
- `is_deleted` (BOOLEAN, DEFAULT false)
- `deleted_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Portfolio & Social

### `portfolio_settings` (NEW)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles)
- `theme` (portfolio_theme_enum)
- `accent_color` (TEXT)
- `font` (TEXT)
- `style` (TEXT)
- `layout` (TEXT)
- `sections` (JSONB)
- `enabled` (BOOLEAN)
- `resume_id` (UUID)
- `sync_mode` (TEXT)

### `social_links` (NEW)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles)
- `platform_key` (TEXT) -- e.g. 'linkedin', 'github'
- `url` (TEXT)
- `UNIQUE(user_id, platform_key)`

### `user_gamification` (NEW)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles)
- `views` (INTEGER)
- `last_active_at` (TIMESTAMPTZ)
- `login_streak` (INTEGER)

## Normalized Resume

### `resume_experiences` (NEW)
- `id` (UUID, PK)
- `resume_id` (UUID, FK -> resumes)
- `employer` (TEXT)
- `position` (TEXT)
- `start_date` (DATE)
- `end_date` (DATE)
- `description` (TEXT)

### `resume_skills` (NEW)
- `id` (UUID, PK)
- `resume_id` (UUID, FK -> resumes)
- `name` (TEXT)
- `level` (TEXT)

## Communications

### `messages` (NEW - Consolidated)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles, NULLABLE for anonymous)
- `type` (message_type_enum) -- 'inquiry', 'request', 'system'
- `content` (TEXT)
- `sender_info` (JSONB) -- email, name
- `created_at` (TIMESTAMPTZ)

## Billing

### `subscriptions` (NEW)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles)
- `plan_id` (TEXT)
- `status` (TEXT)
- `cycle_start` (TIMESTAMPTZ)
- `cycle_end` (TIMESTAMPTZ)

### `credit_transactions` (NEW)
- `id` (UUID, PK)
- `user_id` (UUID, FK -> profiles)
- `amount` (INTEGER)
- `type` (credit_type_enum) -- 'charge', 'grant', 'purchase'
- `description` (TEXT)
- `expires_at` (TIMESTAMPTZ)
